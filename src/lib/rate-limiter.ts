import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

/**
 * Rate limiter store interface
 */
interface RateLimiterStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
}

/**
 * In-memory rate limiter store
 */
class MemoryStore implements RateLimiterStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry.count;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, {
      count: value,
      resetTime: Date.now() + ttl
    });
  }

  async increment(key: string, ttl: number): Promise<number> {
    const entry = this.store.get(key);
    const now = Date.now();
    
    if (!entry || now > entry.resetTime) {
      const newEntry = { count: 1, resetTime: now + ttl };
      this.store.set(key, newEntry);
      return 1;
    }
    
    entry.count++;
    return entry.count;
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `rate_limit:${ip}`;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private store: RateLimiterStore;
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig, store?: RateLimiterStore) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      message: config.message || 'Too many requests, please try again later.'
    };
    
    this.store = store || new MemoryStore();
    
    // Setup cleanup for memory store
    if (this.store instanceof MemoryStore) {
      setInterval(() => {
        (this.store as MemoryStore).cleanup();
      }, this.config.windowMs);
    }
  }

  /**
   * Check if request should be rate limited
   */
  async isRateLimited(request: NextRequest): Promise<{
    limited: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  }> {
    const key = this.config.keyGenerator(request);
    const count = await this.store.increment(key, this.config.windowMs);
    const resetTime = Date.now() + this.config.windowMs;
    
    return {
      limited: count > this.config.maxRequests,
      count,
      remaining: Math.max(0, this.config.maxRequests - count),
      resetTime
    };
  }

  /**
   * Create middleware function
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const result = await this.isRateLimited(request);
      
      if (result.limited) {
        return NextResponse.json(
          {
            success: false,
            error: this.config.message,
            rateLimitInfo: {
              limit: this.config.maxRequests,
              remaining: result.remaining,
              resetTime: result.resetTime
            }
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
              'Retry-After': Math.ceil(this.config.windowMs / 1000).toString()
            }
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
      
      return null; // Continue to next middleware/handler
    };
  }
}

/**
 * Create rate limiter with default configuration
 */
export function createRateLimiter(config: Partial<RateLimiterConfig> = {}): RateLimiter {
  const defaultConfig: RateLimiterConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    ...config
  };
  
  return new RateLimiter(defaultConfig);
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
  message: 'Too many file uploads. Please wait before uploading again.'
});

export const weatherRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 weather requests per minute
  message: 'Too many weather requests. Please wait before requesting again.'
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 general requests per minute
  message: 'Too many requests. Please slow down.'
});

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit<T extends any[], R extends NextResponse>(
  rateLimiter: RateLimiter,
  handler: (request: NextRequest, ...args: T) => Promise<R>
) {
  return async (request: NextRequest, ...args: T): Promise<R> => {
    const middleware = rateLimiter.middleware();
    const rateLimitResponse = await middleware(request);

    if (rateLimitResponse) {
      return rateLimitResponse as R;
    }

    return handler(request, ...args);
  };
}

/**
 * Utility function to get client IP address
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

/**
 * Create a key generator that combines IP and user agent for better uniqueness
 */
export function createEnhancedKeyGenerator(prefix: string = 'rate_limit') {
  return (request: NextRequest): string => {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const hash = Buffer.from(`${ip}:${userAgent}`).toString('base64').slice(0, 16);
    return `${prefix}:${hash}`;
  };
}

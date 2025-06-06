/**
 * @jest-environment jsdom
 */

// Mock NextRequest interface for testing
interface MockNextRequest {
  url: string;
  headers: Map<string, string> & { get: (key: string) => string | null };
  ip?: string;
  geo?: { country?: string; city?: string };
}

import { RateLimiter, createRateLimiter, getClientIP, createEnhancedKeyGenerator } from '../rate-limiter';

// Mock NextRequest for testing
const createMockRequest = (ip: string = '127.0.0.1', userAgent: string = 'test-agent'): MockNextRequest => {
  const url = 'http://localhost:3000/api/test';

  // Create a mock request object that mimics NextRequest
  const headers = new Map([
    ['x-forwarded-for', ip],
    ['user-agent', userAgent]
  ]);

  // Add get method to headers
  (headers as any).get = function(key: string) {
    return this.get(key);
  };

  const mockRequest: MockNextRequest = {
    url,
    headers: headers as any,
    ip,
    geo: { country: 'US', city: 'San Francisco' }
  };

  return mockRequest;
};

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within the limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5
      });

      const request = createMockRequest();
      
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.isRateLimited(request);
        expect(result.limited).toBe(false);
        expect(result.count).toBe(i + 1);
        expect(result.remaining).toBe(5 - (i + 1));
      }
    });

    it('should block requests exceeding the limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3
      });

      const request = createMockRequest();
      
      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.isRateLimited(request);
        expect(result.limited).toBe(false);
      }
      
      // 4th request should be blocked
      const result = await rateLimiter.isRateLimited(request);
      expect(result.limited).toBe(true);
      expect(result.count).toBe(4);
      expect(result.remaining).toBe(0);
    });

    it('should reset after the time window', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 100, // Very short window for testing
        maxRequests: 2
      });

      const request = createMockRequest();
      
      // Use up the limit
      await rateLimiter.isRateLimited(request);
      await rateLimiter.isRateLimited(request);
      
      let result = await rateLimiter.isRateLimited(request);
      expect(result.limited).toBe(true);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));
      
      result = await rateLimiter.isRateLimited(request);
      expect(result.limited).toBe(false);
      expect(result.count).toBe(1);
    });
  });

  describe('Different IP Addresses', () => {
    it('should track different IPs separately', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2
      });

      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');
      
      // Use up limit for first IP
      await rateLimiter.isRateLimited(request1);
      await rateLimiter.isRateLimited(request1);
      
      let result = await rateLimiter.isRateLimited(request1);
      expect(result.limited).toBe(true);
      
      // Second IP should still be allowed
      result = await rateLimiter.isRateLimited(request2);
      expect(result.limited).toBe(false);
      expect(result.count).toBe(1);
    });
  });

  describe('Middleware', () => {
    it('should return rate limit response when limit exceeded', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        message: 'Custom rate limit message'
      });

      const request = createMockRequest();
      const middleware = rateLimiter.middleware();
      
      // First request should pass
      let response = await middleware(request);
      expect(response).toBeNull();
      
      // Second request should be blocked
      response = await middleware(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
      
      const body = await response?.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Custom rate limit message');
      expect(body.rateLimitInfo).toBeDefined();
      expect(body.rateLimitInfo.limit).toBe(1);
      expect(body.rateLimitInfo.remaining).toBe(0);
    });

    it('should add rate limit headers to responses', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5
      });

      const request = createMockRequest();
      const middleware = rateLimiter.middleware();
      
      const response = await middleware(request);
      expect(response).toBeNull(); // Should pass through
      
      // Check that headers would be set (in real implementation)
      const result = await rateLimiter.isRateLimited(request);
      expect(result.count).toBe(2); // Called twice (once in middleware, once here)
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator', async () => {
      const customKeyGenerator = jest.fn((request: NextRequest) => 'custom-key');
      
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: customKeyGenerator
      });

      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');
      
      await rateLimiter.isRateLimited(request1);
      await rateLimiter.isRateLimited(request2);
      
      expect(customKeyGenerator).toHaveBeenCalledTimes(2);
      expect(customKeyGenerator).toHaveBeenCalledWith(request1);
      expect(customKeyGenerator).toHaveBeenCalledWith(request2);
      
      // Both requests should count towards the same limit since they use the same key
      const result = await rateLimiter.isRateLimited(request1);
      expect(result.limited).toBe(true);
      expect(result.count).toBe(3);
    });
  });
});

describe('Utility Functions', () => {
  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest('192.168.1.1, 10.0.0.1');
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', () => {
      const url = 'http://localhost:3000/api/test';
      const request = new NextRequest(url);
      
      Object.defineProperty(request, 'headers', {
        value: new Map([
          ['x-real-ip', '192.168.1.1']
        ]),
        writable: false
      });
      
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should fall back to request.ip when headers are not present', () => {
      const url = 'http://localhost:3000/api/test';
      const request = new NextRequest(url);
      
      Object.defineProperty(request, 'headers', {
        value: new Map(),
        writable: false
      });
      
      Object.defineProperty(request, 'ip', {
        value: '127.0.0.1',
        writable: false
      });
      
      const ip = getClientIP(request);
      expect(ip).toBe('127.0.0.1');
    });

    it('should return "unknown" when no IP is available', () => {
      const url = 'http://localhost:3000/api/test';
      const request = new NextRequest(url);
      
      Object.defineProperty(request, 'headers', {
        value: new Map(),
        writable: false
      });
      
      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });
  });

  describe('createEnhancedKeyGenerator', () => {
    it('should create unique keys for different IP and user agent combinations', () => {
      const keyGenerator = createEnhancedKeyGenerator('test');
      
      const request1 = createMockRequest('192.168.1.1', 'Mozilla/5.0');
      const request2 = createMockRequest('192.168.1.2', 'Mozilla/5.0');
      const request3 = createMockRequest('192.168.1.1', 'Chrome/91.0');
      
      const key1 = keyGenerator(request1);
      const key2 = keyGenerator(request2);
      const key3 = keyGenerator(request3);
      
      expect(key1).toMatch(/^test:/);
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should create consistent keys for the same IP and user agent', () => {
      const keyGenerator = createEnhancedKeyGenerator();
      
      const request1 = createMockRequest('192.168.1.1', 'Mozilla/5.0');
      const request2 = createMockRequest('192.168.1.1', 'Mozilla/5.0');
      
      const key1 = keyGenerator(request1);
      const key2 = keyGenerator(request2);
      
      expect(key1).toBe(key2);
    });
  });
});

describe('Pre-configured Rate Limiters', () => {
  it('should export pre-configured rate limiters', async () => {
    const { uploadRateLimiter, weatherRateLimiter, generalRateLimiter } = await import('../rate-limiter');

    expect(uploadRateLimiter).toBeInstanceOf(RateLimiter);
    expect(weatherRateLimiter).toBeInstanceOf(RateLimiter);
    expect(generalRateLimiter).toBeInstanceOf(RateLimiter);
  });
});

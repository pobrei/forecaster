import { NextRequest, NextResponse } from 'next/server';
import { generalRateLimiter, createEnhancedKeyGenerator } from '@/lib/rate-limiter';

/**
 * Next.js middleware for global rate limiting and security
 */

// Simple Edge Runtime compatible logging
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`);
};

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  // Log incoming API requests (Edge Runtime compatible)
  if (pathname.startsWith('/api/')) {
    log('info', 'API Request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });
  }

  // Skip rate limiting for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await generalRateLimiter.isRateLimited(request);
    
    if (rateLimitResult.limited) {
      const duration = Date.now() - start;
      log('warn', 'Rate Limited Request', {
        method: request.method,
        url: request.url,
        duration: `${duration}ms`,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please slow down.',
          rateLimitInfo: {
            limit: 100, // This should match generalRateLimiter config
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime
          }
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
            'Retry-After': '60'
          }
        }
      );
    }

    // Add rate limit headers to successful API responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());

    // Log successful API response
    const duration = Date.now() - start;
    log('info', 'API Response', {
      method: request.method,
      url: request.url,
      status: 200,
      duration: `${duration}ms`,
    });

    return response;
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP for enhanced security
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live", // Allow Vercel feedback script
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openweathermap.org https://vercel.live", // Allow Vercel feedback connections
    "frame-src https://vercel.live", // Allow Vercel feedback frames
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

/**
 * Example of how to use the middleware with custom rate limiting per route
 * This would be implemented in individual API route files
 */

/*
// Example usage in an API route:

import { uploadRateLimiter, withRateLimit } from '@/lib/rate-limiter';

async function uploadHandler(request: NextRequest) {
  // Your upload logic here
  return NextResponse.json({ success: true });
}

export const POST = withRateLimit(uploadRateLimiter, uploadHandler);
*/

/**
 * Advanced middleware configuration for different environments
 */
export function createEnvironmentSpecificMiddleware() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return async function environmentMiddleware(request: NextRequest) {
    const response = NextResponse.next();

    if (isDevelopment) {
      // Development-specific headers
      response.headers.set('X-Development-Mode', 'true');
      // More permissive CSP for development
      response.headers.set('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'");
    }

    if (isProduction) {
      // Production-specific security measures
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      response.headers.set('X-Production-Mode', 'true');
    }

    return response;
  };
}

/**
 * Utility function to check if request is from a bot
 */
export function isBotRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot'
  ];

  return botPatterns.some(pattern => userAgent.includes(pattern));
}

/**
 * Utility function to get client information
 */
export function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer');
  
  return {
    ip: forwarded ? forwarded.split(',')[0].trim() : realIP || 'unknown',
    userAgent: userAgent || 'unknown',
    referer: referer || 'direct',
    isBot: isBotRequest(request),
    country: 'unknown', // Geo data not available in Edge Runtime
    city: 'unknown'
  };
}

/**
 * Example of conditional middleware based on feature flags
 */
export function createFeatureFlagMiddleware(featureFlags: Record<string, boolean>) {
  return async function featureFlagMiddleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Example: Block access to certain routes if feature is disabled
    if (pathname.startsWith('/api/experimental') && !featureFlags.experimentalFeatures) {
      return NextResponse.json(
        { error: 'Feature not available' },
        { status: 404 }
      );
    }

    // Example: Redirect to maintenance page if maintenance mode is enabled
    if (featureFlags.maintenanceMode && !pathname.startsWith('/maintenance')) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    return NextResponse.next();
  };
}

# 3.2 Structured Logging & Monitoring

## Justification
Structured logging and monitoring are essential for:
- **Debugging**: Quick identification of issues in production
- **Performance**: Track API response times and bottlenecks
- **Security**: Monitor for suspicious activities and rate limiting
- **Business Intelligence**: Understand user behavior and feature usage
- **Compliance**: Maintain audit trails for data processing

## Implementation Plan

### Week 1: Logging Infrastructure
1. Install and configure Winston/Pino
2. Set up log levels and formatting
3. Implement request/response logging middleware

### Week 2: Sentry Integration
1. Set up Sentry project and configuration
2. Implement error tracking and performance monitoring
3. Configure alerts and notifications

### Week 3: Custom Metrics
1. Add business-specific logging
2. Track GPX processing metrics
3. Monitor weather API usage

## Structured Logging with Winston

### src/lib/logger.ts
```typescript
import winston from 'winston';
import { NextRequest } from 'next/server';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for structured logging
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create transports
const transports = [
  new winston.transports.Console({
    format: format,
  }),
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
});

// Request logging utility
export const logRequest = (req: NextRequest, additionalData?: Record<string, any>) => {
  logger.http('API Request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Response logging utility
export const logResponse = (
  req: NextRequest,
  status: number,
  duration: number,
  additionalData?: Record<string, any>
) => {
  logger.http('API Response', {
    method: req.method,
    url: req.url,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Business logic logging
export const logGPXProcessing = (
  fileName: string,
  pointCount: number,
  processingTime: number,
  success: boolean,
  error?: string
) => {
  logger.info('GPX Processing', {
    fileName,
    pointCount,
    processingTime: `${processingTime}ms`,
    success,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const logWeatherAPICall = (
  pointCount: number,
  responseTime: number,
  success: boolean,
  rateLimited?: boolean,
  error?: string
) => {
  logger.info('Weather API Call', {
    pointCount,
    responseTime: `${responseTime}ms`,
    success,
    rateLimited,
    error,
    timestamp: new Date().toISOString(),
  });
};
```

### src/middleware.ts (Enhanced with Logging)
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger, logRequest, logResponse } from '@/lib/logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  // Log incoming request
  logRequest(request);

  // Rate limiting logic (existing)
  const response = NextResponse.next();

  // Log response
  const duration = Date.now() - start;
  logResponse(request, response.status, duration);

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

## Sentry Integration

### src/lib/sentry.ts
```typescript
import * as Sentry from '@sentry/nextjs';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.vercel\.app/],
      }),
    ],
  });
};

// Custom error tracking
export const trackError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

// Performance tracking
export const trackPerformance = (name: string, duration: number, tags?: Record<string, string>) => {
  Sentry.addBreadcrumb({
    message: `Performance: ${name}`,
    level: 'info',
    data: {
      duration: `${duration}ms`,
      ...tags,
    },
  });
};

// Business metrics tracking
export const trackGPXUpload = (fileSize: number, pointCount: number, processingTime: number) => {
  Sentry.addBreadcrumb({
    message: 'GPX File Uploaded',
    level: 'info',
    data: {
      fileSize: `${fileSize} bytes`,
      pointCount,
      processingTime: `${processingTime}ms`,
    },
  });
};

export const trackWeatherRequest = (pointCount: number, responseTime: number, cached: boolean) => {
  Sentry.addBreadcrumb({
    message: 'Weather Data Requested',
    level: 'info',
    data: {
      pointCount,
      responseTime: `${responseTime}ms`,
      cached,
    },
  });
};
```

### sentry.client.config.ts
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

### sentry.server.config.ts
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
});
```

## Enhanced API Route with Logging

### src/app/api/weather/route.ts (Enhanced)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger, logWeatherAPICall } from '@/lib/logger';
import { trackError, trackWeatherRequest } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  const start = Date.now();
  
  try {
    const { points } = await request.json();
    
    logger.info('Weather request started', {
      pointCount: points.length,
      timestamp: new Date().toISOString(),
    });

    // Process weather data...
    const forecasts = await processWeatherData(points);
    
    const duration = Date.now() - start;
    
    // Log successful request
    logWeatherAPICall(points.length, duration, true);
    trackWeatherRequest(points.length, duration, false);
    
    logger.info('Weather request completed', {
      pointCount: points.length,
      duration: `${duration}ms`,
      forecastCount: forecasts.length,
    });

    return NextResponse.json({ forecasts });
    
  } catch (error) {
    const duration = Date.now() - start;
    
    // Log error
    logger.error('Weather request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Track error in Sentry
    trackError(error as Error, {
      endpoint: '/api/weather',
      duration,
    });
    
    logWeatherAPICall(0, duration, false, false, error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
```

## Environment Configuration

### .env.local (Example)
```bash
# Logging
LOG_LEVEL=info

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-public-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=forecaster
SENTRY_AUTH_TOKEN=your-auth-token

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true
```

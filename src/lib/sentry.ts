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

export const trackPDFExport = (routePoints: number, fileSize: number, processingTime: number) => {
  Sentry.addBreadcrumb({
    message: 'PDF Export Generated',
    level: 'info',
    data: {
      routePoints,
      fileSize: `${fileSize} bytes`,
      processingTime: `${processingTime}ms`,
    },
  });
};

export const trackUserAction = (action: string, properties?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message: `User Action: ${action}`,
    level: 'info',
    data: properties,
  });
};

// Set user context
export const setUserContext = (userId: string, email?: string, username?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

// Set custom tags
export const setCustomTags = (tags: Record<string, string>) => {
  Sentry.withScope((scope) => {
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  });
};

// Measure transaction performance
export const measureTransaction = async <T>(
  name: string,
  operation: string,
  callback: () => Promise<T>
): Promise<T> => {
  const transaction = Sentry.startTransaction({
    name,
    op: operation,
  });

  try {
    const result = await callback();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};

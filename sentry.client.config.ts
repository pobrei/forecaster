import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    // Replay integration - conditionally add if available
    ...(typeof Sentry.replayIntegration === 'function'
      ? [Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        })]
      : []
    ),
  ],
});

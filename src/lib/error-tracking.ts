import * as Sentry from '@sentry/nextjs'
import { env } from './env'

// Initialize Sentry
export function initErrorTracking() {
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: env.NODE_ENV === 'development',
      beforeSend(event) {
        // Filter out development errors
        if (env.NODE_ENV === 'development') {
          return null
        }
        return event
      },
    })
  }
}

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  API = 'api',
  NETWORK = 'network',
  FILE_UPLOAD = 'file_upload',
  WEATHER_SERVICE = 'weather_service',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Custom error classes
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly severity: ErrorSeverity
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.severity = severity
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.LOW, 400, true, context)
    this.name = 'ValidationError'
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500, context?: Record<string, any>) {
    super(message, ErrorType.API, ErrorSeverity.MEDIUM, statusCode, true, context)
    this.name = 'APIError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.NETWORK, ErrorSeverity.MEDIUM, 503, true, context)
    this.name = 'NetworkError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.DATABASE, ErrorSeverity.HIGH, 500, true, context)
    this.name = 'DatabaseError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, ErrorType.RATE_LIMIT, ErrorSeverity.LOW, 429, true, context)
    this.name = 'RateLimitError'
  }
}

// Error logging functions
export function logError(error: Error, context?: Record<string, any>) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    ...context,
  }

  if (error instanceof AppError) {
    (errorInfo as any).type = error.type
    ;(errorInfo as any).severity = error.severity
    ;(errorInfo as any).statusCode = error.statusCode
    ;(errorInfo as any).context = error.context
  }

  // Log to console in development
  if (env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo)
  }

  // Send to Sentry in production
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context)
      }
      if (error instanceof AppError) {
        scope.setTag('errorType', error.type)
        scope.setLevel(getSentryLevel(error.severity))
      }
      Sentry.captureException(error)
    })
  }
}

export function logWarning(message: string, context?: Record<string, any>) {
  const warningInfo = {
    message,
    level: 'warning',
    timestamp: new Date().toISOString(),
    ...context,
  }

  if (env.NODE_ENV === 'development') {
    console.warn('Warning logged:', warningInfo)
  }

  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context)
      }
      scope.setLevel('warning')
      Sentry.captureMessage(message)
    })
  }
}

export function logInfo(message: string, context?: Record<string, any>) {
  const infoLog = {
    message,
    level: 'info',
    timestamp: new Date().toISOString(),
    ...context,
  }

  if (env.NODE_ENV === 'development') {
    console.info('Info logged:', infoLog)
  }

  // Only log important info messages to Sentry
  if (env.SENTRY_DSN && context?.important) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context)
      }
      scope.setLevel('info')
      Sentry.captureMessage(message)
    })
  }
}

// Helper functions
function getSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'info'
    case ErrorSeverity.MEDIUM:
      return 'warning'
    case ErrorSeverity.HIGH:
      return 'error'
    case ErrorSeverity.CRITICAL:
      return 'fatal'
    default:
      return 'error'
  }
}

// Error boundary helper
export function handleError(error: unknown, context?: Record<string, any>): AppError {
  if (error instanceof AppError) {
    logError(error, context)
    return error
  }

  if (error instanceof Error) {
    const appError = new AppError(
      error.message,
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      500,
      true,
      context
    )
    logError(appError, context)
    return appError
  }

  const unknownError = new AppError(
    'An unknown error occurred',
    ErrorType.UNKNOWN,
    ErrorSeverity.MEDIUM,
    500,
    false,
    { originalError: error, ...context }
  )
  logError(unknownError, context)
  return unknownError
}

// Performance monitoring
export function trackPerformance(name: string, duration: number, context?: Record<string, any>) {
  if (env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: `Performance: ${name}`,
      level: 'info',
      data: {
        duration,
        ...context,
      },
    })
  }

  if (env.NODE_ENV === 'development') {
    console.log(`Performance: ${name} took ${duration}ms`, context)
  }
}

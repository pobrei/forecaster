import { NextRequest, NextResponse } from 'next/server';
import {
  AppError,
  ValidationError,
  APIError,
  NetworkError,
  DatabaseError,
  RateLimitError,
  logError
} from '@/lib/error-tracking';
import { APIResponse } from '@/types';

export interface ErrorContext {
  endpoint: string;
  method: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export function createErrorHandler<T>(
  handler: (request: NextRequest) => Promise<NextResponse<APIResponse<T>>>
) {
  return async (request: NextRequest): Promise<NextResponse<APIResponse<T | null>>> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    const context: ErrorContext = {
      endpoint: request.nextUrl.pathname,
      method: request.method,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      requestId
    };

    try {
      // Add request ID to headers for tracing
      const response = await handler(request);
      response.headers.set('x-request-id', requestId);
      
      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${context.method} ${context.endpoint} - ${Date.now() - startTime}ms`);
      }
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle different error types
      let handledError: AppError;
      
      if (error instanceof AppError) {
        handledError = error;
      } else if (error instanceof Error) {
        // Map common error patterns to specific error types
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          handledError = new RateLimitError(error.message, context);
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          handledError = new NetworkError(error.message, context);
        } else if (error.message.includes('database') || error.message.includes('mongodb')) {
          handledError = new DatabaseError(error.message, context);
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          handledError = new ValidationError(error.message, context);
        } else {
          handledError = new APIError(error.message, 500, context);
        }
      } else {
        handledError = new APIError('An unknown error occurred', 500, { 
          ...context, 
          originalError: String(error) 
        });
      }

      // Log the error with context
      logError(handledError, { 
        ...context, 
        duration,
        stack: handledError.stack 
      });

      // Return structured error response
      const response = NextResponse.json<APIResponse<null>>({
        success: false,
        error: handledError.message,
        timestamp: new Date()
      }, { 
        status: handledError.statusCode,
        headers: {
          'x-request-id': requestId,
          'x-error-type': handledError.type,
          'x-error-severity': handledError.severity
        }
      });

      return response;
    }
  };
}

// Async operation wrapper with timeout and retry
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeout?: number;
    retryDelay?: number;
    retryCondition?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    timeout = 30000, // 30 seconds
    retryDelay = 1000,
    retryCondition = (error) => !error.message.includes('validation')
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
      });

      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt or if retry condition fails
      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError!;
}

// Helper to extract client IP
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

// Helper to validate request size
export function validateRequestSize(request: NextRequest, maxSize: number = 10 * 1024 * 1024): void {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new ValidationError(`Request too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
  }
}

// Helper to check rate limiting
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function checkRateLimit(_ip: string, _endpoint: string): boolean {
  // This is a simple in-memory rate limiter
  // In production, you'd want to use Redis or similar

  // This would be implemented with a proper rate limiting solution
  // For now, just return true (no rate limiting)
  return true;
}

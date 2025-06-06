import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ValidationError, handleError } from '@/lib/error-tracking';
import { APIResponse } from '@/types';

export function createValidationMiddleware<T, R>(schema: z.ZodSchema<T>) {
  return async (
    request: NextRequest,
    handler: (validatedData: T, request: NextRequest) => Promise<NextResponse<APIResponse<R>>>
  ): Promise<NextResponse<APIResponse<R | null>>> => {
    try {
      let rawData: unknown;
      
      // Handle different content types
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        rawData = await request.json();
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        rawData = Object.fromEntries(formData.entries());
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        rawData = Object.fromEntries(formData.entries());
      } else {
        throw new ValidationError('Unsupported content type');
      }

      // Validate the data
      const validatedData = schema.parse(rawData);
      
      // Call the handler with validated data
      return await handler(validatedData, request);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined
        }));

        // Log detailed validation errors for debugging
        console.error('Validation failed with errors:', JSON.stringify(validationErrors, null, 2));

        const validationError = new ValidationError(
          `Validation failed: ${validationErrors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
          { errors: validationErrors }
        );

        const handledError = handleError(validationError);

        return NextResponse.json<APIResponse<null>>({
          success: false,
          error: handledError.message,
          timestamp: new Date()
        }, { status: handledError.statusCode });
      }
      
      const handledError = handleError(error);
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: handledError.message,
        timestamp: new Date()
      }, { status: handledError.statusCode });
    }
  };
}

// Rate limiting validation
export const rateLimitSchema = z.object({
  ip: z.string().ip(),
  userAgent: z.string().max(500).optional(),
  endpoint: z.string().max(100)
});

// Request metadata validation
export const requestMetadataSchema = z.object({
  timestamp: z.date(),
  ip: z.string().ip(),
  userAgent: z.string().max(500).optional(),
  referer: z.string().url().optional()
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): T => {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new ValidationError(`Validation failed: ${errorMessages}`);
      }
      throw error;
    }
  };
}

// Transform and validate date strings
export function transformDateInput(input: unknown): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    return date;
  }
  throw new ValidationError('Date input must be a string or Date object');
}

// Transform and validate numeric input
export function transformNumericInput(input: unknown): number {
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    const num = parseFloat(input);
    if (isNaN(num)) {
      throw new ValidationError('Invalid numeric input');
    }
    return num;
  }
  throw new ValidationError('Numeric input must be a string or number');
}

// Sanitize string input
export function sanitizeStringInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}



// Validate file upload
export function validateFileUpload(file: unknown): File {
  if (!(file instanceof File)) {
    throw new ValidationError('Invalid file upload');
  }

  if (file.size === 0) {
    throw new ValidationError('File cannot be empty');
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new ValidationError('File too large');
  }

  return file;
}

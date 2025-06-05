import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { sanitizeInput } from './security'

// Enhanced input validation schemas
export const stringInputSchema = z.string()
  .min(1, 'Input cannot be empty')
  .max(1000, 'Input too long')
  .transform(sanitizeInput)

export const emailSchema = z.string()
  .email('Invalid email format')
  .transform(sanitizeInput)

export const urlSchema = z.string()
  .url('Invalid URL format')
  .transform(sanitizeInput)

export const numberInputSchema = z.union([
  z.number(),
  z.string().transform((val) => {
    const num = parseFloat(val)
    if (isNaN(num)) throw new Error('Invalid number')
    return num
  })
])

export const booleanInputSchema = z.union([
  z.boolean(),
  z.string().transform((val) => {
    if (val === 'true' || val === '1') return true
    if (val === 'false' || val === '0') return false
    throw new Error('Invalid boolean value')
  })
])

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().min(1, 'Filename is required'),
  size: z.number().positive('File size must be positive'),
  type: z.string().min(1, 'File type is required'),
})

// GPX content validation
export const gpxContentSchema = z.string()
  .min(1, 'GPX content cannot be empty')
  .refine((content) => {
    // Basic XML structure validation
    return content.includes('<gpx') && content.includes('</gpx>')
  }, 'Invalid GPX file structure')
  .refine((content) => {
    // Check for potential XXE attacks
    const dangerousPatterns = [
      /<!ENTITY/i,
      /<!DOCTYPE.*\[/i,
      /SYSTEM\s+["']/i,
      /PUBLIC\s+["']/i,
    ]
    return !dangerousPatterns.some(pattern => pattern.test(content))
  }, 'GPX file contains potentially dangerous content')

// Coordinate validation
export const coordinateInputSchema = z.object({
  lat: numberInputSchema.refine(
    (val) => val >= -90 && val <= 90,
    'Latitude must be between -90 and 90'
  ),
  lon: numberInputSchema.refine(
    (val) => val >= -180 && val <= 180,
    'Longitude must be between -180 and 180'
  ),
})

// Settings validation
export const settingsInputSchema = z.object({
  startTime: z.union([
    z.date(),
    z.string().transform((val) => {
      const date = new Date(val)
      if (isNaN(date.getTime())) throw new Error('Invalid date')
      return date
    })
  ]),
  averageSpeed: numberInputSchema.refine(
    (val) => val > 0 && val <= 200,
    'Speed must be between 0 and 200 km/h'
  ),
  forecastInterval: numberInputSchema.refine(
    (val) => val > 0 && val <= 100,
    'Interval must be between 0 and 100 km'
  ),
  units: z.enum(['metric', 'imperial']),
  timezone: stringInputSchema,
})

// HTML content sanitization
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: basic sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }
  
  // Client-side: use DOMPurify
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
  })
}

// SQL injection prevention (for future database queries)
export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
}

// Path traversal prevention
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/^\/+/, '') // Remove leading slashes
    .trim()
}

// Validation middleware for API routes
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): T => {
    try {
      return schema.parse(input)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        throw new Error(`Validation failed: ${errorMessages}`)
      }
      throw error
    }
  }
}

// Rate limiting validation
export const rateLimitSchema = z.object({
  identifier: stringInputSchema,
  maxRequests: numberInputSchema.default(60),
  windowMs: numberInputSchema.default(60000),
})

// Export validation functions
export const validateString = validateInput(stringInputSchema)
export const validateEmail = validateInput(emailSchema)
export const validateUrl = validateInput(urlSchema)
export const validateNumber = validateInput(numberInputSchema)
export const validateBoolean = validateInput(booleanInputSchema)
export const validateCoordinate = validateInput(coordinateInputSchema)
export const validateSettings = validateInput(settingsInputSchema)
export const validateFileUpload = validateInput(fileUploadSchema)
export const validateGpxContent = validateInput(gpxContentSchema)

// Batch validation for arrays
export function validateArray<T>(schema: z.ZodSchema<T>, maxLength: number = 1000) {
  return validateInput(z.array(schema).max(maxLength, `Array too long (max ${maxLength})`))
}

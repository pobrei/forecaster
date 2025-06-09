import { z } from 'zod'
import { GPX_CONSTRAINTS, ROUTE_CONFIG } from './constants'

// Base schemas
export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
})

export const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  elevation: z.number().optional(),
  distance: z.number().min(0),
  estimatedTime: z.date().optional(),
})

export const routeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  points: z.array(routePointSchema).min(2).max(GPX_CONSTRAINTS.MAX_WAYPOINTS),
  totalDistance: z.number().min(0),
  totalElevationGain: z.number().min(0),
  estimatedDuration: z.number().min(0),
  createdAt: z.date(),
})

export const weatherDataSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number().min(0).max(100),
  pressure: z.number().min(0),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  visibility: z.number().min(0),
  uvIndex: z.number().min(0),
  cloudCover: z.number().min(0).max(100),
  precipitation: z.number().min(0),
  precipitationProbability: z.number().min(0).max(100),
  weatherCondition: z.string(),
  weatherDescription: z.string(),
  icon: z.string(),
  timestamp: z.date(),
})

export const weatherAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['wind', 'temperature', 'precipitation', 'visibility']),
  severity: z.enum(['low', 'medium', 'high']),
  message: z.string(),
  threshold: z.number(),
  actualValue: z.number(),
})

export const weatherForecastSchema = z.object({
  routePoint: routePointSchema,
  weather: weatherDataSchema,
  alerts: z.array(weatherAlertSchema).optional(),
})

export const appSettingsSchema = z.object({
  startTime: z.date(),
  averageSpeed: z.number().min(ROUTE_CONFIG.MIN_SPEED).max(ROUTE_CONFIG.MAX_SPEED),
  forecastInterval: z.number().min(ROUTE_CONFIG.MIN_INTERVAL).max(ROUTE_CONFIG.MAX_INTERVAL),
  units: z.enum(['metric', 'imperial']),
  timezone: z.string(),
})

// Enhanced file validation with security checks - iOS Safari compatible
export const secureFileValidationSchema = z.object({
  name: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._\s-]+\.gpx$/i, 'Invalid filename format - must be a .gpx file')
    .refine((name) => !name.includes('..'), 'Filename contains invalid characters'),
  size: z.number()
    .positive('File size must be positive')
    .max(GPX_CONSTRAINTS.MAX_FILE_SIZE, `File too large (max ${GPX_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB)`),
  type: z.string()
    // More lenient MIME type validation for iOS Safari compatibility
    .refine((type) => {
      // Allow empty MIME type (common on iOS Safari)
      if (type === '') return true;
      // Check against known MIME types
      return GPX_CONSTRAINTS.MIME_TYPES.includes(type as any);
    }, 'Invalid file type - please select a GPX file'),
  lastModified: z.number().optional()
})

// GPX content validation with security checks
export const gpxContentValidationSchema = z.string()
  .min(1, 'GPX content cannot be empty')
  .max(200 * 1024 * 1024, 'GPX content too large') // 200MB text limit (increased for large GPX files)
  .refine((content) => {
    // Check for basic GPX structure
    return content.includes('<gpx') && content.includes('</gpx>');
  }, 'Invalid GPX file structure')
  .refine((content) => {
    // Security: Check for XML External Entity (XXE) attacks
    const dangerousPatterns = [
      /<!ENTITY/i,
      /<!DOCTYPE.*\[/i,
      /SYSTEM\s+["']/i,
      /PUBLIC\s+["']/i,
      /%[a-zA-Z0-9_]+;/
    ];
    return !dangerousPatterns.some(pattern => pattern.test(content));
  }, 'GPX file contains potentially dangerous content')
  .refine((content) => {
    // Check for reasonable XML size (prevent billion laughs attack)
    const entityCount = (content.match(/&[a-zA-Z0-9_]+;/g) || []).length;
    return entityCount < 100;
  }, 'GPX file contains too many entities')

// Weather request validation with comprehensive checks and preprocessing
export const weatherRequestValidationSchema = z.preprocess(
  (data: any) => {
    // Transform the data before validation
    if (!data || typeof data !== 'object') return data;

    const transformed = { ...data };

    // Transform route.createdAt (add default if missing)
    if (transformed.route) {
      if (transformed.route.createdAt) {
        transformed.route.createdAt = new Date(transformed.route.createdAt);
      } else {
        transformed.route.createdAt = new Date();
      }

      // Transform route points estimatedTime
      if (transformed.route.points) {
        transformed.route.points = transformed.route.points.map((point: any) => ({
          ...point,
          estimatedTime: point.estimatedTime ? new Date(point.estimatedTime) : undefined
        }));
      }
    }

    // Transform settings.startTime
    if (transformed.settings?.startTime) {
      transformed.settings.startTime = new Date(transformed.settings.startTime);
    }

    return transformed;
  },
  z.object({
    route: z.object({
      id: z.string().min(1).max(100),
      name: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      points: z.array(z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        elevation: z.number().min(-1000).max(10000).optional(), // Reasonable elevation range
        distance: z.number().min(0).max(50000), // Max 50,000km
        estimatedTime: z.date().optional()
      })).min(2).max(GPX_CONSTRAINTS.MAX_WAYPOINTS),
      totalDistance: z.number().min(0).max(50000),
      totalElevationGain: z.number().min(0).max(20000), // Max 20km elevation gain
      estimatedDuration: z.number().min(0).max(24 * 60 * 60 * 1000), // Max 24 hours
      createdAt: z.date()
    }),
    settings: z.object({
      startTime: z.date()
        .refine((date) => date >= new Date(Date.now() - 24 * 60 * 60 * 1000),
          'Start time cannot be more than 24 hours in the past')
        .refine((date) => date <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          'Start time cannot be more than 7 days in the future')
        .optional(),
      averageSpeed: z.number().min(ROUTE_CONFIG.MIN_SPEED).max(ROUTE_CONFIG.MAX_SPEED).optional(),
      forecastInterval: z.number().min(ROUTE_CONFIG.MIN_INTERVAL).max(ROUTE_CONFIG.MAX_INTERVAL).optional(),
      units: z.enum(['metric', 'imperial']).optional(),
      timezone: z.string().min(1).max(50)
        .refine((tz) => {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        }, 'Invalid timezone')
        .optional()
    }).optional()
  })
)

// API request/response schemas
export const uploadRequestSchema = z.object({
  file: z.instanceof(File),
})

export const weatherRequestSchema = z.object({
  route: routeSchema,
  settings: appSettingsSchema,
})

export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  timestamp: z.date().optional(),
})

// File validation schemas
export const fileValidationSchema = z.object({
  name: z.string().regex(/\.gpx$/i, 'File must have .gpx extension'),
  size: z.number().max(GPX_CONSTRAINTS.MAX_FILE_SIZE, `File size must be less than ${GPX_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`),
  type: z.string().refine(
    (type) => GPX_CONSTRAINTS.MIME_TYPES.includes(type as typeof GPX_CONSTRAINTS.MIME_TYPES[number]),
    'Invalid file type'
  ),
})

// Validation helper functions
export function validateRoute(data: unknown): data is z.infer<typeof routeSchema> {
  try {
    routeSchema.parse(data)
    return true
  } catch {
    return false
  }
}

export function validateWeatherData(data: unknown): data is z.infer<typeof weatherDataSchema> {
  try {
    weatherDataSchema.parse(data)
    return true
  } catch {
    return false
  }
}

export function validateAppSettings(data: unknown): data is z.infer<typeof appSettingsSchema> {
  try {
    appSettingsSchema.parse(data)
    return true
  } catch {
    return false
  }
}

export function validateFile(file: File): { valid: boolean; errors: string[] } {
  try {
    fileValidationSchema.parse(file)
    return { valid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => err.message)
      }
    }
    return { valid: false, errors: ['Unknown validation error'] }
  }
}

// Type exports
export type Route = z.infer<typeof routeSchema>
export type RoutePoint = z.infer<typeof routePointSchema>
export type WeatherData = z.infer<typeof weatherDataSchema>
export type WeatherAlert = z.infer<typeof weatherAlertSchema>
export type WeatherForecast = z.infer<typeof weatherForecastSchema>
export type AppSettings = z.infer<typeof appSettingsSchema>
export type APIResponse<T> = z.infer<ReturnType<typeof apiResponseSchema<T>>>

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

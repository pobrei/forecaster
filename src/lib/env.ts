import { z } from 'zod'

// Environment variable schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  
  // Weather API
  OPENWEATHER_API_KEY: z.string().min(1, 'OpenWeather API key is required'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Forecaster'),
  
  // Security
  NEXTAUTH_SECRET: z.string().min(1, 'NextAuth secret is required'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  CONTENT_SECURITY_POLICY_ENABLED: z.string().transform(val => val === 'true').default('false'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('60'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('60000'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'),
  MAX_WAYPOINTS: z.string().transform(Number).default('2000'),
  
  // Cache
  CACHE_DURATION: z.string().transform(Number).default('3600000'),
  REDIS_URL: z.string().optional(),
  
  // Monitoring (Optional)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  
  // Debug
  DEBUG: z.string().transform(val => val === 'true').default('false'),
})

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(`Environment validation failed:\n${missingVars}`)
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type for environment variables
export type Env = z.infer<typeof envSchema>

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'

// Helper to get app URL
export const getAppUrl = () => env.NEXT_PUBLIC_APP_URL

// Helper to check if feature is enabled
export const isFeatureEnabled = (feature: string): boolean => {
  const envVar = process.env[`FEATURE_${feature.toUpperCase()}`]
  return envVar === 'true'
}

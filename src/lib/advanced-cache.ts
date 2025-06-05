import Redis from 'ioredis'
import { env } from './env'
import { logError, logInfo } from './error-tracking'

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 60 * 60, // 1 hour in seconds
  WEATHER_TTL: 30 * 60, // 30 minutes for weather data
  ROUTE_TTL: 24 * 60 * 60, // 24 hours for route data
  SESSION_TTL: 60 * 60, // 1 hour for session data
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
}

// Cache key prefixes
const CACHE_KEYS = {
  WEATHER: 'weather:',
  ROUTE: 'route:',
  SESSION: 'session:',
  RATE_LIMIT: 'rate_limit:',
  ANALYTICS: 'analytics:',
} as const

// Redis client setup
let redisClient: Redis | null = null

function createRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    logInfo('Redis URL not configured, using in-memory cache fallback')
    return null
  }

  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: CACHE_CONFIG.MAX_RETRIES,
      lazyConnect: true,
      keepAlive: 30000,
    })

    client.on('error', (error) => {
      logError(error, { context: 'Redis connection error' })
    })

    client.on('connect', () => {
      logInfo('Redis connected successfully')
    })

    return client
  } catch (error) {
    logError(error as Error, { context: 'Failed to create Redis client' })
    return null
  }
}

// Initialize Redis client
export function initializeCache() {
  redisClient = createRedisClient()
}

// In-memory fallback cache
const memoryCache = new Map<string, { value: any; expires: number }>()

// Cache interface
export interface CacheInterface {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  expire(key: string, ttl: number): Promise<void>
  keys(pattern: string): Promise<string[]>
  flushPattern(pattern: string): Promise<void>
}

// Redis implementation
class RedisCache implements CacheInterface {
  constructor(private client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logError(error as Error, { context: 'Redis get error', key })
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logError(error as Error, { context: 'Redis set error', key })
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      logError(error as Error, { context: 'Redis del error', key })
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logError(error as Error, { context: 'Redis exists error', key })
      return false
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl)
    } catch (error) {
      logError(error as Error, { context: 'Redis expire error', key })
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern)
    } catch (error) {
      logError(error as Error, { context: 'Redis keys error', pattern })
      return []
    }
  }

  async flushPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
    } catch (error) {
      logError(error as Error, { context: 'Redis flush pattern error', pattern })
    }
  }
}

// Memory cache implementation
class MemoryCache implements CacheInterface {
  async get<T>(key: string): Promise<T | null> {
    const item = memoryCache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      memoryCache.delete(key)
      return null
    }
    
    return item.value
  }

  async set<T>(key: string, value: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    const expires = Date.now() + (ttl * 1000)
    memoryCache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    memoryCache.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const item = memoryCache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expires) {
      memoryCache.delete(key)
      return false
    }
    
    return true
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = memoryCache.get(key)
    if (item) {
      item.expires = Date.now() + (ttl * 1000)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(memoryCache.keys()).filter(key => regex.test(key))
  }

  async flushPattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern)
    keys.forEach(key => memoryCache.delete(key))
  }
}

// Get cache instance
export function getCache(): CacheInterface {
  if (redisClient) {
    return new RedisCache(redisClient)
  }
  return new MemoryCache()
}

// High-level cache functions
export async function cacheWeatherData(
  coordinates: { lat: number; lon: number },
  data: any,
  ttl: number = CACHE_CONFIG.WEATHER_TTL
): Promise<void> {
  const key = `${CACHE_KEYS.WEATHER}${coordinates.lat},${coordinates.lon}`
  const cache = getCache()
  await cache.set(key, { data, timestamp: Date.now() }, ttl)
}

export async function getCachedWeatherData(
  coordinates: { lat: number; lon: number }
): Promise<any | null> {
  const key = `${CACHE_KEYS.WEATHER}${coordinates.lat},${coordinates.lon}`
  const cache = getCache()
  const cached = await cache.get<{ data: any; timestamp: number }>(key)
  
  if (cached) {
    logInfo('Weather cache hit', { coordinates })
    return cached.data
  }
  
  return null
}

export async function cacheRouteData(
  routeHash: string,
  data: any,
  ttl: number = CACHE_CONFIG.ROUTE_TTL
): Promise<void> {
  const key = `${CACHE_KEYS.ROUTE}${routeHash}`
  const cache = getCache()
  await cache.set(key, { data, timestamp: Date.now() }, ttl)
}

export async function getCachedRouteData(routeHash: string): Promise<any | null> {
  const key = `${CACHE_KEYS.ROUTE}${routeHash}`
  const cache = getCache()
  const cached = await cache.get<{ data: any; timestamp: number }>(key)
  
  if (cached) {
    logInfo('Route cache hit', { routeHash })
    return cached.data
  }
  
  return null
}

// Cache statistics
export async function getCacheStats(): Promise<{
  weatherCacheSize: number
  routeCacheSize: number
  totalKeys: number
}> {
  const cache = getCache()
  
  const [weatherKeys, routeKeys, allKeys] = await Promise.all([
    cache.keys(`${CACHE_KEYS.WEATHER}*`),
    cache.keys(`${CACHE_KEYS.ROUTE}*`),
    cache.keys('*'),
  ])
  
  return {
    weatherCacheSize: weatherKeys.length,
    routeCacheSize: routeKeys.length,
    totalKeys: allKeys.length,
  }
}

// Cache cleanup
export async function cleanupExpiredCache(): Promise<void> {
  if (redisClient) {
    // Redis handles expiration automatically
    return
  }
  
  // Manual cleanup for memory cache
  const now = Date.now()
  for (const [key, item] of memoryCache.entries()) {
    if (now > item.expires) {
      memoryCache.delete(key)
    }
  }
}

// Periodic cleanup for memory cache
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000) // Every 5 minutes
}

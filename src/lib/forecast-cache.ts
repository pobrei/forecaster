import { WeatherForecast, Route, AppSettings } from '@/types';
import { connectToDatabase } from './mongodb';
import crypto from 'crypto';

// Forecast cache interface
interface CachedForecast {
  _id?: string;
  cacheKey: string;
  route: Route;
  settings: AppSettings;
  forecasts: WeatherForecast[];
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Generate cache key for forecast data
 */
function generateForecastCacheKey(route: Route, settings: AppSettings): string {
  const keyData = {
    routeId: route.id,
    routeHash: crypto.createHash('md5').update(JSON.stringify(route.points)).digest('hex').substring(0, 8),
    startTime: settings.startTime.toISOString(),
    averageSpeed: settings.averageSpeed,
    forecastInterval: settings.forecastInterval,
    units: settings.units,
  };
  
  return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

/**
 * Get cached forecast data
 */
export async function getCachedForecast(
  route: Route, 
  settings: AppSettings,
  maxAge: number = 30 * 60 * 1000 // 30 minutes default
): Promise<WeatherForecast[] | null> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<CachedForecast>('forecast_cache');
    
    const cacheKey = generateForecastCacheKey(route, settings);
    const cutoff = new Date(Date.now() - maxAge);
    
    const cached = await collection.findOne({
      cacheKey,
      createdAt: { $gte: cutoff }
    });
    
    if (cached) {
      // Update access statistics
      await collection.updateOne(
        { _id: cached._id },
        { 
          $inc: { accessCount: 1 },
          $set: { lastAccessed: new Date() }
        }
      );
      
      console.log(`Forecast cache hit for route: ${route.name}`);
      return cached.forecasts;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching cached forecast:', error);
    return null;
  }
}

/**
 * Cache forecast data
 */
export async function setCachedForecast(
  route: Route,
  settings: AppSettings,
  forecasts: WeatherForecast[],
  ttl: number = 60 * 60 * 1000 // 1 hour default
): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<CachedForecast>('forecast_cache');
    
    const cacheKey = generateForecastCacheKey(route, settings);
    const now = new Date();
    
    const cacheData: Omit<CachedForecast, '_id'> = {
      cacheKey,
      route,
      settings,
      forecasts,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      accessCount: 0,
      lastAccessed: now,
    };
    
    // Use upsert to replace existing cache entry
    await collection.replaceOne(
      { cacheKey },
      cacheData,
      { upsert: true }
    );
    
    console.log(`Forecast cached for route: ${route.name}`);
  } catch (error) {
    console.error('Error caching forecast:', error);
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Clean up expired forecast cache entries
 */
export async function cleanupForecastCache(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<CachedForecast>('forecast_cache');
    
    const now = new Date();
    
    // Remove expired entries
    const expiredResult = await collection.deleteMany({
      expiresAt: { $lt: now }
    });
    
    // Remove old entries that haven't been accessed in 7 days
    const oldCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oldResult = await collection.deleteMany({
      lastAccessed: { $lt: oldCutoff }
    });
    
    console.log(`Forecast cache cleanup: ${expiredResult.deletedCount} expired, ${oldResult.deletedCount} old entries removed`);
  } catch (error) {
    console.error('Error during forecast cache cleanup:', error);
  }
}

/**
 * Get forecast cache statistics
 */
export async function getForecastCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<CachedForecast>('forecast_cache');
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          totalAccesses: { $sum: '$accessCount' },
          oldestEntry: { $min: '$createdAt' },
          newestEntry: { $max: '$createdAt' },
        }
      }
    ]).toArray();
    
    const result = stats[0] || {
      totalEntries: 0,
      totalAccesses: 0,
      oldestEntry: null,
      newestEntry: null,
    };
    
    // Estimate size (rough calculation)
    const estimatedSizePerEntry = 50 * 1024; // ~50KB per forecast cache entry
    const totalSize = result.totalEntries * estimatedSizePerEntry;
    
    // Calculate hit rate (simplified)
    const hitRate = result.totalAccesses > 0 ? (result.totalAccesses / (result.totalEntries + result.totalAccesses)) * 100 : 0;
    
    return {
      totalEntries: result.totalEntries,
      totalSize,
      hitRate,
      oldestEntry: result.oldestEntry,
      newestEntry: result.newestEntry,
    };
  } catch (error) {
    console.error('Error getting forecast cache stats:', error);
    return {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}

/**
 * Initialize forecast cache indexes
 */
export async function initializeForecastCache(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('forecast_cache');
    
    // Create indexes for efficient querying
    await collection.createIndex({ cacheKey: 1 }, { unique: true });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ createdAt: 1 });
    await collection.createIndex({ lastAccessed: 1 });
    
    console.log('Forecast cache indexes created successfully');
  } catch (error) {
    console.error('Failed to initialize forecast cache:', error);
    throw error;
  }
}

/**
 * Invalidate forecast cache for a specific route
 */
export async function invalidateForecastCache(route: Route): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<CachedForecast>('forecast_cache');
    
    // Remove all cache entries for this route
    const result = await collection.deleteMany({
      'route.id': route.id
    });
    
    console.log(`Invalidated ${result.deletedCount} forecast cache entries for route: ${route.name}`);
  } catch (error) {
    console.error('Error invalidating forecast cache:', error);
  }
}

/**
 * Preload forecast cache for common settings
 */
export async function preloadForecastCache(route: Route): Promise<void> {
  try {
    // Common settings combinations to preload
    const commonSettings = [
      { speed: 15, interval: 5 }, // Default cycling
      { speed: 10, interval: 2 }, // Hiking
      { speed: 25, interval: 10 }, // Fast cycling
    ];
    
    const baseTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    for (const { speed, interval } of commonSettings) {
      const settings = {
        startTime: baseTime,
        averageSpeed: speed,
        forecastInterval: interval,
        units: 'metric' as const,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      
      // Check if already cached
      const existing = await getCachedForecast(route, settings);
      if (!existing) {
        console.log(`Preloading forecast cache for ${speed}km/h, ${interval}km interval`);
        // Note: This would need to call the actual forecast generation
        // Implementation depends on how you want to handle preloading
      }
    }
  } catch (error) {
    console.error('Error preloading forecast cache:', error);
  }
}

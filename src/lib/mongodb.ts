import type { MongoClient, Db, Collection } from 'mongodb';
import { CachedWeatherData, CachedRoute } from '@/types';

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export function isMongoConfigured(): boolean {
  return !!(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

// In-memory fallback caches when MongoDB is not configured or offline
const inMemoryWeatherCache = new Map<string, { data: CachedWeatherData; expiresAt: number }>();
const inMemoryRouteCache = new Map<string, CachedRoute>();

async function getClientPromise(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.trim()) {
    return null;
  }

  const { MongoClient: MongoClientClass } = await import('mongodb');

  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClientClass(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClientClass(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

// Database connection helper
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const connectedClient = await getClientPromise();
  if (!connectedClient) {
    throw new Error('MONGODB_URI is not configured');
  }
  try {
    const db = connectedClient.db('forecaster');
    return { client: connectedClient, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection failed');
  }
}

// Collection helpers
export async function getWeatherCacheCollection(): Promise<Collection<CachedWeatherData>> {
  const { db } = await connectToDatabase();
  return db.collection<CachedWeatherData>('weather_cache');
}

export async function getRouteCacheCollection(): Promise<Collection<CachedRoute>> {
  const { db } = await connectToDatabase();
  return db.collection<CachedRoute>('route_cache');
}

// Database initialization and indexes
export async function initializeDatabase(): Promise<void> {
  if (!isMongoConfigured()) {
    console.log('MongoDB not configured - skipping database initialization');
    return;
  }
  try {
    const { db } = await connectToDatabase();
    
    // Create indexes for weather cache
    const weatherCache = db.collection('weather_cache');
    await weatherCache.createIndex({ lat: 1, lon: 1, timestamp: 1 });
    await weatherCache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Create indexes for route cache
    const routeCache = db.collection('route_cache');
    await routeCache.createIndex({ hash: 1 }, { unique: true });
    await routeCache.createIndex({ lastAccessed: 1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Health check for database
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!isMongoConfigured()) {
    return false;
  }
  try {
    const { client } = await connectToDatabase();
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Weather cache operations
export async function getCachedWeatherData(
  lat: number, 
  lon: number, 
  maxAge: number = 3600000 // 1 hour default
): Promise<CachedWeatherData | null> {
  // Try MongoDB first if configured
  if (isMongoConfigured()) {
    try {
      const collection = await getWeatherCacheCollection();
      const cutoff = new Date(Date.now() - maxAge);
      
      const cached = await collection.findOne({
        lat: { $gte: lat - 0.01, $lte: lat + 0.01 }, // ~1km tolerance
        lon: { $gte: lon - 0.01, $lte: lon + 0.01 },
        timestamp: { $gte: cutoff }
      });
      
      if (cached) return cached;
    } catch (error) {
      console.warn('MongoDB weather cache lookup failed, falling back to memory:', error);
    }
  }

  // Fallback to in-memory cache
  const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const item = inMemoryWeatherCache.get(key);
  if (item) {
    if (Date.now() < item.expiresAt && Date.now() - new Date(item.data.timestamp).getTime() <= maxAge) {
      return item.data;
    }
    inMemoryWeatherCache.delete(key);
  }

  return null;
}

export async function setCachedWeatherData(data: Omit<CachedWeatherData, '_id'>): Promise<void> {
  const duration = process.env.CACHE_DURATION ? parseInt(process.env.CACHE_DURATION) : 3600000;
  const expiresAt = Date.now() + duration;
  const cachedData: CachedWeatherData = {
    ...data,
    timestamp: new Date(),
    expiresAt: new Date(expiresAt)
  };

  // Cache in-memory
  const key = `${data.lat.toFixed(2)}_${data.lon.toFixed(2)}`;
  inMemoryWeatherCache.set(key, { data: cachedData, expiresAt });

  // Also persist to MongoDB if configured
  if (isMongoConfigured()) {
    try {
      const collection = await getWeatherCacheCollection();
      await collection.insertOne(cachedData);
    } catch (error) {
      console.warn('MongoDB weather caching failed:', error);
    }
  }
}

// Route cache operations
export async function getCachedRoute(hash: string): Promise<CachedRoute | null> {
  if (isMongoConfigured()) {
    try {
      const collection = await getRouteCacheCollection();
      const cached = await collection.findOne({ hash });
      
      if (cached) {
        // Update last accessed time
        await collection.updateOne(
          { hash },
          { $set: { lastAccessed: new Date() } }
        );
        return cached;
      }
    } catch (error) {
      console.warn('MongoDB route cache lookup failed, falling back to memory:', error);
    }
  }

  // Fallback to in-memory cache
  const cached = inMemoryRouteCache.get(hash);
  if (cached) {
    cached.lastAccessed = new Date();
    return cached;
  }

  return null;
}

export async function setCachedRoute(data: Omit<CachedRoute, '_id'>): Promise<void> {
  const routeData: CachedRoute = {
    ...data,
    createdAt: new Date(),
    lastAccessed: new Date()
  };

  // Cache in-memory
  inMemoryRouteCache.set(data.hash, routeData);

  if (isMongoConfigured()) {
    try {
      const collection = await getRouteCacheCollection();
      await collection.replaceOne(
        { hash: data.hash },
        routeData,
        { upsert: true }
      );
    } catch (error) {
      console.warn('MongoDB route caching failed:', error);
    }
  }
}

// Cleanup old cache entries
export async function cleanupCache(): Promise<void> {
  // Clean memory cache
  const now = Date.now();
  for (const [key, item] of inMemoryWeatherCache.entries()) {
    if (now > item.expiresAt) {
      inMemoryWeatherCache.delete(key);
    }
  }

  if (isMongoConfigured()) {
    try {
      const { db } = await connectToDatabase();
      const routeCache = db.collection('route_cache');
      const routeCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await routeCache.deleteMany({ lastAccessed: { $lt: routeCutoff } });
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
}

export default getClientPromise;


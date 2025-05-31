import { MongoClient, Db, Collection } from 'mongodb';
import { CachedWeatherData, CachedRoute } from '@/types';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Database connection helper
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = await clientPromise;
    const db = client.db('forecaster');
    return { client, db };
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
  try {
    const collection = await getWeatherCacheCollection();
    const cutoff = new Date(Date.now() - maxAge);
    
    const cached = await collection.findOne({
      lat: { $gte: lat - 0.01, $lte: lat + 0.01 }, // ~1km tolerance
      lon: { $gte: lon - 0.01, $lte: lon + 0.01 },
      timestamp: { $gte: cutoff }
    });
    
    return cached;
  } catch (error) {
    console.error('Error fetching cached weather data:', error);
    return null;
  }
}

export async function setCachedWeatherData(data: Omit<CachedWeatherData, '_id'>): Promise<void> {
  try {
    const collection = await getWeatherCacheCollection();
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + (process.env.CACHE_DURATION ? parseInt(process.env.CACHE_DURATION) : 3600000))
    });
  } catch (error) {
    console.error('Error caching weather data:', error);
    // Don't throw - caching failure shouldn't break the app
  }
}

// Route cache operations
export async function getCachedRoute(hash: string): Promise<CachedRoute | null> {
  try {
    const collection = await getRouteCacheCollection();
    const cached = await collection.findOne({ hash });
    
    if (cached) {
      // Update last accessed time
      await collection.updateOne(
        { hash },
        { $set: { lastAccessed: new Date() } }
      );
    }
    
    return cached;
  } catch (error) {
    console.error('Error fetching cached route:', error);
    return null;
  }
}

export async function setCachedRoute(data: Omit<CachedRoute, '_id'>): Promise<void> {
  try {
    const collection = await getRouteCacheCollection();
    await collection.replaceOne(
      { hash: data.hash },
      {
        ...data,
        createdAt: new Date(),
        lastAccessed: new Date()
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error caching route data:', error);
    // Don't throw - caching failure shouldn't break the app
  }
}

// Cleanup old cache entries
export async function cleanupCache(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    
    // Clean up old route cache (older than 30 days)
    const routeCache = db.collection('route_cache');
    const routeCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await routeCache.deleteMany({ lastAccessed: { $lt: routeCutoff } });
    
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

export default clientPromise;

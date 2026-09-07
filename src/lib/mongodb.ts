import type { MongoClient, Db, Collection } from 'mongodb';
import { CachedWeatherData, CachedRoute, SavedExpedition } from '@/types';

export interface CachedMultiSourcePayload {
  _id?: string;
  cacheKey: string;
  sources: string[];
  forecasts: unknown[];
  divergenceAlerts: unknown[];
  modelAgreementScore: number;
  availableSources: string[];
  createdAt: Date;
  expiresAt: Date;
}

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
const inMemorySavedExpeditions = new Map<string, SavedExpedition>();
const inMemoryMultiSourceCache = new Map<string, { data: CachedMultiSourcePayload; expiresAt: number }>();

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
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        globalWithMongo._mongoClientPromise = undefined;
        throw err;
      });
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClientClass(uri, options);
      clientPromise = client.connect().catch((err) => {
        clientPromise = null;
        throw err;
      });
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

export async function getSavedExpeditionsCollection(): Promise<Collection<SavedExpedition>> {
  const { db } = await connectToDatabase();
  return db.collection<SavedExpedition>('saved_expeditions');
}

export async function getMultiSourceCacheCollection(): Promise<Collection<CachedMultiSourcePayload>> {
  const { db } = await connectToDatabase();
  return db.collection<CachedMultiSourcePayload>('multi_source_cache');
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

    // Create indexes for saved expeditions
    const savedExpeditions = db.collection('saved_expeditions');
    await savedExpeditions.createIndex({ id: 1 }, { unique: true });
    await savedExpeditions.createIndex({ updatedAt: -1 });

    // Create indexes for multi-source forecast cache
    const multiSourceCache = db.collection('multi_source_cache');
    await multiSourceCache.createIndex({ cacheKey: 1 }, { unique: true });
    await multiSourceCache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
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

// Saved Expeditions Operations
export interface SavedExpeditionSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  stats: SavedExpedition['stats'];
}

export async function listSavedExpeditions(): Promise<SavedExpeditionSummary[]> {
  if (isMongoConfigured()) {
    try {
      const collection = await getSavedExpeditionsCollection();
      const expeditions = await collection
        .find({})
        .sort({ updatedAt: -1 })
        .project<SavedExpeditionSummary>({
          id: 1,
          name: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          stats: 1,
        })
        .toArray();
      return expeditions;
    } catch (error) {
      console.warn('MongoDB list saved expeditions failed, using memory:', error);
    }
  }

  // Memory fallback
  return Array.from(inMemorySavedExpeditions.values())
    .map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      stats: e.stats,
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getSavedExpeditionById(id: string): Promise<SavedExpedition | null> {
  if (isMongoConfigured()) {
    try {
      const collection = await getSavedExpeditionsCollection();
      const item = await collection.findOne({ id });
      if (item) return item;
    } catch (error) {
      console.warn('MongoDB get saved expedition failed, using memory:', error);
    }
  }

  return inMemorySavedExpeditions.get(id) || null;
}

export async function saveExpedition(data: Omit<SavedExpedition, '_id'>): Promise<SavedExpedition> {
  const item: SavedExpedition = {
    ...data,
    updatedAt: new Date(),
    createdAt: data.createdAt || new Date(),
  };

  inMemorySavedExpeditions.set(item.id, item);

  if (isMongoConfigured()) {
    try {
      const collection = await getSavedExpeditionsCollection();
      await collection.replaceOne(
        { id: item.id },
        item,
        { upsert: true }
      );
      console.log(`Saved expedition ${item.name} (${item.id}) to MongoDB`);
    } catch (error) {
      console.warn('MongoDB save expedition failed, persisted in memory:', error);
    }
  }

  return item;
}

export async function deleteSavedExpedition(id: string): Promise<boolean> {
  inMemorySavedExpeditions.delete(id);

  if (isMongoConfigured()) {
    try {
      const collection = await getSavedExpeditionsCollection();
      const result = await collection.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.warn('MongoDB delete expedition failed:', error);
    }
  }

  return true;
}

// Multi-Source Forecast Cache Operations
export async function getCachedMultiSourceForecast(cacheKey: string): Promise<CachedMultiSourcePayload | null> {
  if (isMongoConfigured()) {
    try {
      const collection = await getMultiSourceCacheCollection();
      const cached = await collection.findOne({
        cacheKey,
        expiresAt: { $gt: new Date() }
      });
      if (cached) {
        console.log(`Multi-source forecast cache hit for key: ${cacheKey.slice(0, 8)}...`);
        return cached;
      }
    } catch (error) {
      console.warn('MongoDB multi-source cache lookup failed:', error);
    }
  }

  const memoryItem = inMemoryMultiSourceCache.get(cacheKey);
  if (memoryItem && memoryItem.expiresAt > Date.now()) {
    console.log(`Multi-source forecast cache hit (in-memory) for key: ${cacheKey.slice(0, 8)}...`);
    return memoryItem.data;
  }

  return null;
}

export async function setCachedMultiSourceForecast(
  cacheKey: string,
  sources: string[],
  forecasts: unknown[],
  divergenceAlerts: unknown[],
  modelAgreementScore: number,
  availableSources: string[],
  ttlMs: number = 30 * 60 * 1000 // 30 minutes default
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlMs);

  const payload: CachedMultiSourcePayload = {
    cacheKey,
    sources,
    forecasts,
    divergenceAlerts,
    modelAgreementScore,
    availableSources,
    createdAt: now,
    expiresAt,
  };

  inMemoryMultiSourceCache.set(cacheKey, { data: payload, expiresAt: expiresAt.getTime() });

  if (isMongoConfigured()) {
    try {
      const collection = await getMultiSourceCacheCollection();
      await collection.replaceOne(
        { cacheKey },
        payload,
        { upsert: true }
      );
    } catch (error) {
      console.warn('MongoDB multi-source caching failed:', error);
    }
  }
}

export default getClientPromise;


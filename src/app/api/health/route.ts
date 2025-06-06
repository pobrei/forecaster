import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, initializeDatabase } from '@/lib/mongodb';
import { testWeatherAPI } from '@/lib/weather-service';
import { initializeForecastCache, getForecastCacheStats } from '@/lib/forecast-cache';
import { withRetryAndTimeout } from '@/lib/api-error-handler';
import { logError } from '@/lib/error-tracking';

async function healthHandler(_request: NextRequest) {
  const timestamp = new Date().toISOString();
  const services = {
    database: 'unknown',
    weather_api: 'unknown',
    forecast_cache: 'unknown',
  };

  let overallStatus = 'healthy';
  const errors: string[] = [];

  // Test database connection with timeout
  try {
    const dbHealthy = await withRetryAndTimeout(
      () => checkDatabaseHealth(),
      { maxRetries: 2, timeout: 5000 }
    );
    services.database = dbHealthy ? 'healthy' : 'unhealthy';

    if (dbHealthy) {
      // Initialize database indexes if healthy
      try {
        await withRetryAndTimeout(
          () => initializeDatabase(),
          { maxRetries: 1, timeout: 10000 }
        );
        await withRetryAndTimeout(
          () => initializeForecastCache(),
          { maxRetries: 1, timeout: 5000 }
        );
        services.forecast_cache = 'healthy';
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { context: 'cache_initialization' });
        services.forecast_cache = 'degraded';
        errors.push('Cache initialization failed');
        overallStatus = 'degraded';
      }
    } else {
      errors.push('Database connection failed');
      services.forecast_cache = 'unhealthy';
      overallStatus = 'degraded';
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { context: 'database_health_check' });
    services.database = 'unhealthy';
    errors.push('Database error');
    overallStatus = 'degraded';
  }

  // Test weather API with timeout
  try {
    const weatherHealthy = await withRetryAndTimeout(
      () => testWeatherAPI(),
      { maxRetries: 2, timeout: 10000 }
    );
    services.weather_api = weatherHealthy ? 'healthy' : 'unhealthy';

    if (!weatherHealthy) {
      errors.push('Weather API connection failed');
      overallStatus = 'degraded';
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { context: 'weather_api_health_check' });
    services.weather_api = 'unhealthy';
    errors.push('Weather API error');
    overallStatus = 'degraded';
  }

  // Get cache statistics if database is healthy
  let cacheStats = null;
  if (services.database === 'healthy') {
    try {
      cacheStats = await withRetryAndTimeout(
        () => getForecastCacheStats(),
        { maxRetries: 1, timeout: 5000 }
      );
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'cache_stats' });
    }
  }

  const health = {
    status: overallStatus,
    timestamp,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services,
    errors: errors.length > 0 ? errors : undefined,
    cacheStats,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    return await healthHandler(request);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unknown',
          weather_api: 'unknown',
          forecast_cache: 'unknown',
        },
      },
      { status: 500 }
    );
  }
}

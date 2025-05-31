import { NextResponse } from 'next/server';
import { checkDatabaseHealth, initializeDatabase } from '@/lib/mongodb';
import { testWeatherAPI } from '@/lib/weather-service';
import { initializeForecastCache, getForecastCacheStats } from '@/lib/forecast-cache';

export async function GET() {
  const timestamp = new Date().toISOString();
  const services = {
    database: 'unknown',
    weather_api: 'unknown',
    forecast_cache: 'unknown',
  };

  let overallStatus = 'healthy';
  const errors: string[] = [];

  try {
    // Test database connection
    try {
      const dbHealthy = await checkDatabaseHealth();
      services.database = dbHealthy ? 'healthy' : 'unhealthy';

      if (dbHealthy) {
        // Initialize database indexes if healthy
        await initializeDatabase();
        await initializeForecastCache();
        services.forecast_cache = 'healthy';
      } else {
        errors.push('Database connection failed');
        services.forecast_cache = 'unhealthy';
        overallStatus = 'degraded';
      }
    } catch (error) {
      console.error('Database health check error:', error);
      services.database = 'unhealthy';
      errors.push('Database error');
      overallStatus = 'degraded';
    }

    // Test weather API
    try {
      const weatherHealthy = await testWeatherAPI();
      services.weather_api = weatherHealthy ? 'healthy' : 'unhealthy';

      if (!weatherHealthy) {
        errors.push('Weather API connection failed');
        overallStatus = 'degraded';
      }
    } catch (error) {
      console.error('Weather API health check error:', error);
      services.weather_api = 'unhealthy';
      errors.push('Weather API error');
      overallStatus = 'degraded';
    }

    // Get cache statistics if database is healthy
    let cacheStats = null;
    if (services.database === 'healthy') {
      try {
        cacheStats = await getForecastCacheStats();
      } catch (error) {
        console.error('Error getting cache stats:', error);
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
    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp,
        services,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWeatherForecasts } from '@/lib/weather-service';
import { sampleRoutePoints } from '@/lib/gpx-parser';
import { getCachedForecast, setCachedForecast } from '@/lib/forecast-cache';
import { APIResponse, WeatherResponse, RoutePoint } from '@/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ROUTE_CONFIG, GPX_CONSTRAINTS } from '@/lib/constants';
import { createErrorHandler, withRetryAndTimeout } from '@/lib/api-error-handler';
import { createValidationMiddleware } from '@/lib/api-validation';
import { weatherRequestValidationSchema } from '@/lib/validation';
import { ValidationError, NetworkError } from '@/lib/error-tracking';

const validateWeatherRequest = createValidationMiddleware<z.infer<typeof weatherRequestValidationSchema>, WeatherResponse>(weatherRequestValidationSchema);

async function weatherHandler(
  validatedData: z.infer<typeof weatherRequestValidationSchema>,
  _request: NextRequest
): Promise<NextResponse<APIResponse<WeatherResponse>>> {
  const { route, settings } = validatedData;

  // Apply default settings
  const finalSettings = {
    startTime: new Date(),
    averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
    forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
    units: 'metric' as const,
    timezone: 'UTC',
    ...settings
  };

  // Validate route has sufficient points
  if (!route.points || route.points.length < 2) {
    throw new ValidationError(ERROR_MESSAGES.WEATHER.INVALID_COORDINATES);
  }

  console.log(`Processing weather request for route: ${route.name}`);
  console.log(`Settings: interval=${finalSettings.forecastInterval}km, speed=${finalSettings.averageSpeed}km/h`);

  // Check forecast cache with error handling
  let cachedForecasts;
  try {
    cachedForecasts = await withRetryAndTimeout(
      () => getCachedForecast(route, finalSettings),
      { maxRetries: 2, timeout: 5000 }
    );
  } catch (error) {
    console.warn('Forecast cache lookup failed:', error);
  }

  if (cachedForecasts) {
    console.log(`Forecast cache hit for route: ${route.name}`);
    return NextResponse.json<APIResponse<WeatherResponse>>({
      success: true,
      data: {
        forecasts: cachedForecasts,
        cacheHit: true,
        message: SUCCESS_MESSAGES.WEATHER_LOADED + ' (from cache)'
      },
      timestamp: new Date()
    });
  }

  // Sample route points
  const sampledPoints = sampleRoutePoints(route, finalSettings.forecastInterval);

  if (sampledPoints.length === 0) {
    throw new ValidationError('No valid points found for weather sampling');
  }

  console.log(`Sampled ${sampledPoints.length} points from ${route.points.length} total points`);

  // Add estimated times to route points
  const pointsWithTime: RoutePoint[] = sampledPoints.map(point => ({
    ...point,
    estimatedTime: new Date(
      finalSettings.startTime.getTime() +
      (point.distance / finalSettings.averageSpeed) * 60 * 60 * 1000
    )
  }));

  // Get weather forecasts with comprehensive error handling
  const forecasts = await withRetryAndTimeout(
    async () => {
      try {
        return await getWeatherForecasts(pointsWithTime);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('rate limit')) {
            throw new NetworkError('Weather API rate limit exceeded. Please try again later.');
          } else if (error.message.includes('API key')) {
            throw new NetworkError('Weather service configuration error.');
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            throw new NetworkError('Failed to connect to weather service.');
          }
        }
        throw error;
      }
    },
    {
      maxRetries: 3,
      timeout: 30000,
      retryCondition: (error) =>
        !error.message.includes('API key') &&
        !error.message.includes('validation')
    }
  );

  if (forecasts.length === 0) {
    throw new NetworkError(ERROR_MESSAGES.WEATHER.NO_DATA);
  }

  // Cache the forecast results with error handling
  try {
    await withRetryAndTimeout(
      () => setCachedForecast(route, finalSettings, forecasts),
      { maxRetries: 2, timeout: 5000 }
    );
  } catch (error) {
    console.warn('Failed to cache forecast results:', error);
  }

  // Count alerts for logging
  const totalAlerts = forecasts.reduce((count, forecast) =>
    count + (forecast.alerts?.length || 0), 0
  );

  console.log(`Successfully generated ${forecasts.length} weather forecasts`);
  if (totalAlerts > 0) {
    console.log(`Generated ${totalAlerts} weather alerts`);
  }

  return NextResponse.json<APIResponse<WeatherResponse>>({
    success: true,
    data: {
      forecasts,
      cacheHit: false,
      message: SUCCESS_MESSAGES.WEATHER_LOADED
    },
    timestamp: new Date()
  });
}

export const POST = createErrorHandler(
  (request: NextRequest) => validateWeatherRequest(request, weatherHandler)
);

export async function GET() {
  return NextResponse.json({
    message: 'Weather forecast endpoint. Use POST with route data and settings.',
    requiredFields: ['route'],
    optionalFields: ['settings.forecastInterval', 'settings.averageSpeed', 'settings.startTime'],
    limits: {
      forecastInterval: `${ROUTE_CONFIG.MIN_INTERVAL}-${ROUTE_CONFIG.MAX_INTERVAL} km`,
      averageSpeed: `${ROUTE_CONFIG.MIN_SPEED}-${ROUTE_CONFIG.MAX_SPEED} km/h`,
      maxPoints: GPX_CONSTRAINTS.MAX_WAYPOINTS
    },
    validation: {
      security: 'Input sanitization enabled',
      rateLimit: 'API rate limiting active',
      caching: 'Intelligent caching enabled'
    }
  });
}

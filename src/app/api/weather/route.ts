import { NextRequest, NextResponse } from 'next/server';
import { getWeatherForecasts } from '@/lib/weather-service';
import { sampleRoutePoints } from '@/lib/gpx-parser';
import { getCachedForecast, setCachedForecast } from '@/lib/forecast-cache';
import { APIResponse, WeatherResponse, RoutePoint } from '@/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ROUTE_CONFIG, GPX_CONSTRAINTS } from '@/lib/constants';
import { createErrorHandler, withRetryAndTimeout } from '@/lib/api-error-handler';
import { createValidationMiddleware } from '@/lib/api-validation';
import { weatherRequestValidationSchema } from '@/lib/validation';
import { ValidationError, NetworkError } from '@/lib/error-tracking';
import { weatherRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { logger, logWeatherAPICall } from '@/lib/logger';
import { trackError, trackWeatherRequest, measureTransaction } from '@/lib/sentry';

const validateWeatherRequest = createValidationMiddleware<any, WeatherResponse>(weatherRequestValidationSchema);

async function weatherHandler(
  validatedData: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest
): Promise<NextResponse<APIResponse<WeatherResponse>>> {
  const start = Date.now();
  const { route, settings } = validatedData;

  logger.info('Weather request started', {
    routeName: route.name,
    pointCount: route.points?.length || 0,
    settings: settings || {}
  });

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
    const duration = Date.now() - start;
    logger.info('Weather request completed (cached)', {
      routeName: route.name,
      duration: `${duration}ms`,
      forecastCount: cachedForecasts.length,
      cached: true
    });

    logWeatherAPICall(cachedForecasts.length, duration, true, false);
    trackWeatherRequest(cachedForecasts.length, duration, true);

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

  // Check if route is too large for single request (Vercel timeout protection)
  const isLargeRoute = sampledPoints.length > 100;
  if (isLargeRoute) {
    console.log(`Large route detected (${sampledPoints.length} points). Consider using /api/weather/progressive endpoint.`);
  }

  // Add estimated times to route points
  const pointsWithTime: RoutePoint[] = sampledPoints.map(point => ({
    ...point,
    estimatedTime: new Date(
      finalSettings.startTime.getTime() +
      (point.distance / finalSettings.averageSpeed) * 60 * 60 * 1000
    )
  }));

  // Get weather forecasts with comprehensive error handling
  // Adjust timeout based on route size (Vercel has 10s hobby, 30s pro limit)
  const timeoutMs = isLargeRoute ? 25000 : Math.min(pointsWithTime.length * 300, 25000);
  const maxRetries = isLargeRoute ? 1 : 3; // Fewer retries for large routes to avoid timeout

  console.log(`Using timeout: ${timeoutMs}ms, retries: ${maxRetries} for ${pointsWithTime.length} points`);

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
      maxRetries,
      timeout: timeoutMs,
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

  const duration = Date.now() - start;

  logger.info('Weather request completed', {
    routeName: route.name,
    duration: `${duration}ms`,
    forecastCount: forecasts.length,
    alertCount: totalAlerts,
    cached: false
  });

  logWeatherAPICall(forecasts.length, duration, true, false);
  trackWeatherRequest(forecasts.length, duration, false);

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
  withRateLimit(weatherRateLimiter, (request: NextRequest) => validateWeatherRequest(request, weatherHandler))
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

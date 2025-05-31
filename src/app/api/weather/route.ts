import { NextRequest, NextResponse } from 'next/server';
import { getWeatherForecasts } from '@/lib/weather-service';
import { sampleRoutePoints } from '@/lib/gpx-parser';
import { getCachedForecast, setCachedForecast } from '@/lib/forecast-cache';
import { APIResponse, WeatherResponse, RoutePoint } from '@/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ROUTE_CONFIG } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { route, settings } = body;

    if (!route || !route.points || route.points.length === 0) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: ERROR_MESSAGES.WEATHER.INVALID_COORDINATES,
      }, { status: 400 });
    }

    // Extract settings with defaults
    const forecastInterval = settings?.forecastInterval || ROUTE_CONFIG.DEFAULT_INTERVAL;
    const averageSpeed = settings?.averageSpeed || ROUTE_CONFIG.DEFAULT_SPEED;
    const startTime = settings?.startTime ? new Date(settings.startTime) : new Date();

    // Validate settings
    if (forecastInterval < ROUTE_CONFIG.MIN_INTERVAL || forecastInterval > ROUTE_CONFIG.MAX_INTERVAL) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: `Forecast interval must be between ${ROUTE_CONFIG.MIN_INTERVAL} and ${ROUTE_CONFIG.MAX_INTERVAL} km`,
      }, { status: 400 });
    }

    if (averageSpeed < ROUTE_CONFIG.MIN_SPEED || averageSpeed > ROUTE_CONFIG.MAX_SPEED) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: `Average speed must be between ${ROUTE_CONFIG.MIN_SPEED} and ${ROUTE_CONFIG.MAX_SPEED} km/h`,
      }, { status: 400 });
    }

    console.log(`Processing weather request for route: ${route.name}`);
    console.log(`Settings: interval=${forecastInterval}km, speed=${averageSpeed}km/h`);

    // Check forecast cache first
    const cachedForecasts = await getCachedForecast(route, { startTime, averageSpeed, forecastInterval, units: settings.units || 'metric', timezone: settings.timezone || 'UTC' });

    if (cachedForecasts) {
      console.log(`Forecast cache hit for route: ${route.name}`);

      return NextResponse.json<APIResponse<WeatherResponse>>({
        success: true,
        data: {
          forecasts: cachedForecasts,
          cacheHit: true,
          message: SUCCESS_MESSAGES.WEATHER_LOADED + ' (from cache)'
        }
      });
    }

    // Sample route points at specified intervals
    const sampledPoints = sampleRoutePoints(route, forecastInterval);
    console.log(`Sampled ${sampledPoints.length} points from ${route.points.length} total points`);

    // Add estimated times to route points based on distance and speed
    const pointsWithTime: RoutePoint[] = sampledPoints.map(point => ({
      ...point,
      estimatedTime: new Date(startTime.getTime() + (point.distance / averageSpeed) * 60 * 60 * 1000)
    }));

    // Get weather forecasts for sampled points
    const forecasts = await getWeatherForecasts(pointsWithTime);

    if (forecasts.length === 0) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: ERROR_MESSAGES.WEATHER.NO_DATA,
      }, { status: 500 });
    }

    console.log(`Successfully generated ${forecasts.length} weather forecasts`);

    // Count alerts
    const totalAlerts = forecasts.reduce((count, forecast) => 
      count + (forecast.alerts?.length || 0), 0
    );

    if (totalAlerts > 0) {
      console.log(`Generated ${totalAlerts} weather alerts`);
    }

    // Cache the forecast results
    await setCachedForecast(route, { startTime, averageSpeed, forecastInterval, units: settings.units || 'metric', timezone: settings.timezone || 'UTC' }, forecasts);

    return NextResponse.json<APIResponse<WeatherResponse>>({
      success: true,
      data: {
        forecasts,
        cacheHit: false,
        message: SUCCESS_MESSAGES.WEATHER_LOADED
      }
    });

  } catch (error) {
    console.error('Weather forecast error:', error);

    let errorMessage: string = ERROR_MESSAGES.WEATHER.API_ERROR;
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        errorMessage = ERROR_MESSAGES.WEATHER.RATE_LIMIT;
        statusCode = 429;
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = 'Weather service configuration error';
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json<APIResponse<null>>({
      success: false,
      error: errorMessage,
    }, { status: statusCode });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Weather forecast endpoint. Use POST with route data and settings.',
    requiredFields: ['route'],
    optionalFields: ['settings.forecastInterval', 'settings.averageSpeed', 'settings.startTime'],
    limits: {
      forecastInterval: `${ROUTE_CONFIG.MIN_INTERVAL}-${ROUTE_CONFIG.MAX_INTERVAL} km`,
      averageSpeed: `${ROUTE_CONFIG.MIN_SPEED}-${ROUTE_CONFIG.MAX_SPEED} km/h`
    }
  });
}

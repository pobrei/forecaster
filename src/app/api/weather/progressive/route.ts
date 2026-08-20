import { NextRequest, NextResponse } from 'next/server';
import { getWeatherForecasts } from '@/lib/weather-service';
import { sampleRoutePoints } from '@/lib/gpx-parser';
import { RoutePoint, WeatherForecast, Route, AppSettings } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { withRetryAndTimeout } from '@/lib/api-error-handler';

export async function GET() {
  return NextResponse.json({
    message: 'Progressive weather forecast endpoint for large routes.',
    description: 'Processes weather data in chunks to prevent timeouts on large routes.',
    supportedParams: {
      route: 'Route object with points',
      settings: 'AppSettings object (forecastInterval, averageSpeed, startTime, units)',
      chunkIndex: 'Zero-based index of the chunk (number)',
      chunkSize: 'Number of points per chunk (default: 25)',
      points: 'Optional pre-sampled chunk of RoutePoints with estimatedTime'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { route, settings, chunkIndex = 0, chunkSize = 25, points } = body as {
      route?: Route;
      settings?: AppSettings;
      chunkIndex?: number;
      chunkSize?: number;
      points?: RoutePoint[];
    };

    let pointsToFetch: RoutePoint[] = [];
    let totalPoints = 0;
    let totalChunks = 1;

    const finalSettings = {
      startTime: settings?.startTime ? new Date(settings.startTime) : new Date(),
      averageSpeed: settings?.averageSpeed || ROUTE_CONFIG.DEFAULT_SPEED,
      forecastInterval: settings?.forecastInterval || ROUTE_CONFIG.DEFAULT_INTERVAL,
      units: settings?.units || 'metric',
    };

    if (points && Array.isArray(points) && points.length > 0) {
      pointsToFetch = points.map(p => ({
        ...p,
        estimatedTime: p.estimatedTime ? new Date(p.estimatedTime) : new Date(
          finalSettings.startTime.getTime() + (p.distance / finalSettings.averageSpeed) * 60 * 60 * 1000
        )
      }));
      totalPoints = points.length;
      totalChunks = 1;
    } else if (route && route.points && route.points.length >= 2) {
      const sampled = sampleRoutePoints(route, finalSettings.forecastInterval);
      totalPoints = sampled.length;
      totalChunks = Math.ceil(totalPoints / chunkSize);

      const startIdx = chunkIndex * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, totalPoints);
      const chunkSampled = sampled.slice(startIdx, endIdx);

      pointsToFetch = chunkSampled.map(point => ({
        ...point,
        estimatedTime: new Date(
          finalSettings.startTime.getTime() +
          (point.distance / finalSettings.averageSpeed) * 60 * 60 * 1000
        )
      }));
    } else {
      return NextResponse.json(
        { success: false, error: 'Valid route or points array is required' },
        { status: 400 }
      );
    }

    if (pointsToFetch.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          forecasts: [],
          chunkIndex,
          totalChunks,
          totalPoints,
          isComplete: true
        }
      });
    }

    // Fetch weather forecasts for this chunk with timeout protection
    const forecasts: WeatherForecast[] = await withRetryAndTimeout(
      async () => getWeatherForecasts(pointsToFetch),
      { maxRetries: 2, timeout: 15000 }
    );

    const isComplete = chunkIndex >= totalChunks - 1;

    return NextResponse.json({
      success: true,
      data: {
        forecasts,
        chunkIndex,
        totalChunks,
        totalPoints,
        isComplete
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Progressive weather API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process progressive weather request'
      },
      { status: 500 }
    );
  }
}


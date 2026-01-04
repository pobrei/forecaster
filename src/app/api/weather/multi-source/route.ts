import { NextRequest, NextResponse } from 'next/server';
import { fetchMultiSourceForecasts, getAvailableProviders } from '@/lib/multi-source-weather';
import { sampleRoutePoints } from '@/lib/gpx-parser';
import { RoutePoint } from '@/types';
import { WeatherProviderId } from '@/types/weather-sources';
import { ROUTE_CONFIG } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { route, settings, sources } = body;

    if (!route?.points || route.points.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Invalid route data' },
        { status: 400 }
      );
    }

    // Apply default settings
    const finalSettings = {
      startTime: new Date(),
      averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
      forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
      ...settings
    };

    // Get available providers
    const availableProviders = getAvailableProviders();
    
    // Use requested sources or all available
    const requestedSources: WeatherProviderId[] = sources?.length 
      ? sources.filter((s: WeatherProviderId) => availableProviders.includes(s))
      : availableProviders;

    console.log(`Multi-source weather request: ${requestedSources.join(', ')}`);

    // Sample route points
    const sampledPoints = sampleRoutePoints(route, finalSettings.forecastInterval);

    // Add estimated times
    const pointsWithTime: RoutePoint[] = sampledPoints.map(point => ({
      ...point,
      estimatedTime: new Date(
        new Date(finalSettings.startTime).getTime() +
        (point.distance / finalSettings.averageSpeed) * 60 * 60 * 1000
      )
    }));

    // Limit points for multi-source (more expensive)
    const limitedPoints = pointsWithTime.slice(0, 50);

    // Fetch from multiple sources
    const forecasts = await fetchMultiSourceForecasts(limitedPoints, requestedSources);

    return NextResponse.json({
      success: true,
      data: {
        forecasts,
        availableProviders,
        usedProviders: requestedSources,
        pointCount: limitedPoints.length,
        message: `Fetched weather from ${requestedSources.length} source(s)`
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Multi-source weather error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const availableProviders = getAvailableProviders();
  
  return NextResponse.json({
    message: 'Multi-source weather endpoint for comparing providers',
    availableProviders,
    usage: {
      method: 'POST',
      body: {
        route: 'Route object with points array',
        settings: 'Optional settings (forecastInterval, averageSpeed, startTime)',
        sources: 'Optional array of provider IDs to use'
      }
    }
  });
}


import { NextRequest, NextResponse } from 'next/server';
import { fetchMultiSourceForecasts, getAvailableProviders } from '@/lib/multi-source-weather';
import { sampleRoutePoints } from '@/lib/gpx-parser';
import { RoutePoint } from '@/types';
import { WeatherProviderId, ModelDivergenceAlert } from '@/types/weather-sources';
import { ROUTE_CONFIG } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { route, settings, sources, customKeys } = body;

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

    // Get available providers given environment and optional custom keys
    const availableProviders = getAvailableProviders(customKeys);
    
    // Use requested sources or sensible default free models
    const requestedSources: WeatherProviderId[] = sources?.length 
      ? sources.filter((s: WeatherProviderId) => availableProviders.includes(s))
      : availableProviders.slice(0, 4); // Default to top 4 models

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

    // Limit points for multi-source for responsiveness and rate limits
    const limitedPoints = pointsWithTime.slice(0, 45);

    // Fetch from multiple sources & models
    const forecasts = await fetchMultiSourceForecasts(limitedPoints, requestedSources, customKeys);

    // Aggregate route-level divergence alerts and agreement score
    const allAlerts: ModelDivergenceAlert[] = [];
    let totalAgreement = 0;

    forecasts.forEach(f => {
      if (f.sourceComparison?.agreementScore !== undefined) {
        totalAgreement += f.sourceComparison.agreementScore;
      }
      if (f.sourceComparison?.divergenceAlerts) {
        allAlerts.push(...f.sourceComparison.divergenceAlerts);
      }
    });

    const averageAgreement = forecasts.length > 0 
      ? Math.round(totalAgreement / forecasts.length) 
      : 100;

    // Filter and deduplicate highest-priority divergence alerts
    const topDivergenceAlerts = allAlerts
      .sort((a, b) => (b.severity === 'high' ? 2 : 1) - (a.severity === 'high' ? 2 : 1))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        forecasts,
        availableProviders,
        usedProviders: requestedSources,
        pointCount: forecasts.length,
        summary: {
          totalPoints: forecasts.length,
          agreementScore: averageAgreement,
          divergenceCount: allAlerts.length,
          divergenceAlerts: topDivergenceAlerts,
        },
        message: `Fetched weather from ${requestedSources.length} model(s)/source(s)`
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
    message: 'Multi-source weather endpoint for comparing meteorological models and providers',
    availableProviders,
    usage: {
      method: 'POST',
      body: {
        route: 'Route object with points array',
        settings: 'Optional settings (forecastInterval, averageSpeed, startTime)',
        sources: 'Optional array of provider IDs to use',
        customKeys: 'Optional user API keys for external providers'
      }
    }
  });
}

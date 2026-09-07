import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { listSavedExpeditions, saveExpedition } from '@/lib/mongodb';
import { WeatherForecast } from '@/types';

export async function GET() {
  try {
    const expeditions = await listSavedExpeditions();
    return NextResponse.json({
      success: true,
      expeditions,
      count: expeditions.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to list saved expeditions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve saved expeditions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, route, forecasts = [], settings } = body;

    if (!route || !route.points || route.points.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Route must contain at least 2 coordinate points' },
        { status: 400 }
      );
    }

    const expeditionName = (name || route.name || 'Untitled Expedition').trim();

    // Compute weather stats from forecasts
    let minTemp = 0;
    let maxTemp = 0;
    let maxWind = 0;

    if (Array.isArray(forecasts) && forecasts.length > 0) {
      const temps = forecasts
        .map((f: WeatherForecast) => f.weather?.temp)
        .filter((t: number) => typeof t === 'number' && !isNaN(t));
      const winds = forecasts
        .map((f: WeatherForecast) => f.weather?.wind_speed)
        .filter((w: number) => typeof w === 'number' && !isNaN(w));

      if (temps.length > 0) {
        minTemp = Math.round(Math.min(...temps) * 10) / 10;
        maxTemp = Math.round(Math.max(...temps) * 10) / 10;
      }
      if (winds.length > 0) {
        maxWind = Math.round(Math.max(...winds) * 10) / 10;
      }
    }

    const stats = {
      totalDistance: Math.round(((route.totalDistance ?? route.distance) || 0) * 10) / 10,
      totalElevationGain: Math.round(((route.totalElevationGain ?? route.elevationGain) || 0)),
      pointsCount: route.points.length,
      minTemp,
      maxTemp,
      maxWind,
    };

    const newId = `exp_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;

    const saved = await saveExpedition({
      id: newId,
      name: expeditionName,
      description: description || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      route,
      forecasts,
      settings: settings || {
        startTime: new Date().toISOString(),
        averageSpeed: 4.5,
        forecastInterval: 3,
        weatherSource: 'open-meteo',
      },
      stats,
    });

    return NextResponse.json({
      success: true,
      expedition: saved,
      message: `Expedition "${expeditionName}" saved successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to save expedition:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save expedition' },
      { status: 500 }
    );
  }
}

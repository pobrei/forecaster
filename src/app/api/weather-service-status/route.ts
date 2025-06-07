import { NextRequest, NextResponse } from 'next/server';
import { WeatherServiceFactory } from '@/lib/weather-service';
import { APIResponse } from '@/types';

interface WeatherServiceStatusResponse {
  name: string;
  limits: {
    requestsPerDay: number;
    requestsPerMinute: number;
  };
  available: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<WeatherServiceStatusResponse>>> {
  try {
    const service = WeatherServiceFactory.getService();
    const serviceName = service.getName();
    const limits = service.getApiLimits();
    
    const statusData: WeatherServiceStatusResponse = {
      name: serviceName,
      limits,
      available: true
    };

    return NextResponse.json({
      success: true,
      data: statusData,
      message: `Weather service status retrieved: ${serviceName}`
    });
  } catch (error) {
    console.error('Error getting weather service status:', error);
    
    // Return fallback status
    return NextResponse.json({
      success: true,
      data: {
        name: 'Open-Meteo',
        limits: {
          requestsPerDay: 10000,
          requestsPerMinute: 600
        },
        available: true
      },
      message: 'Fallback weather service status'
    });
  }
}

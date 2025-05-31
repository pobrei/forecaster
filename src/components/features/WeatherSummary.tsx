"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Wind, 
  Droplets, 
  Thermometer, 
  Gauge, 
  AlertTriangle,
  Eye,
  BarChart3
} from 'lucide-react';
import { WeatherForecast, WeatherSummaryStats } from '@/types';
import { 
  formatTemperature, 
  formatWindSpeed, 
  formatPrecipitation, 
  formatPressure,
  formatPercentage,
  formatDistance
} from '@/lib/format';
import { cn } from '@/lib/utils';

interface WeatherSummaryProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
}

function calculateWeatherStats(forecasts: WeatherForecast[]): WeatherSummaryStats {
  if (forecasts.length === 0) {
    return {
      temperature: { min: 0, max: 0, avg: 0, range: 0 },
      wind: { min: 0, max: 0, avg: 0 },
      precipitation: { total: 0, maxHourly: 0, rainyPoints: 0, totalPoints: 0 },
      atmospheric: {
        humidity: { min: 0, max: 0, avg: 0 },
        pressure: { min: 0, max: 0, avg: 0 },
        visibility: { min: 0, max: 0, avg: 0 }
      },
      alerts: { total: 0, bySeverity: {}, byType: {} }
    };
  }

  const temps = forecasts.map(f => f.weather.temp);
  const winds = forecasts.map(f => f.weather.wind_speed);
  const humidities = forecasts.map(f => f.weather.humidity);
  const pressures = forecasts.map(f => f.weather.pressure);
  const visibilities = forecasts.map(f => f.weather.visibility || 10000);
  const precipitations = forecasts.map(f => 
    (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0)
  );

  const allAlerts = forecasts.flatMap(f => f.alerts || []);
  const alertsBySeverity: Record<string, number> = {};
  const alertsByType: Record<string, number> = {};

  allAlerts.forEach(alert => {
    alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
  });

  return {
    temperature: {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((sum, t) => sum + t, 0) / temps.length,
      range: Math.max(...temps) - Math.min(...temps)
    },
    wind: {
      min: Math.min(...winds),
      max: Math.max(...winds),
      avg: winds.reduce((sum, w) => sum + w, 0) / winds.length,
      maxGust: Math.max(...forecasts.map(f => f.weather.wind_gust || 0))
    },
    precipitation: {
      total: precipitations.reduce((sum, p) => sum + p, 0),
      maxHourly: Math.max(...precipitations),
      rainyPoints: precipitations.filter(p => p > 0).length,
      totalPoints: forecasts.length
    },
    atmospheric: {
      humidity: {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((sum, h) => sum + h, 0) / humidities.length
      },
      pressure: {
        min: Math.min(...pressures),
        max: Math.max(...pressures),
        avg: pressures.reduce((sum, p) => sum + p, 0) / pressures.length
      },
      visibility: {
        min: Math.min(...visibilities),
        max: Math.max(...visibilities),
        avg: visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length
      }
    },
    alerts: {
      total: allAlerts.length,
      bySeverity: alertsBySeverity,
      byType: alertsByType
    }
  };
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'extreme': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
}

export function WeatherSummary({ forecasts, units = 'metric', className }: WeatherSummaryProps) {
  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weather Summary
          </CardTitle>
          <CardDescription>
            Weather statistics and overview will appear here after generating forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weather data available</p>
              <p className="text-xs">Generate forecasts to see the summary</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = calculateWeatherStats(forecasts);
  const routeDistance = forecasts[forecasts.length - 1]?.routePoint.distance || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weather Summary
        </CardTitle>
        <CardDescription>
          Overview of weather conditions along your {formatDistance(routeDistance, units)} route
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Temperature Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Thermometer className="h-4 w-4 text-red-500" />
              Temperature
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Range:</span>
                <span className="text-sm font-medium">
                  {formatTemperature(stats.temperature.min, units)} - {formatTemperature(stats.temperature.max, units)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Average:</span>
                <span className="text-sm font-medium">
                  {formatTemperature(stats.temperature.avg, units)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Variation:</span>
                <span className="text-sm font-medium">
                  {stats.temperature.range.toFixed(1)}°
                </span>
              </div>
            </div>
          </div>

          {/* Wind Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wind className="h-4 w-4 text-blue-500" />
              Wind
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Range:</span>
                <span className="text-sm font-medium">
                  {formatWindSpeed(stats.wind.min, units)} - {formatWindSpeed(stats.wind.max, units)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Average:</span>
                <span className="text-sm font-medium">
                  {formatWindSpeed(stats.wind.avg, units)}
                </span>
              </div>
              {stats.wind.maxGust && stats.wind.maxGust > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Max Gust:</span>
                  <span className="text-sm font-medium">
                    {formatWindSpeed(stats.wind.maxGust, units)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Precipitation Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Droplets className="h-4 w-4 text-blue-600" />
              Precipitation
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="text-sm font-medium">
                  {formatPrecipitation(stats.precipitation.total, units)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Max/hour:</span>
                <span className="text-sm font-medium">
                  {formatPrecipitation(stats.precipitation.maxHourly, units)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Rainy points:</span>
                <span className="text-sm font-medium">
                  {stats.precipitation.rainyPoints}/{stats.precipitation.totalPoints}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alerts
            </div>
            {stats.alerts.total > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total:</span>
                  <span className="text-sm font-medium">{stats.alerts.total}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.alerts.bySeverity).map(([severity, count]) => (
                    <Badge 
                      key={severity} 
                      variant="secondary" 
                      className={cn("text-xs", getSeverityColor(severity), "text-white")}
                    >
                      {severity}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No alerts</div>
            )}
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Gauge className="h-3 w-3" />
              Humidity Range
            </div>
            <div className="text-sm font-medium">
              {formatPercentage(stats.atmospheric.humidity.min)} - {formatPercentage(stats.atmospheric.humidity.max)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Gauge className="h-3 w-3" />
              Pressure Range
            </div>
            <div className="text-sm font-medium">
              {formatPressure(stats.atmospheric.pressure.min, units)} - {formatPressure(stats.atmospheric.pressure.max, units)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Eye className="h-3 w-3" />
              Visibility Range
            </div>
            <div className="text-sm font-medium">
              {(stats.atmospheric.visibility.min / 1000).toFixed(1)}km - {(stats.atmospheric.visibility.max / 1000).toFixed(1)}km
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

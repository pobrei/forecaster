"use client";

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, Wind, Droplets, Thermometer } from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatTime, formatDistance } from '@/lib/format';
import { cn } from '@/lib/utils';

interface WeatherTimelineProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  selectedPoint?: SelectedWeatherPoint | null;
}

export function WeatherTimeline({
  forecasts,
  units = 'metric',
  className,
  onPointSelect,
  selectedPoint
}: WeatherTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to show some items
    if (scrollRef.current && forecasts.length > 0) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [forecasts]);

  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weather Timeline
          </CardTitle>
          <CardDescription>
            Timeline view of weather conditions along your route
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weather timeline available</p>
              <p className="text-xs">Generate forecasts to see the timeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getWeatherIcon = (weather: { weather: Array<{ main: string }> }) => {
    const main = weather.weather[0]?.main.toLowerCase();
    switch (main) {
      case 'clear': return '☀️';
      case 'clouds': return '☁️';
      case 'rain': return '🌧️';
      case 'snow': return '❄️';
      case 'thunderstorm': return '⛈️';
      case 'drizzle': return '🌦️';
      case 'mist':
      case 'fog': return '🌫️';
      default: return '🌤️';
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 0) return 'text-blue-600 dark:text-blue-400';
    if (temp < 10) return 'text-cyan-600 dark:text-cyan-400';
    if (temp > 25) return 'text-orange-600 dark:text-orange-400';
    if (temp > 35) return 'text-red-600 dark:text-red-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const totalAlerts = forecasts.reduce((sum, forecast) => sum + (forecast.alerts?.length || 0), 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weather Timeline
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalAlerts} Alert{totalAlerts > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Scroll horizontally to explore weather conditions along your {formatDistance(forecasts[forecasts.length - 1]?.routePoint.distance || 0, units)} route
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          {forecasts.map((forecast, index) => {
            const hasAlerts = forecast.alerts && forecast.alerts.length > 0;
            const highSeverityAlerts = forecast.alerts?.filter(alert => 
              alert.severity === 'extreme' || alert.severity === 'high'
            ) || [];

            const isSelected = selectedPoint?.forecastIndex === index;

            return (
              <div
                key={index}
                className={cn(
                  "flex-shrink-0 w-48 p-4 border rounded-lg bg-card transition-all hover:shadow-md cursor-pointer",
                  hasAlerts && "border-orange-200 dark:border-orange-800",
                  highSeverityAlerts.length > 0 && "border-red-200 dark:border-red-800",
                  isSelected && "ring-2 ring-blue-500 border-blue-300 dark:border-blue-700"
                )}
                onClick={() => onPointSelect?.(index, 'timeline')}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">
                    {formatDistance(forecast.routePoint.distance, units)}
                  </div>
                  {forecast.routePoint.estimatedTime && (
                    <div className="text-xs text-muted-foreground">
                      {formatTime(forecast.routePoint.estimatedTime)}
                    </div>
                  )}
                </div>

                {/* Weather Icon and Condition */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getWeatherIcon(forecast.weather)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {forecast.weather.weather[0]?.description}
                    </div>
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className={cn("font-semibold", getTemperatureColor(forecast.weather.temp))}>
                    {formatTemperature(forecast.weather.temp, units)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    feels {formatTemperature(forecast.weather.feels_like, units)}
                  </span>
                </div>

                {/* Wind */}
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatWindSpeed(forecast.weather.wind_speed, units)}
                  </span>
                </div>

                {/* Precipitation */}
                {(forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) && (
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      {forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']}mm/h
                    </span>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  <div>
                    <span>Humidity</span>
                    <div className="font-medium">{forecast.weather.humidity}%</div>
                  </div>
                  <div>
                    <span>Clouds</span>
                    <div className="font-medium">{forecast.weather.clouds}%</div>
                  </div>
                </div>

                {/* Alerts */}
                {hasAlerts && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3 w-3" />
                      {forecast.alerts!.length} Alert{forecast.alerts!.length > 1 ? 's' : ''}
                    </div>
                    <div className="space-y-1">
                      {forecast.alerts!.slice(0, 2).map((alert, alertIndex) => (
                        <div
                          key={alertIndex}
                          className="text-xs p-2 rounded border-l-2 bg-muted/50"
                          style={{ borderLeftColor: `var(--${getAlertSeverityColor(alert.severity).replace('bg-', '')}-500)` }}
                        >
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-muted-foreground truncate">
                            {alert.description}
                          </div>
                        </div>
                      ))}
                      {forecast.alerts!.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{forecast.alerts!.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Elevation */}
                {forecast.routePoint.elevation !== undefined && (
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    Elevation: {Math.round(forecast.routePoint.elevation)}m
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scroll Hint */}
        {forecasts.length > 3 && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            {'\u2190'} Scroll horizontally to see all {forecasts.length} weather points {'\u2192'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

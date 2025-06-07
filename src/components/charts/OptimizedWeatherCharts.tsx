"use client";

import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Wind, Droplets, Gauge } from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPressure, formatPercentage } from '@/lib/format';
import { CHART_CONFIG } from '@/lib/constants';

// Lazy load Chart.js components for better performance
const LazyLineChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

const LazyBarChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Bar }))
);

// Chart loading skeleton
const ChartSkeleton = () => (
  <div className="h-64 w-full bg-muted animate-pulse rounded-md flex items-center justify-center">
    <BarChart3 className="h-8 w-8 text-muted-foreground" />
  </div>
);

interface OptimizedWeatherChartsProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  selectedPoint?: SelectedWeatherPoint | null;
}

export function OptimizedWeatherCharts({
  forecasts,
  units = 'metric',
  className,
  onPointSelect,
  selectedPoint
}: OptimizedWeatherChartsProps) {
  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return null;

    const labels = forecasts.map((forecast) =>
      `${forecast.routePoint.distance.toFixed(1)}km`
    );

    return {
      labels,
      temperature: {
        datasets: [
          {
            label: 'Temperature',
            data: forecasts.map(f => f.weather.temp),
            borderColor: CHART_CONFIG.COLORS.TEMPERATURE,
            backgroundColor: CHART_CONFIG.COLORS.TEMPERATURE + '20',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Feels Like',
            data: forecasts.map(f => f.weather.feels_like),
            borderColor: CHART_CONFIG.COLORS.TEMPERATURE + '80',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      precipitation: {
        datasets: [
          {
            label: 'Precipitation',
            data: forecasts.map(f => 
              (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0)
            ),
            backgroundColor: CHART_CONFIG.COLORS.PRECIPITATION,
            borderColor: CHART_CONFIG.COLORS.PRECIPITATION,
            borderWidth: 1,
          },
        ],
      },
      wind: {
        datasets: [
          {
            label: 'Wind Speed',
            data: forecasts.map(f => f.weather.wind_speed),
            borderColor: CHART_CONFIG.COLORS.WIND,
            backgroundColor: CHART_CONFIG.COLORS.WIND + '20',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      atmospheric: {
        datasets: [
          {
            label: 'Humidity (%)',
            data: forecasts.map(f => f.weather.humidity),
            borderColor: CHART_CONFIG.COLORS.HUMIDITY,
            backgroundColor: CHART_CONFIG.COLORS.HUMIDITY + '20',
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'Pressure (hPa)',
            data: forecasts.map(f => f.weather.pressure),
            borderColor: CHART_CONFIG.COLORS.PRESSURE,
            backgroundColor: CHART_CONFIG.COLORS.PRESSURE + '20',
            fill: false,
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
    };
  }, [forecasts]);

  // Memoize chart options for performance
  const getChartOptions = useCallback((chartType: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Distance (km)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getYAxisLabel(chartType),
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      ...(chartType === 'atmospheric' && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Pressure (hPa)',
            font: {
              size: 12,
              weight: 'bold' as const,
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      }),
    },
    animation: {
      duration: 0, // Disable animations for better performance
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onPointSelect) {
        const elementIndex = elements[0].index;
        onPointSelect(elementIndex, 'chart');
      }
    },
  }), [onPointSelect]);

  const getYAxisLabel = (chartType: string): string => {
    switch (chartType) {
      case 'temperature':
        return `Temperature (${units === 'metric' ? '°C' : '°F'})`;
      case 'precipitation':
        return `Precipitation (${units === 'metric' ? 'mm' : 'in'})`;
      case 'wind':
        return `Wind Speed (${units === 'metric' ? 'm/s' : 'mph'})`;
      case 'atmospheric':
        return 'Humidity (%)';
      default:
        return 'Value';
    }
  };

  // Calculate statistics for display
  const stats = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return null;

    return {
      temperature: {
        min: Math.min(...forecasts.map(f => f.weather.temp)),
        max: Math.max(...forecasts.map(f => f.weather.temp)),
        avg: forecasts.reduce((sum, f) => sum + f.weather.temp, 0) / forecasts.length,
      },
      precipitation: {
        total: forecasts.reduce((sum, f) => 
          sum + (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0), 0
        ),
        max: Math.max(...forecasts.map(f => 
          (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0)
        )),
      },
      wind: {
        max: Math.max(...forecasts.map(f => f.weather.wind_speed)),
        avg: forecasts.reduce((sum, f) => sum + f.weather.wind_speed, 0) / forecasts.length,
      },
    };
  }, [forecasts]);

  if (!chartData || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weather Charts
          </CardTitle>
          <CardDescription>
            Weather data visualization will appear here after generating forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No weather data available</p>
              <p className="text-sm">Upload a GPX file and generate forecasts to see charts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} id="weather-charts">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Optimized Weather Charts
            </CardTitle>
            <CardDescription>
              High-performance weather visualization with {forecasts.length} data points
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {forecasts.length} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="temperature" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Temperature</span>
              <span className="sm:hidden">Temp</span>
            </TabsTrigger>
            <TabsTrigger value="precipitation" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
              <Droplets className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Precipitation</span>
              <span className="sm:hidden">Rain</span>
            </TabsTrigger>
            <TabsTrigger value="wind" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
              <Wind className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Wind</span>
              <span className="sm:hidden">Wind</span>
            </TabsTrigger>
            <TabsTrigger value="atmospheric" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
              <Gauge className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Atmospheric</span>
              <span className="sm:hidden">Atm</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="space-y-4">
            <div className="h-64">
              <Suspense fallback={<ChartSkeleton />}>
                <LazyLineChart 
                  data={{ labels: chartData.labels, datasets: chartData.temperature.datasets }}
                  options={getChartOptions('temperature')}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Min Temp</p>
                <p className="font-semibold">{formatTemperature(stats.temperature.min, units)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Temp</p>
                <p className="font-semibold">{formatTemperature(stats.temperature.max, units)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Avg Temp</p>
                <p className="font-semibold">{formatTemperature(stats.temperature.avg, units)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="precipitation" className="space-y-4">
            <div className="h-64">
              <Suspense fallback={<ChartSkeleton />}>
                <LazyBarChart 
                  data={{ labels: chartData.labels, datasets: chartData.precipitation.datasets }}
                  options={getChartOptions('precipitation')}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Total Precipitation</p>
                <p className="font-semibold">{formatPrecipitation(stats.precipitation.total, units)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Hourly</p>
                <p className="font-semibold">{formatPrecipitation(stats.precipitation.max, units)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wind" className="space-y-4">
            <div className="h-64">
              <Suspense fallback={<ChartSkeleton />}>
                <LazyLineChart 
                  data={{ labels: chartData.labels, datasets: chartData.wind.datasets }}
                  options={getChartOptions('wind')}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Max Wind</p>
                <p className="font-semibold">{formatWindSpeed(stats.wind.max, units)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Avg Wind</p>
                <p className="font-semibold">{formatWindSpeed(stats.wind.avg, units)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="atmospheric" className="space-y-4">
            <div className="h-64">
              <Suspense fallback={<ChartSkeleton />}>
                <LazyLineChart 
                  data={{ labels: chartData.labels, datasets: chartData.atmospheric.datasets }}
                  options={getChartOptions('atmospheric')}
                />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

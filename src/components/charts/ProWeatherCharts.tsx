"use client";

import React, { useMemo, useCallback, lazy, Suspense, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  BarChart3, 
  TrendingUp, 
  Wind, 
  Droplets, 
  Gauge, 
  Maximize2, 
  Download, 
  Settings,
  Zap,
  Eye,
  Target,
  Activity
} from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPressure } from '@/lib/format';
import { CHART_CONFIG } from '@/lib/constants';
import { ChartDataExport } from './ChartDataExport';
import { WeatherAnalytics } from './WeatherAnalytics';

// Lazy load Chart.js components with advanced features
const LazyLineChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

const LazyBarChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Bar }))
);

const LazyScatterChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Scatter }))
);

// Professional loading skeleton with animation
const ProChartSkeleton = () => (
  <div className="h-80 w-full bg-gradient-to-br from-muted/50 to-muted/20 animate-pulse rounded-lg flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
    <div className="flex flex-col items-center gap-3">
      <Activity className="h-12 w-12 text-muted-foreground animate-pulse" />
      <div className="text-sm text-muted-foreground font-medium">Loading Professional Charts...</div>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
      </div>
    </div>
  </div>
);

interface ProWeatherChartsProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  selectedPoint?: SelectedWeatherPoint | null;
}

export function ProWeatherCharts({
  forecasts,
  units = 'metric',
  className,
  onPointSelect,
  selectedPoint
}: ProWeatherChartsProps) {
  // Professional chart settings
  const [showTrendlines, setShowTrendlines] = useState(true);
  const [showDataLabels, setShowDataLabels] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);
  const [chartHeight, setChartHeight] = useState([400]);
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [chartTheme, setChartTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [smoothing, setSmoothing] = useState([0.4]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // Professional color schemes
  const colorSchemes = {
    light: {
      temperature: '#ef4444',
      precipitation: '#3b82f6',
      wind: '#10b981',
      humidity: '#8b5cf6',
      pressure: '#f59e0b',
      background: 'rgba(255, 255, 255, 0.9)',
      grid: 'rgba(0, 0, 0, 0.1)',
      text: '#374151'
    },
    dark: {
      temperature: '#f87171',
      precipitation: '#60a5fa',
      wind: '#34d399',
      humidity: '#a78bfa',
      pressure: '#fbbf24',
      background: 'rgba(17, 24, 39, 0.9)',
      grid: 'rgba(255, 255, 255, 0.1)',
      text: '#d1d5db'
    }
  };

  const currentTheme = chartTheme === 'auto' 
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : chartTheme;

  const colors = colorSchemes[currentTheme];

  // Advanced chart data with professional styling
  const chartData = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return null;

    const labels = forecasts.map((forecast, index) =>
      `${forecast.routePoint.distance.toFixed(1)}km`
    );

    const baseDatasetConfig = {
      borderWidth: 3,
      pointRadius: showDataLabels ? 6 : 4,
      pointHoverRadius: 8,
      pointBorderWidth: 2,
      pointBorderColor: '#ffffff',
      tension: smoothing[0],
      fill: true,
      backgroundColor: (ctx: any) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
        gradient.addColorStop(0, colors.temperature + '40');
        gradient.addColorStop(1, colors.temperature + '10');
        return gradient;
      }
    };

    return {
      labels,
      temperature: {
        datasets: [
          {
            ...baseDatasetConfig,
            label: 'Temperature',
            data: forecasts.map(f => f.weather.temp),
            borderColor: colors.temperature,
            backgroundColor: (ctx: any) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              gradient.addColorStop(0, colors.temperature + '40');
              gradient.addColorStop(1, colors.temperature + '10');
              return gradient;
            },
          },
          ...(showTrendlines ? [{
            label: 'Feels Like',
            data: forecasts.map(f => f.weather.feels_like),
            borderColor: colors.temperature + '80',
            backgroundColor: 'transparent',
            borderDash: [8, 4],
            fill: false,
            tension: smoothing[0],
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
          }] : []),
        ],
      },
      precipitation: {
        datasets: [
          {
            label: 'Precipitation',
            data: forecasts.map(f => 
              (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0)
            ),
            backgroundColor: (ctx: any) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              gradient.addColorStop(0, colors.precipitation + '80');
              gradient.addColorStop(1, colors.precipitation + '20');
              return gradient;
            },
            borderColor: colors.precipitation,
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      wind: {
        datasets: [
          {
            ...baseDatasetConfig,
            label: 'Wind Speed',
            data: forecasts.map(f => f.weather.wind_speed),
            borderColor: colors.wind,
            backgroundColor: (ctx: any) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              gradient.addColorStop(0, colors.wind + '40');
              gradient.addColorStop(1, colors.wind + '10');
              return gradient;
            },
          },
          ...(showTrendlines ? [{
            label: 'Wind Gusts',
            data: forecasts.map(f => f.weather.wind_gust || f.weather.wind_speed * 1.3),
            borderColor: colors.wind + '60',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            tension: smoothing[0],
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2,
          }] : []),
        ],
      },
      atmospheric: {
        datasets: [
          {
            label: 'Humidity (%)',
            data: forecasts.map(f => f.weather.humidity),
            borderColor: colors.humidity,
            backgroundColor: colors.humidity + '20',
            fill: true,
            tension: smoothing[0],
            yAxisID: 'y',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
          },
          {
            label: 'Pressure (hPa)',
            data: forecasts.map(f => f.weather.pressure),
            borderColor: colors.pressure,
            backgroundColor: colors.pressure + '20',
            fill: false,
            tension: smoothing[0],
            yAxisID: 'y1',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
          },
        ],
      },
    };
  }, [forecasts, showTrendlines, smoothing, colors]);

  // Professional chart options with advanced features
  const getProChartOptions = useCallback((chartType: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 'normal' as const,
          },
          color: colors.text,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.grid,
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            const forecast = forecasts[index];
            return `${forecast.routePoint.distance.toFixed(1)}km`;
          },
          label: (context: any) => {
            const value = context.parsed.y;
            switch (chartType) {
              case 'temperature':
                return `${context.dataset.label}: ${formatTemperature(value, units)}`;
              case 'precipitation':
                return `${context.dataset.label}: ${formatPrecipitation(value, units)}`;
              case 'wind':
                return `${context.dataset.label}: ${formatWindSpeed(value, units)}`;
              case 'atmospheric':
                return context.datasetIndex === 0 
                  ? `${context.dataset.label}: ${value}%`
                  : `${context.dataset.label}: ${formatPressure(value)}`;
              default:
                return `${context.dataset.label}: ${value}`;
            }
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Distance (km)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: colors.text,
        },
        grid: {
          display: showGrid,
          color: colors.grid,
          lineWidth: 1,
        },
        ticks: {
          color: colors.text,
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getYAxisLabel(chartType),
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: colors.text,
        },
        grid: {
          display: showGrid,
          color: colors.grid,
          lineWidth: 1,
        },
        ticks: {
          color: colors.text,
          font: {
            size: 12,
          },
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
              size: 14,
              weight: 'bold' as const,
            },
            color: colors.text,
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: colors.text,
            font: {
              size: 12,
            },
          },
        },
      }),
    },
    // animation: showAnimations, // Disabled for TypeScript compatibility
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onPointSelect) {
        const elementIndex = elements[0].index;
        onPointSelect(elementIndex, 'chart');
      }
    },
  }), [onPointSelect, showGrid, showLegend, showAnimations, colors, units, forecasts]);

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

  // Professional statistics
  const stats = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return null;

    return {
      temperature: {
        min: Math.min(...forecasts.map(f => f.weather.temp)),
        max: Math.max(...forecasts.map(f => f.weather.temp)),
        avg: forecasts.reduce((sum, f) => sum + f.weather.temp, 0) / forecasts.length,
        range: Math.max(...forecasts.map(f => f.weather.temp)) - Math.min(...forecasts.map(f => f.weather.temp)),
      },
      precipitation: {
        total: forecasts.reduce((sum, f) => 
          sum + (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0), 0
        ),
        max: Math.max(...forecasts.map(f => 
          (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0)
        )),
        probability: forecasts.filter(f => 
          (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0) > 0
        ).length / forecasts.length * 100,
      },
      wind: {
        max: Math.max(...forecasts.map(f => f.weather.wind_speed)),
        avg: forecasts.reduce((sum, f) => sum + f.weather.wind_speed, 0) / forecasts.length,
        gustMax: Math.max(...forecasts.map(f => f.weather.wind_gust || f.weather.wind_speed)),
      },
    };
  }, [forecasts]);

  if (!chartData || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Professional Weather Charts
          </CardTitle>
          <CardDescription>
            Advanced weather data visualization will appear here after generating forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            <div className="text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No weather data available</p>
              <p className="text-sm">Upload a GPX file and generate forecasts to see professional charts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}`} id="pro-weather-charts">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Professional Weather Charts
              <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
                PRO
              </Badge>
            </CardTitle>
            <CardDescription>
              Advanced weather visualization with {forecasts.length} data points • Real-time analytics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {forecasts.length} points
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Professional Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Trendlines
            </label>
            <Switch checked={showTrendlines} onCheckedChange={setShowTrendlines} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <Target className="h-3 w-3" />
              Data Labels
            </label>
            <Switch checked={showDataLabels} onCheckedChange={setShowDataLabels} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Animations
            </label>
            <Switch checked={showAnimations} onCheckedChange={setShowAnimations} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Grid
            </label>
            <Switch checked={showGrid} onCheckedChange={setShowGrid} />
          </div>
        </div>

        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="temperature" className="flex items-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Temperature</span>
              <span className="sm:hidden">Temp</span>
            </TabsTrigger>
            <TabsTrigger value="precipitation" className="flex items-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
              <Droplets className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Precipitation</span>
              <span className="sm:hidden">Rain</span>
            </TabsTrigger>
            <TabsTrigger value="wind" className="flex items-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
              <Wind className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Wind</span>
              <span className="sm:hidden">Wind</span>
            </TabsTrigger>
            <TabsTrigger value="atmospheric" className="flex items-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
              <Gauge className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Atmospheric</span>
              <span className="sm:hidden">Atm</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="space-y-6">
            <div style={{ height: `${chartHeight[0]}px` }} ref={chartRef}>
              <Suspense fallback={<ProChartSkeleton />}>
                <LazyLineChart 
                  data={{ labels: chartData.labels, datasets: chartData.temperature.datasets }}
                  options={getProChartOptions('temperature')}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Min Temperature</p>
                <p className="font-bold text-lg">{formatTemperature(stats.temperature.min, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Max Temperature</p>
                <p className="font-bold text-lg">{formatTemperature(stats.temperature.max, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Average</p>
                <p className="font-bold text-lg">{formatTemperature(stats.temperature.avg, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Range</p>
                <p className="font-bold text-lg">{formatTemperature(stats.temperature.range, units)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="precipitation" className="space-y-6">
            <div style={{ height: `${chartHeight[0]}px` }}>
              <Suspense fallback={<ProChartSkeleton />}>
                <LazyBarChart 
                  data={{ labels: chartData.labels, datasets: chartData.precipitation.datasets }}
                  options={getProChartOptions('precipitation')}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Total Precipitation</p>
                <p className="font-bold text-lg">{formatPrecipitation(stats.precipitation.total, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Max Hourly</p>
                <p className="font-bold text-lg">{formatPrecipitation(stats.precipitation.max, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Rain Probability</p>
                <p className="font-bold text-lg">{stats.precipitation.probability.toFixed(0)}%</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wind" className="space-y-6">
            <div style={{ height: `${chartHeight[0]}px` }}>
              <Suspense fallback={<ProChartSkeleton />}>
                <LazyLineChart 
                  data={{ labels: chartData.labels, datasets: chartData.wind.datasets }}
                  options={getProChartOptions('wind')}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Max Wind</p>
                <p className="font-bold text-lg">{formatWindSpeed(stats.wind.max, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Average Wind</p>
                <p className="font-bold text-lg">{formatWindSpeed(stats.wind.avg, units)}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 rounded-lg">
                <p className="text-muted-foreground text-xs">Max Gusts</p>
                <p className="font-bold text-lg">{formatWindSpeed(stats.wind.gustMax, units)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="atmospheric" className="space-y-6">
            <div style={{ height: `${chartHeight[0]}px` }}>
              <Suspense fallback={<ProChartSkeleton />}>
                <LazyLineChart 
                  data={{ labels: chartData.labels, datasets: chartData.atmospheric.datasets }}
                  options={getProChartOptions('atmospheric')}
                />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>

        {/* Professional Chart Controls */}
        <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chart Height: {chartHeight[0]}px</label>
            <Slider
              value={chartHeight}
              onValueChange={setChartHeight}
              max={600}
              min={300}
              step={50}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Line Smoothing: {(smoothing[0] * 100).toFixed(0)}%</label>
            <Slider
              value={smoothing}
              onValueChange={setSmoothing}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        {/* Advanced Professional Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Export */}
          <ChartDataExport
            forecasts={forecasts}
            units={units}
            chartRef={chartRef}
          />

          {/* Weather Analytics */}
          <WeatherAnalytics
            forecasts={forecasts}
            units={units}
          />
        </div>
      </CardContent>
    </Card>
  );
}

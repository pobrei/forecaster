"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Wind, Droplets, Gauge } from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPressure, formatPercentage } from '@/lib/format';
import { CHART_CONFIG } from '@/lib/constants';
// Dynamic imports for Chart.js to reduce initial bundle size
import dynamic from 'next/dynamic';

// Lazy load Chart.js components
const LazyLineChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })), {
  loading: () => <div className="h-64 w-full bg-muted animate-pulse rounded" />,
  ssr: false,
});

const LazyBarChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })), {
  loading: () => <div className="h-64 w-full bg-muted animate-pulse rounded" />,
  ssr: false,
});

// Chart.js registration - only load when needed
let chartJSRegistered = false;
const registerChartJS = async () => {
  if (chartJSRegistered) return;

  const chartModule = await import('chart.js');
  const {
    Chart: ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  } = chartModule;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );

  chartJSRegistered = true;
};

interface WeatherChartsProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  selectedPoint?: SelectedWeatherPoint | null;
}

export function WeatherCharts({
  forecasts,
  units = 'metric',
  className,
  onPointSelect
}: WeatherChartsProps) {
  // Register Chart.js when component mounts
  React.useEffect(() => {
    registerChartJS();
  }, []);
  if (!forecasts || forecasts.length === 0) {
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

  // Prepare data for charts
  const labels = forecasts.map((forecast) =>
    `${forecast.routePoint.distance.toFixed(1)}km`
  );

  const temperatureData = {
    labels,
    datasets: [
      {
        label: 'Temperature',
        data: forecasts.map(f => f.weather.temp),
        borderColor: CHART_CONFIG.COLORS.TEMPERATURE,
        backgroundColor: CHART_CONFIG.COLORS.TEMPERATURE + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Feels Like',
        data: forecasts.map(f => f.weather.feels_like),
        borderColor: CHART_CONFIG.COLORS.TEMPERATURE + '80',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const precipitationData = {
    labels,
    datasets: [
      {
        label: 'Precipitation',
        data: forecasts.map(f => f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0),
        backgroundColor: CHART_CONFIG.COLORS.PRECIPITATION,
        borderColor: CHART_CONFIG.COLORS.PRECIPITATION,
        borderWidth: 1,
      },
    ],
  };

  const windData = {
    labels,
    datasets: [
      {
        label: 'Wind Speed',
        data: forecasts.map(f => f.weather.wind_speed),
        borderColor: CHART_CONFIG.COLORS.WIND,
        backgroundColor: CHART_CONFIG.COLORS.WIND + '20',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const atmosphericData = {
    labels,
    datasets: [
      {
        label: 'Humidity (%)',
        data: forecasts.map(f => f.weather.humidity),
        borderColor: CHART_CONFIG.COLORS.HUMIDITY,
        backgroundColor: 'transparent',
        yAxisID: 'y',
      },
      {
        label: 'Pressure (hPa)',
        data: forecasts.map(f => f.weather.pressure),
        borderColor: CHART_CONFIG.COLORS.PRESSURE,
        backgroundColor: 'transparent',
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Distance',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value',
        },
      },
    },
    animation: {
      duration: 0, // Disable animations to reduce canvas reads
    },
    onClick: (event: unknown, elements: unknown[]) => {
      if (elements.length > 0 && onPointSelect) {
        const elementIndex = (elements[0] as { index: number }).index;
        onPointSelect(elementIndex, 'chart');
      }
    },
    onHover: (event: unknown, elements: unknown[]) => {
      const nativeEvent = event as { native: { target: { style: { cursor: string } } } };
      nativeEvent.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };

  const atmosphericOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Humidity (%)',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Pressure (hPa)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <Card className={className} id="weather-charts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weather Charts
        </CardTitle>
        <CardDescription>
          Detailed weather data visualization along your route
        </CardDescription>
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
              <span>Wind</span>
            </TabsTrigger>
            <TabsTrigger value="atmospheric" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm">
              <Gauge className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Atmospheric</span>
              <span className="sm:hidden">Atmo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="space-y-4">
            <div className="h-64">
              <LazyLineChart data={temperatureData} options={chartOptions} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Min Temp</p>
                <p className="font-semibold">
                  {formatTemperature(Math.min(...forecasts.map(f => f.weather.temp)), units)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Temp</p>
                <p className="font-semibold">
                  {formatTemperature(Math.max(...forecasts.map(f => f.weather.temp)), units)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Avg Temp</p>
                <p className="font-semibold">
                  {formatTemperature(
                    forecasts.reduce((sum, f) => sum + f.weather.temp, 0) / forecasts.length,
                    units
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Range</p>
                <p className="font-semibold">
                  {(Math.max(...forecasts.map(f => f.weather.temp)) - 
                    Math.min(...forecasts.map(f => f.weather.temp))).toFixed(1)}°
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="precipitation" className="space-y-4">
            <div className="h-64">
              <LazyBarChart data={precipitationData} options={chartOptions} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Total Precipitation</p>
                <p className="font-semibold">
                  {formatPrecipitation(
                    forecasts.reduce((sum, f) => 
                      sum + (f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0), 0
                    ),
                    units
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Hourly</p>
                <p className="font-semibold">
                  {formatPrecipitation(
                    Math.max(...forecasts.map(f => 
                      f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0
                    )),
                    units
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Rainy Points</p>
                <p className="font-semibold">
                  {forecasts.filter(f => 
                    (f.weather.rain?.['1h'] || 0) > 0 || (f.weather.snow?.['1h'] || 0) > 0
                  ).length} / {forecasts.length}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wind" className="space-y-4">
            <div className="h-64">
              <LazyLineChart data={windData} options={chartOptions} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Min Wind</p>
                <p className="font-semibold">
                  {formatWindSpeed(Math.min(...forecasts.map(f => f.weather.wind_speed)), units)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Wind</p>
                <p className="font-semibold">
                  {formatWindSpeed(Math.max(...forecasts.map(f => f.weather.wind_speed)), units)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Avg Wind</p>
                <p className="font-semibold">
                  {formatWindSpeed(
                    forecasts.reduce((sum, f) => sum + f.weather.wind_speed, 0) / forecasts.length,
                    units
                  )}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="atmospheric" className="space-y-4">
            <div className="h-64">
              <LazyLineChart data={atmosphericData} options={atmosphericOptions} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Min Humidity</p>
                <p className="font-semibold">
                  {formatPercentage(Math.min(...forecasts.map(f => f.weather.humidity)))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Humidity</p>
                <p className="font-semibold">
                  {formatPercentage(Math.max(...forecasts.map(f => f.weather.humidity)))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Min Pressure</p>
                <p className="font-semibold">
                  {formatPressure(Math.min(...forecasts.map(f => f.weather.pressure)), units)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Max Pressure</p>
                <p className="font-semibold">
                  {formatPressure(Math.max(...forecasts.map(f => f.weather.pressure)), units)}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

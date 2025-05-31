"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Wind, Droplets, Gauge } from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPressure, formatPercentage } from '@/lib/format';
import { CHART_CONFIG } from '@/lib/constants';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
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
  onPointSelect,
  selectedPoint
}: WeatherChartsProps) {
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
      duration: CHART_CONFIG.ANIMATION_DURATION,
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onPointSelect) {
        const elementIndex = elements[0].index;
        onPointSelect(elementIndex, 'chart');
      }
    },
    onHover: (event: any, elements: any[]) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
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
    <Card className={className}>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="temperature" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Temperature
            </TabsTrigger>
            <TabsTrigger value="precipitation" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Precipitation
            </TabsTrigger>
            <TabsTrigger value="wind" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Wind
            </TabsTrigger>
            <TabsTrigger value="atmospheric" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Atmospheric
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="space-y-4">
            <div className="h-64">
              <Line data={temperatureData} options={chartOptions} />
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
              <Bar data={precipitationData} options={chartOptions} />
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
              <Line data={windData} options={chartOptions} />
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
              <Line data={atmosphericData} options={atmosphericOptions} />
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

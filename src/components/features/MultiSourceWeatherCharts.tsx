"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Wind, Droplets, Layers } from 'lucide-react';
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
import { Line } from 'react-chartjs-2';
import {
  MultiSourceWeatherForecast,
  WeatherProviderId,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';

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

interface MultiSourceWeatherChartsProps {
  forecasts: MultiSourceWeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  showComparison?: boolean;
}

export function MultiSourceWeatherCharts({
  forecasts,
  units = 'metric',
  className,
  showComparison = true,
}: MultiSourceWeatherChartsProps) {
  // Get all unique providers from forecasts
  const providers = useMemo(() => {
    const providerSet = new Set<WeatherProviderId>();
    forecasts.forEach(f => {
      f.multiSourceData.sources.forEach(s => providerSet.add(s.source));
    });
    return Array.from(providerSet);
  }, [forecasts]);

  // Prepare chart data
  const labels = forecasts.map(f => `${f.routePoint.distance.toFixed(1)}km`);

  const createMultiSourceDataset = (
    getValue: (source: { temp: number; humidity: number; wind_speed: number }) => number,
    label: string
  ) => {
    return providers.map(providerId => {
      const config = WEATHER_PROVIDERS[providerId];
      const data = forecasts.map(f => {
        const source = f.multiSourceData.sources.find(s => s.source === providerId);
        return source ? getValue(source) : null;
      });

      return {
        label: `${label} (${config.name})`,
        data,
        borderColor: config.color,
        backgroundColor: `${config.color}20`,
        fill: false,
        tension: 0.4,
        spanGaps: true,
      };
    });
  };

  const temperatureData = {
    labels,
    datasets: showComparison && providers.length > 1
      ? createMultiSourceDataset(s => s.temp, 'Temperature')
      : [{
          label: 'Temperature',
          data: forecasts.map(f => f.primaryWeather.temp),
          borderColor: CHART_CONFIG.COLORS.TEMPERATURE,
          backgroundColor: `${CHART_CONFIG.COLORS.TEMPERATURE}20`,
          fill: true,
          tension: 0.4,
        }],
  };

  const windData = {
    labels,
    datasets: showComparison && providers.length > 1
      ? createMultiSourceDataset(s => s.wind_speed, 'Wind')
      : [{
          label: 'Wind Speed',
          data: forecasts.map(f => f.primaryWeather.wind_speed),
          borderColor: CHART_CONFIG.COLORS.WIND,
          backgroundColor: `${CHART_CONFIG.COLORS.WIND}20`,
          fill: true,
          tension: 0.4,
        }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: { display: true, title: { display: true, text: 'Distance' } },
      y: { display: true },
    },
    animation: { duration: 0 },
  };

  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Multi-Source Weather Charts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No weather data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Multi-Source Weather Charts
            </CardTitle>
            <CardDescription>
              Compare weather data from multiple providers
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {providers.map(id => (
              <Badge
                key={id}
                variant="outline"
                style={{ borderColor: WEATHER_PROVIDERS[id].color }}
              >
                {WEATHER_PROVIDERS[id].name}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="temperature" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Temperature
            </TabsTrigger>
            <TabsTrigger value="wind" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Wind
            </TabsTrigger>
          </TabsList>
          <TabsContent value="temperature">
            <div className="h-64">
              <Line data={temperatureData} options={chartOptions} />
            </div>
          </TabsContent>
          <TabsContent value="wind">
            <div className="h-64">
              <Line data={windData} options={chartOptions} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default MultiSourceWeatherCharts;

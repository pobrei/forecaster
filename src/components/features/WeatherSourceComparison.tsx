"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Thermometer, Droplets, Wind, Cloud } from 'lucide-react';
import { MultiSourceWeatherForecast, WeatherProviderId, WEATHER_PROVIDERS } from '@/types/weather-sources';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPercentage } from '@/lib/format';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Colors for each provider
const PROVIDER_COLORS: Record<WeatherProviderId, { line: string; fill: string }> = {
  'open-meteo': { line: 'rgb(16, 185, 129)', fill: 'rgba(16, 185, 129, 0.1)' },
  'weatherapi': { line: 'rgb(59, 130, 246)', fill: 'rgba(59, 130, 246, 0.1)' },
  'visual-crossing': { line: 'rgb(147, 51, 234)', fill: 'rgba(147, 51, 234, 0.1)' },
  'openweathermap': { line: 'rgb(249, 115, 22)', fill: 'rgba(249, 115, 22, 0.1)' },
};

interface WeatherSourceComparisonProps {
  forecasts: MultiSourceWeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
}

type MetricType = 'temperature' | 'humidity' | 'wind' | 'precipitation';

export function WeatherSourceComparison({
  forecasts,
  units = 'metric',
  className,
}: WeatherSourceComparisonProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('temperature');

  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Source Comparison
          </CardTitle>
          <CardDescription>Compare weather data from different sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comparison data available</p>
              <p className="text-sm">Enable comparison mode and generate forecasts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get all unique sources from forecasts
  const allSources = new Set<WeatherProviderId>();
  forecasts.forEach(f => f.multiSourceData.sources.forEach(s => allSources.add(s.source)));
  const sources = Array.from(allSources);

  // Prepare labels (distance points)
  const labels = forecasts.map(f => `${f.routePoint.distance.toFixed(1)}km`);

  // Build datasets based on metric
  const getDataForMetric = (metric: MetricType) => {
    return sources.map(source => {
      const data = forecasts.map(f => {
        const sourceData = f.multiSourceData.sources.find(s => s.source === source);
        if (!sourceData) return null;
        switch (metric) {
          case 'temperature': return sourceData.temp;
          case 'humidity': return sourceData.humidity;
          case 'wind': return sourceData.wind_speed;
          case 'precipitation': return sourceData.rain?.['1h'] || sourceData.snow?.['1h'] || 0;
          default: return null;
        }
      });

      return {
        label: WEATHER_PROVIDERS[source]?.name || source,
        data,
        borderColor: PROVIDER_COLORS[source].line,
        backgroundColor: PROVIDER_COLORS[source].fill,
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        spanGaps: true,
      };
    });
  };

  const chartData = {
    labels,
    datasets: getDataForMetric(activeMetric),
  };

  const getYAxisLabel = () => {
    switch (activeMetric) {
      case 'temperature': return units === 'metric' ? '°C' : '°F';
      case 'humidity': return '%';
      case 'wind': return units === 'metric' ? 'm/s' : 'mph';
      case 'precipitation': return 'mm';
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const val = ctx.parsed.y;
            if (val === null) return `${ctx.dataset.label}: N/A`;
            switch (activeMetric) {
              case 'temperature': return `${ctx.dataset.label}: ${formatTemperature(val, units)}`;
              case 'humidity': return `${ctx.dataset.label}: ${formatPercentage(val)}`;
              case 'wind': return `${ctx.dataset.label}: ${formatWindSpeed(val, units)}`;
              case 'precipitation': return `${ctx.dataset.label}: ${formatPrecipitation(val)}`;
            }
          },
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: getYAxisLabel() },
        beginAtZero: activeMetric !== 'temperature',
      },
      x: { title: { display: true, text: 'Distance' } },
    },
  };

  const MetricIcon = {
    temperature: Thermometer,
    humidity: Droplets,
    wind: Wind,
    precipitation: Cloud,
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Weather Source Comparison
        </CardTitle>
        <CardDescription className="space-y-2">
          <span>Comparing {sources.length} weather sources across {forecasts.length} route points</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {sources.map(source => (
              <span
                key={source}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: PROVIDER_COLORS[source].fill, color: PROVIDER_COLORS[source].line }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[source].line }} />
                {WEATHER_PROVIDERS[source]?.name || source}
              </span>
            ))}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as MetricType)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            {(['temperature', 'humidity', 'wind', 'precipitation'] as MetricType[]).map(metric => {
              const Icon = MetricIcon[metric];
              return (
                <TabsTrigger key={metric} value={metric} className="flex items-center gap-1">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline capitalize">{metric}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value={activeMetric} className="h-80">
            <Line data={chartData} options={chartOptions} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default WeatherSourceComparison;


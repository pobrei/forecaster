"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Wind, Droplets, Gauge } from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPressure, formatPercentage } from '@/lib/format';
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
  onPointSelect
}: WeatherChartsProps) {
  if (!forecasts || forecasts.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-6 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)}>
        <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#F5F2EB]">
          <BarChart3 className="h-4 w-4 text-[#E5A93C]" />
          <span>WEATHER CHARTS</span>
        </div>
        <p className="text-[#A89F91] text-xs mb-6">
          Atmospheric profile curves will render once forecasts are generated
        </p>
        <div className="flex items-center justify-center h-36 text-[#A89F91] border border-dashed border-[#453A2E] rounded-xl">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-40 text-[#E5A93C]" />
            <p className="text-xs">NO METEOROLOGICAL TELEMETRY</p>
            <p className="text-[10px] text-[#A89F91]/70">Ingest a GPX track and synthesize multi-model forecast</p>
          </div>
        </div>
      </div>
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
        label: 'Air Temp',
        data: forecasts.map(f => f.weather.temp),
        borderColor: '#E5A93C',
        backgroundColor: 'rgba(229, 169, 60, 0.15)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Feels Like',
        data: forecasts.map(f => f.weather.feels_like),
        borderColor: '#F5F2EB',
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
        label: 'Precipitation (mm/h)',
        data: forecasts.map(f => f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0),
        backgroundColor: 'rgba(130, 147, 125, 0.5)',
        borderColor: '#82937D',
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
        borderColor: '#82937D',
        backgroundColor: 'rgba(130, 147, 125, 0.15)',
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
        borderColor: '#A89F91',
        backgroundColor: 'transparent',
        yAxisID: 'y',
      },
      {
        label: 'Pressure (hPa)',
        data: forecasts.map(f => f.weather.pressure),
        borderColor: '#E5A93C',
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
        labels: {
          color: '#F5F2EB',
          font: { family: 'monospace', size: 11 },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(28, 24, 20, 0.95)',
        borderColor: '#453A2E',
        borderWidth: 1,
        titleColor: '#E5A93C',
        bodyColor: '#F5F2EB',
      },
    },
    scales: {
      x: {
        display: true,
        grid: { color: 'rgba(69, 58, 46, 0.35)' },
        ticks: { color: '#A89F91', font: { family: 'monospace', size: 10 } },
        title: {
          display: true,
          text: 'Distance',
          color: '#A89F91',
          font: { family: 'monospace', size: 10 },
        },
      },
      y: {
        display: true,
        grid: { color: 'rgba(69, 58, 46, 0.35)' },
        ticks: { color: '#A89F91', font: { family: 'monospace', size: 10 } },
        title: {
          display: true,
          text: 'Value',
          color: '#A89F91',
          font: { family: 'monospace', size: 10 },
        },
      },
    },
    animation: {
      duration: 0,
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
        grid: { color: 'rgba(69, 58, 46, 0.35)' },
        ticks: { color: '#A89F91', font: { family: 'monospace', size: 10 } },
        title: {
          display: true,
          text: 'Humidity (%)',
          color: '#A89F91',
          font: { family: 'monospace', size: 10 },
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: { color: '#E5A93C', font: { family: 'monospace', size: 10 } },
        title: {
          display: true,
          text: 'Pressure (hPa)',
          color: '#E5A93C',
          font: { family: 'monospace', size: 10 },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-5 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)} id="weather-charts">
      <div className="flex items-center justify-between mb-4 border-b border-[#453A2E]/70 pb-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm tracking-wider text-[#F5F2EB]">
            <BarChart3 className="h-4 w-4 text-[#E5A93C]" />
            <span>METEOROLOGICAL TELEMETRY CHARTS</span>
          </div>
          <p className="text-[11px] text-[#A89F91] mt-1">
            Synoptic cross-sections of temperature, gusts, barometry, and precipitation
          </p>
        </div>
      </div>

      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-[#1C1814] border border-[#453A2E] rounded-xl mb-4">
          <TabsTrigger
            value="temperature"
            className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
          >
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden sm:inline">Temperature</span>
            <span className="sm:hidden">Temp</span>
          </TabsTrigger>
          <TabsTrigger
            value="precipitation"
            className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
          >
            <Droplets className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden sm:inline">Precipitation</span>
            <span className="sm:hidden">Rain</span>
          </TabsTrigger>
          <TabsTrigger
            value="wind"
            className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
          >
            <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span>Wind</span>
          </TabsTrigger>
          <TabsTrigger
            value="atmospheric"
            className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
          >
            <Gauge className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden sm:inline">Atmospheric</span>
            <span className="sm:hidden">Atmo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="temperature" className="space-y-4">
          <div className="h-64 p-2 bg-[#1C1814] rounded-xl border border-[#453A2E]/60">
            <Line data={temperatureData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Min Temp</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {formatTemperature(Math.min(...forecasts.map(f => f.weather.temp)), units)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Max Temp</p>
              <p className="font-bold text-[#E5A93C] text-sm mt-0.5">
                {formatTemperature(Math.max(...forecasts.map(f => f.weather.temp)), units)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Avg Temp</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {formatTemperature(
                  forecasts.reduce((sum, f) => sum + f.weather.temp, 0) / forecasts.length,
                  units
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Range</p>
              <p className="font-bold text-[#82937D] text-sm mt-0.5">
                {(Math.max(...forecasts.map(f => f.weather.temp)) - 
                  Math.min(...forecasts.map(f => f.weather.temp))).toFixed(1)}°
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="precipitation" className="space-y-4">
          <div className="h-64 p-2 bg-[#1C1814] rounded-xl border border-[#453A2E]/60">
            <Bar data={precipitationData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Total Precipitation</p>
              <p className="font-bold text-[#82937D] text-sm mt-0.5">
                {formatPrecipitation(
                  forecasts.reduce((sum, f) => 
                    sum + (f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0), 0
                  ),
                  units
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Max Hourly</p>
              <p className="font-bold text-[#E5A93C] text-sm mt-0.5">
                {formatPrecipitation(
                  Math.max(...forecasts.map(f => 
                    f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0
                  )),
                  units
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Precip Waypoints</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {forecasts.filter(f => 
                  (f.weather.rain?.['1h'] || 0) > 0 || (f.weather.snow?.['1h'] || 0) > 0
                ).length} / {forecasts.length}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wind" className="space-y-4">
          <div className="h-64 p-2 bg-[#1C1814] rounded-xl border border-[#453A2E]/60">
            <Line data={windData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Min Wind</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {formatWindSpeed(Math.min(...forecasts.map(f => f.weather.wind_speed)), units)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Max Wind</p>
              <p className="font-bold text-[#82937D] text-sm mt-0.5">
                {formatWindSpeed(Math.max(...forecasts.map(f => f.weather.wind_speed)), units)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Avg Wind</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {formatWindSpeed(
                  forecasts.reduce((sum, f) => sum + f.weather.wind_speed, 0) / forecasts.length,
                  units
                )}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="atmospheric" className="space-y-4">
          <div className="h-64 p-2 bg-[#1C1814] rounded-xl border border-[#453A2E]/60">
            <Line data={atmosphericData} options={atmosphericOptions} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Min Humidity</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {formatPercentage(Math.min(...forecasts.map(f => f.weather.humidity)))}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Max Humidity</p>
              <p className="font-bold text-[#F5F2EB] text-sm mt-0.5">
                {formatPercentage(Math.max(...forecasts.map(f => f.weather.humidity)))}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Min Pressure</p>
              <p className="font-bold text-[#E5A93C] text-sm mt-0.5">
                {formatPressure(Math.min(...forecasts.map(f => f.weather.pressure)), units)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
              <p className="text-[#A89F91] text-[10px] uppercase">Max Pressure</p>
              <p className="font-bold text-[#E5A93C] text-sm mt-0.5">
                {formatPressure(Math.max(...forecasts.map(f => f.weather.pressure)), units)}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

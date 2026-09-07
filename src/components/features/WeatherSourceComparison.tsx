"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Layers,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Cloud,
  Gauge,
  AlertTriangle,
  Table,
  LineChart as LineChartIcon,
  SlidersHorizontal,
} from 'lucide-react';
import {
  MultiSourceWeatherForecast,
  WeatherProviderId,
  WEATHER_PROVIDERS,
  ModelDivergenceAlert,
} from '@/types/weather-sources';
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  formatPercentage,
  formatPressure
} from '@/lib/format';
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
  ChartData,
  ChartDataset,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface WeatherSourceComparisonProps {
  forecasts: MultiSourceWeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  selectedPointIndex?: number | null;
}

type MetricType = 'temperature' | 'precipitation' | 'wind' | 'humidity' | 'clouds' | 'pressure';

export function WeatherSourceComparison({
  forecasts = [],
  units = 'metric',
  className,
  onPointSelect,
  selectedPointIndex,
}: WeatherSourceComparisonProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('temperature');
  const [showConsensusBand, setShowConsensusBand] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [manualInspectorIndex, setManualInspectorIndex] = useState<number | null>(null);

  const activeInspectorIndex = (selectedPointIndex !== undefined && selectedPointIndex !== null && selectedPointIndex >= 0)
    ? selectedPointIndex
    : (manualInspectorIndex ?? 0);

  // Extract all unique sources present in the forecast set
  const allSources = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return [];
    const set = new Set<WeatherProviderId>();
    forecasts.forEach(f => f.multiSourceData.sources.forEach(s => set.add(s.source)));
    return Array.from(set);
  }, [forecasts]);

  // Aggregate divergence alerts across the entire route
  const aggregatedDivergence = useMemo(() => {
    if (!forecasts || forecasts.length === 0) {
      return { averageAgreement: 100, alerts: [] };
    }

    const alerts: ModelDivergenceAlert[] = [];
    let totalScore = 0;

    forecasts.forEach(f => {
      if (f.sourceComparison?.agreementScore !== undefined) {
        totalScore += f.sourceComparison.agreementScore;
      }
      if (f.sourceComparison?.divergenceAlerts) {
        alerts.push(...f.sourceComparison.divergenceAlerts);
      }
    });

    const averageAgreement = Math.round(totalScore / forecasts.length);
    const uniqueAlerts = alerts.filter((alert, idx, self) =>
      idx === self.findIndex(a => a.type === alert.type && Math.abs(a.distanceKm - alert.distanceKm) < 5)
    );

    return {
      averageAgreement,
      alerts: uniqueAlerts.slice(0, 4),
    };
  }, [forecasts]);

  // Model Summary Matrix (Min/Max Temp, Rain Points, Max Wind per model)
  const modelSummaries = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return [];

    return allSources.map(sourceId => {
      const config = WEATHER_PROVIDERS[sourceId];
      let minTemp = Infinity;
      let maxTemp = -Infinity;
      let rainPoints = 0;
      let maxRain = 0;
      let maxWind = 0;

      forecasts.forEach(f => {
        const sData = f.multiSourceData.sources.find(s => s.source === sourceId);
        if (sData) {
          minTemp = Math.min(minTemp, sData.temp);
          maxTemp = Math.max(maxTemp, sData.temp);
          const r = (sData.rain?.['1h'] || sData.snow?.['1h'] || 0);
          if (r > 0.1) rainPoints++;
          maxRain = Math.max(maxRain, r);
          maxWind = Math.max(maxWind, sData.wind_speed);
        }
      });

      return {
        id: sourceId,
        name: config?.name || sourceId,
        origin: config?.origin || '',
        color: config?.color || '#3b82f6',
        minTemp: minTemp === Infinity ? 0 : minTemp,
        maxTemp: maxTemp === -Infinity ? 0 : maxTemp,
        rainPoints,
        maxRain,
        maxWind,
      };
    });
  }, [allSources, forecasts]);

  // Prepare chart labels (distance points)
  const labels = useMemo(() => {
    return forecasts.map(f => `${f.routePoint.distance.toFixed(1)}km`);
  }, [forecasts]);

  // Build chart datasets
  const chartData: ChartData<'line'> = useMemo(() => {
    if (!forecasts || forecasts.length === 0) {
      return { labels: [], datasets: [] };
    }

    const datasets: ChartDataset<'line'>[] = [];

    // Optional Consensus Ensemble shaded band (Min and Max spread envelope)
    if (showConsensusBand && allSources.length > 1) {
      const minValues = forecasts.map(f => {
        const vals = f.multiSourceData.sources.map(s => {
          switch (activeMetric) {
            case 'temperature': return s.temp;
            case 'precipitation': return (s.rain?.['1h'] || s.snow?.['1h'] || 0);
            case 'wind': return s.wind_speed;
            case 'humidity': return s.humidity;
            case 'clouds': return s.clouds;
            case 'pressure': return s.pressure;
          }
        });
        return Math.min(...vals);
      });

      const maxValues = forecasts.map(f => {
        const vals = f.multiSourceData.sources.map(s => {
          switch (activeMetric) {
            case 'temperature': return s.temp;
            case 'precipitation': return (s.rain?.['1h'] || s.snow?.['1h'] || 0);
            case 'wind': return s.wind_speed;
            case 'humidity': return s.humidity;
            case 'clouds': return s.clouds;
            case 'pressure': return s.pressure;
          }
        });
        return Math.max(...vals);
      });

      datasets.push({
        label: 'Model Spread Max',
        data: maxValues,
        borderColor: 'transparent',
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
      });

      datasets.push({
        label: 'Model Spread Min',
        data: minValues,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      });
    }

    // Individual model lines
    allSources.forEach(sourceId => {
      const config = WEATHER_PROVIDERS[sourceId];
      const color = config?.color || '#3b82f6';

      const data = forecasts.map(f => {
        const sData = f.multiSourceData.sources.find(s => s.source === sourceId);
        if (!sData) return null;
        switch (activeMetric) {
          case 'temperature': return sData.temp;
          case 'precipitation': return (sData.rain?.['1h'] || sData.snow?.['1h'] || 0);
          case 'wind': return sData.wind_speed;
          case 'humidity': return sData.humidity;
          case 'clouds': return sData.clouds;
          case 'pressure': return sData.pressure;
        }
      });

      datasets.push({
        label: `${config?.name || sourceId} (${config?.origin || ''})`,
        data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2.2,
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        spanGaps: true,
      });
    });

    return { labels, datasets };
  }, [allSources, forecasts, activeMetric, showConsensusBand, labels]);

  const getYAxisLabel = () => {
    switch (activeMetric) {
      case 'temperature': return units === 'metric' ? '°C' : '°F';
      case 'precipitation': return 'mm';
      case 'wind': return units === 'metric' ? 'm/s' : 'mph';
      case 'humidity': return '%';
      case 'clouds': return '%';
      case 'pressure': return 'hPa';
    }
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onClick: (_event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setManualInspectorIndex(index);
        onPointSelect?.(index, 'chart');
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          filter: (item) => !item.text.includes('Model Spread'),
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            if (val === null || ctx.dataset.label?.includes('Model Spread')) return '';
            switch (activeMetric) {
              case 'temperature': return `${ctx.dataset.label}: ${formatTemperature(val, units)}`;
              case 'precipitation': return `${ctx.dataset.label}: ${formatPrecipitation(val)}`;
              case 'wind': return `${ctx.dataset.label}: ${formatWindSpeed(val, units)}`;
              case 'humidity': return `${ctx.dataset.label}: ${formatPercentage(val)}`;
              case 'clouds': return `${ctx.dataset.label}: ${formatPercentage(val)}`;
              case 'pressure': return `${ctx.dataset.label}: ${formatPressure(val)}`;
            }
          },
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: getYAxisLabel(), font: { size: 12, weight: 'bold' } },
        beginAtZero: activeMetric === 'precipitation' || activeMetric === 'clouds',
        grid: { color: 'rgba(156, 163, 175, 0.15)' },
      },
      x: {
        title: { display: true, text: 'Route Distance', font: { size: 12, weight: 'bold' } },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
    },
  };

  // Safe early return if no forecast data
  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Weather Source & Model Comparison
          </CardTitle>
          <CardDescription>Compare weather predictions from multiple global models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-40 text-primary" />
              <p className="font-medium">No comparison data available</p>
              <p className="text-sm mt-1">Select comparison mode and generate weather to view model divergence</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentInspectorPoint = forecasts[activeInspectorIndex] || forecasts[0];

  return (
    <Card className={cn("shadow-sm overflow-hidden", className)}>
      <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Multi-Model Weather Comparison
              </CardTitle>
              <Badge
                variant={aggregatedDivergence.averageAgreement >= 80 ? "default" : "secondary"}
                className="text-xs"
              >
                {aggregatedDivergence.averageAgreement}% Agreement
              </Badge>
            </div>
            <CardDescription className="mt-1">
              Cross-analyzing {allSources.length} global forecasting models across {forecasts.length} route checkpoints
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5 bg-background">
              <Button
                variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode('chart')}
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode('table')}
              >
                <Table className="h-3.5 w-3.5" />
                Matrix
              </Button>
            </div>
          </div>
        </div>

        {/* Model badges row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3">
          {allSources.map(sourceId => {
            const config = WEATHER_PROVIDERS[sourceId];
            return (
              <span
                key={sourceId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-background/80 shadow-2xs"
                style={{ borderColor: config?.color + '60' }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config?.color }} />
                <span>{config?.name || sourceId}</span>
                <span className="text-[10px] text-muted-foreground">{config?.origin}</span>
              </span>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Model Divergence & Risk Alert Banner */}
        {aggregatedDivergence.alerts.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Model Divergence Detected Along Route</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {aggregatedDivergence.alerts.map((alert, i) => (
                <div key={i} className="p-2 rounded bg-background/70 border border-border/50">
                  <div className="font-medium text-foreground flex items-center justify-between">
                    <span>{alert.title}</span>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-[10px] h-4">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'chart' ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              {/* Metric Tabs */}
              <Tabs
                value={activeMetric}
                onValueChange={(v) => setActiveMetric(v as MetricType)}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-9 p-0.5">
                  <TabsTrigger value="temperature" className="text-xs gap-1">
                    <Thermometer className="h-3.5 w-3.5" />
                    Temp
                  </TabsTrigger>
                  <TabsTrigger value="precipitation" className="text-xs gap-1">
                    <CloudRain className="h-3.5 w-3.5" />
                    Rain
                  </TabsTrigger>
                  <TabsTrigger value="wind" className="text-xs gap-1">
                    <Wind className="h-3.5 w-3.5" />
                    Wind
                  </TabsTrigger>
                  <TabsTrigger value="humidity" className="text-xs gap-1">
                    <Droplets className="h-3.5 w-3.5" />
                    Humidity
                  </TabsTrigger>
                  <TabsTrigger value="clouds" className="text-xs gap-1">
                    <Cloud className="h-3.5 w-3.5" />
                    Cloud
                  </TabsTrigger>
                  <TabsTrigger value="pressure" className="text-xs gap-1">
                    <Gauge className="h-3.5 w-3.5" />
                    Baro
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Ensemble band toggle */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-center">
                <Switch
                  id="consensus-band"
                  checked={showConsensusBand}
                  onCheckedChange={setShowConsensusBand}
                />
                <label htmlFor="consensus-band" className="cursor-pointer select-none">
                  Model Spread Band
                </label>
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-[340px] w-full pt-2">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        ) : (
          /* Side-by-Side Summary Matrix */
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Model / Source</th>
                  <th className="py-2.5 px-3">Origin</th>
                  <th className="py-2.5 px-3">Temp Range</th>
                  <th className="py-2.5 px-3">Rain Points</th>
                  <th className="py-2.5 px-3">Max Rain</th>
                  <th className="py-2.5 px-3">Peak Wind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelSummaries.map(m => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      <span>{m.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{m.origin}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {formatTemperature(m.minTemp, units)} – {formatTemperature(m.maxTemp, units)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={m.rainPoints > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"}>
                        {m.rainPoints} pts ({Math.round((m.rainPoints / forecasts.length) * 100)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {formatPrecipitation(m.maxRain)}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {formatWindSpeed(m.maxWind, units)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Interactive Point Inspector */}
        {currentInspectorPoint && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  Point Inspector at {currentInspectorPoint.routePoint.distance.toFixed(1)} km
                </span>
                <span className="text-xs text-muted-foreground">
                  (Elev: {currentInspectorPoint.routePoint.elevation ? `${currentInspectorPoint.routePoint.elevation.toFixed(0)}m` : 'N/A'})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeInspectorIndex <= 0}
                  onClick={() => {
                    const nextIdx = Math.max(0, activeInspectorIndex - 1);
                    setManualInspectorIndex(nextIdx);
                    onPointSelect?.(nextIdx, 'timeline');
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Prev Point
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {activeInspectorIndex + 1} / {forecasts.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeInspectorIndex >= forecasts.length - 1}
                  onClick={() => {
                    const nextIdx = Math.min(forecasts.length - 1, activeInspectorIndex + 1);
                    setManualInspectorIndex(nextIdx);
                    onPointSelect?.(nextIdx, 'timeline');
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Next Point
                </Button>
              </div>
            </div>

            {/* Model values comparison cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {currentInspectorPoint.multiSourceData.sources.map(s => {
                const config = WEATHER_PROVIDERS[s.source];
                const rain = (s.rain?.['1h'] || s.snow?.['1h'] || 0);
                return (
                  <div
                    key={s.source}
                    className="p-2.5 rounded-lg border bg-background/80 shadow-2xs space-y-1"
                    style={{ borderTop: `3px solid ${config?.color || '#3b82f6'}` }}
                  >
                    <div className="text-[11px] font-semibold text-foreground truncate">
                      {config?.name || s.source}
                    </div>
                    <div className="text-base font-bold text-foreground">
                      {formatTemperature(s.temp, units)}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>{s.weather[0]?.main || 'Clear'}</span>
                      <span className={rain > 0 ? "text-blue-500 font-semibold" : ""}>
                        {formatPrecipitation(rain)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Wind: {formatWindSpeed(s.wind_speed, units)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WeatherSourceComparison;

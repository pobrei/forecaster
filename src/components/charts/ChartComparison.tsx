"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  BarChart3, 
  TrendingUp, 
  GitCompare, 
  Plus, 
  Minus,
  Zap,
  Calendar,
  Route,
  Activity
} from 'lucide-react';
import { WeatherForecast } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation } from '@/lib/format';

interface ComparisonDataset {
  id: string;
  name: string;
  forecasts: WeatherForecast[];
  color: string;
  createdAt: Date;
}

interface ChartComparisonProps {
  currentForecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
}

interface ComparisonMetrics {
  temperature: {
    avg: number;
    min: number;
    max: number;
    range: number;
  };
  wind: {
    avg: number;
    max: number;
  };
  precipitation: {
    total: number;
    maxHourly: number;
    probability: number;
  };
}

const comparisonColors = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

export function ChartComparison({ 
  currentForecasts, 
  units = 'metric',
  className 
}: ChartComparisonProps) {
  const [datasets, setDatasets] = useState<ComparisonDataset[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'wind' | 'precipitation'>('temperature');
  const [showDifferences, setShowDifferences] = useState(false);
  const [normalizeData, setNormalizeData] = useState(false);

  // Add current forecasts as a dataset
  const addCurrentDataset = () => {
    if (!currentForecasts || currentForecasts.length === 0) return;

    const newDataset: ComparisonDataset = {
      id: `dataset-${Date.now()}`,
      name: `Route ${datasets.length + 1} (${new Date().toLocaleDateString()})`,
      forecasts: currentForecasts,
      color: comparisonColors[datasets.length % comparisonColors.length],
      createdAt: new Date()
    };

    setDatasets(prev => [...prev, newDataset]);
  };

  // Remove a dataset
  const removeDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
  };

  // Calculate metrics for a dataset
  const calculateMetrics = (forecasts: WeatherForecast[]): ComparisonMetrics => {
    const temps = forecasts.map(f => f.weather.temp);
    const winds = forecasts.map(f => f.weather.wind_speed);
    const precips = forecasts.map(f => (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0));

    return {
      temperature: {
        avg: temps.reduce((sum, t) => sum + t, 0) / temps.length,
        min: Math.min(...temps),
        max: Math.max(...temps),
        range: Math.max(...temps) - Math.min(...temps)
      },
      wind: {
        avg: winds.reduce((sum, w) => sum + w, 0) / winds.length,
        max: Math.max(...winds)
      },
      precipitation: {
        total: precips.reduce((sum, p) => sum + p, 0),
        maxHourly: Math.max(...precips),
        probability: (precips.filter(p => p > 0).length / precips.length) * 100
      }
    };
  };

  // Generate comparison chart data
  const comparisonData = useMemo(() => {
    if (datasets.length === 0) return null;

    const maxPoints = Math.max(...datasets.map(d => d.forecasts.length));
    const labels = Array.from({ length: maxPoints }, (_, i) => `Point ${i + 1}`);

    const chartDatasets = datasets.map(dataset => {
      let data: number[];
      
      switch (selectedMetric) {
        case 'temperature':
          data = dataset.forecasts.map(f => f.weather.temp);
          break;
        case 'wind':
          data = dataset.forecasts.map(f => f.weather.wind_speed);
          break;
        case 'precipitation':
          data = dataset.forecasts.map(f => (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0));
          break;
        default:
          data = [];
      }

      // Normalize data if requested
      if (normalizeData && data.length > 0) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min;
        if (range > 0) {
          data = data.map(value => ((value - min) / range) * 100);
        }
      }

      // Pad data to match maxPoints
      while (data.length < maxPoints) {
        data.push(NaN);
      }

      return {
        label: dataset.name,
        data,
        borderColor: dataset.color,
        backgroundColor: dataset.color + '20',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: false
      };
    });

    return {
      labels,
      datasets: chartDatasets
    };
  }, [datasets, selectedMetric, normalizeData]);

  // Calculate differences between datasets
  const differences = useMemo(() => {
    if (datasets.length < 2) return null;

    const baseDataset = datasets[0];
    const compareDataset = datasets[1];
    const baseMetrics = calculateMetrics(baseDataset.forecasts);
    const compareMetrics = calculateMetrics(compareDataset.forecasts);

    return {
      temperature: {
        avgDiff: compareMetrics.temperature.avg - baseMetrics.temperature.avg,
        rangeDiff: compareMetrics.temperature.range - baseMetrics.temperature.range
      },
      wind: {
        avgDiff: compareMetrics.wind.avg - baseMetrics.wind.avg,
        maxDiff: compareMetrics.wind.max - baseMetrics.wind.max
      },
      precipitation: {
        totalDiff: compareMetrics.precipitation.total - baseMetrics.precipitation.total,
        probDiff: compareMetrics.precipitation.probability - baseMetrics.precipitation.probability
      }
    };
  }, [datasets]);

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'temperature':
        return units === 'metric' ? '°C' : '°F';
      case 'wind':
        return units === 'metric' ? 'm/s' : 'mph';
      case 'precipitation':
        return units === 'metric' ? 'mm' : 'in';
      default:
        return '';
    }
  };

  const formatMetricValue = (value: number, metric: string) => {
    switch (metric) {
      case 'temperature':
        return formatTemperature(value, units);
      case 'wind':
        return formatWindSpeed(value, units);
      case 'precipitation':
        return formatPrecipitation(value, units);
      default:
        return value.toFixed(2);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          Chart Comparison
          <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
            PRO
          </Badge>
        </CardTitle>
        <CardDescription>
          Compare weather patterns across different routes or time periods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={addCurrentDataset}
            disabled={!currentForecasts || currentForecasts.length === 0 || datasets.length >= 5}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Current Route
          </Button>

          <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temperature">Temperature</SelectItem>
              <SelectItem value="wind">Wind Speed</SelectItem>
              <SelectItem value="precipitation">Precipitation</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              checked={normalizeData}
              onCheckedChange={setNormalizeData}
              disabled={datasets.length === 0}
            />
            <label className="text-sm">Normalize (0-100%)</label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={showDifferences}
              onCheckedChange={setShowDifferences}
              disabled={datasets.length < 2}
            />
            <label className="text-sm">Show Differences</label>
          </div>
        </div>

        {/* Dataset Management */}
        {datasets.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Datasets ({datasets.length}/5)</h4>
            <div className="space-y-2">
              {datasets.map((dataset, index) => {
                const metrics = calculateMetrics(dataset.forecasts);
                
                return (
                  <div key={dataset.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: dataset.color }}
                      />
                      <div>
                        <h5 className="font-medium text-sm">{dataset.name}</h5>
                        <p className="text-xs text-muted-foreground">
                          {dataset.forecasts.length} points • {dataset.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs">
                        <div className="font-medium">
                          {formatMetricValue(
                            selectedMetric === 'precipitation'
                              ? (metrics[selectedMetric] as any).total
                              : (metrics[selectedMetric] as any).avg || 0,
                            selectedMetric
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {selectedMetric === 'precipitation' ? 'total' : 'avg'}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDataset(dataset.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison Chart Placeholder */}
        {datasets.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
            <div className="text-center">
              <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No datasets to compare</p>
              <p className="text-sm">Add your current route to start comparing weather patterns</p>
            </div>
          </div>
        ) : (
          <div className="h-80 border rounded-lg bg-muted/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Comparison Chart</p>
              <p className="text-sm">Chart visualization would appear here</p>
              <p className="text-xs mt-2">
                Comparing {datasets.length} dataset(s) • {selectedMetric} • {getMetricUnit(selectedMetric)}
              </p>
            </div>
          </div>
        )}

        {/* Differences Analysis */}
        {showDifferences && differences && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Difference Analysis
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <h5 className="font-medium text-sm mb-2">Temperature</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Difference:</span>
                    <span className={differences.temperature.avgDiff > 0 ? 'text-red-500' : 'text-blue-500'}>
                      {differences.temperature.avgDiff > 0 ? '+' : ''}{formatTemperature(differences.temperature.avgDiff, units)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Range Difference:</span>
                    <span className={differences.temperature.rangeDiff > 0 ? 'text-orange-500' : 'text-green-500'}>
                      {differences.temperature.rangeDiff > 0 ? '+' : ''}{formatTemperature(differences.temperature.rangeDiff, units)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <h5 className="font-medium text-sm mb-2">Wind</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Difference:</span>
                    <span className={differences.wind.avgDiff > 0 ? 'text-red-500' : 'text-green-500'}>
                      {differences.wind.avgDiff > 0 ? '+' : ''}{formatWindSpeed(differences.wind.avgDiff, units)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Difference:</span>
                    <span className={differences.wind.maxDiff > 0 ? 'text-red-500' : 'text-green-500'}>
                      {differences.wind.maxDiff > 0 ? '+' : ''}{formatWindSpeed(differences.wind.maxDiff, units)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <h5 className="font-medium text-sm mb-2">Precipitation</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Difference:</span>
                    <span className={differences.precipitation.totalDiff > 0 ? 'text-blue-500' : 'text-green-500'}>
                      {differences.precipitation.totalDiff > 0 ? '+' : ''}{formatPrecipitation(differences.precipitation.totalDiff, units)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Probability Diff:</span>
                    <span className={differences.precipitation.probDiff > 0 ? 'text-blue-500' : 'text-green-500'}>
                      {differences.precipitation.probDiff > 0 ? '+' : ''}{differences.precipitation.probDiff.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {datasets.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-sm">Comparison Summary</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg">{datasets.length}</div>
                <div className="text-muted-foreground">Datasets</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{selectedMetric}</div>
                <div className="text-muted-foreground">Metric</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{normalizeData ? 'Yes' : 'No'}</div>
                <div className="text-muted-foreground">Normalized</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{differences ? 'Yes' : 'No'}</div>
                <div className="text-muted-foreground">Differences</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

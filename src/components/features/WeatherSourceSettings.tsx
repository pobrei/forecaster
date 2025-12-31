"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, RefreshCw, Eye, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeatherSourcePreferences,
  WeatherProviderId,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';

interface WeatherSourceSettingsProps {
  preferences: WeatherSourcePreferences;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  availableProviders: WeatherProviderId[];
  className?: string;
}

export function WeatherSourceSettings({
  preferences,
  onPreferencesChange,
  availableProviders,
  className,
}: WeatherSourceSettingsProps) {
  const updatePreference = <K extends keyof WeatherSourcePreferences>(
    key: K,
    value: WeatherSourcePreferences[K]
  ) => {
    onPreferencesChange({ ...preferences, [key]: value });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Weather Source Settings
        </CardTitle>
        <CardDescription>
          Configure how weather data is fetched and displayed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Source Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Primary Weather Source
          </Label>
          <Select
            value={preferences.primarySource}
            onValueChange={(value) => updatePreference('primarySource', value as WeatherProviderId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary source" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map((id) => {
                const config = WEATHER_PROVIDERS[id];
                return (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      {config.name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The primary source is used for single-source mode and as the main data source
          </p>
        </div>

        {/* Comparison Mode */}
        <div className="space-y-2">
          <Label>Data Display Mode</Label>
          <Select
            value={preferences.comparisonMode}
            onValueChange={(value) => 
              updatePreference('comparisonMode', value as 'single' | 'comparison' | 'consensus')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single Source (Fast)</SelectItem>
              <SelectItem value="comparison">Compare Sources (Detailed)</SelectItem>
              <SelectItem value="consensus">Consensus (Aggregated)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refresh Interval */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Data Refresh Interval: {preferences.refreshInterval} minutes
          </Label>
          <Slider
            value={[preferences.refreshInterval]}
            onValueChange={([value]) => updatePreference('refreshInterval', value)}
            min={5}
            max={120}
            step={5}
          />
          <p className="text-xs text-muted-foreground">
            How often to refresh weather data in the background
          </p>
        </div>

        {/* Toggle Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Show Source Indicators
              </Label>
              <p className="text-xs text-muted-foreground">
                Display which source provided each data point
              </p>
            </div>
            <Switch
              checked={preferences.showSourceIndicators}
              onCheckedChange={(checked) => updatePreference('showSourceIndicators', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Reliability Scores</Label>
              <p className="text-xs text-muted-foreground">
                Display service health and accuracy metrics
              </p>
            </div>
            <Switch
              checked={preferences.showReliabilityScores}
              onCheckedChange={(checked) => updatePreference('showReliabilityScores', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Fallback</Label>
              <p className="text-xs text-muted-foreground">
                Automatically switch to backup source if primary fails
              </p>
            </div>
            <Switch
              checked={preferences.autoFallback}
              onCheckedChange={(checked) => updatePreference('autoFallback', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherSourceSettings;

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Cloud, CloudSun, Sun, CloudLightning, RefreshCw, Check, X, AlertCircle,
  Settings, Layers, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeatherProviderId,
  WeatherSourcePreferences,
  ProviderStatusInfo,
  WEATHER_PROVIDERS,
  DEFAULT_WEATHER_SOURCE_PREFERENCES,
} from '@/types/weather-sources';

interface WeatherSourceSelectorProps {
  preferences: WeatherSourcePreferences;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  providerStatuses?: Map<WeatherProviderId, ProviderStatusInfo>;
  onRefreshStatus?: () => void;
  isLoading?: boolean;
  className?: string;
}

const ProviderIcons: Record<WeatherProviderId, React.ReactNode> = {
  'open-meteo': <Cloud className="h-5 w-5" />,
  'weatherapi': <CloudSun className="h-5 w-5" />,
  'visual-crossing': <CloudLightning className="h-5 w-5" />,
  'openweathermap': <Sun className="h-5 w-5" />,
};

function StatusIndicator({ status }: { status?: ProviderStatusInfo }) {
  if (!status) {
    return <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <AlertCircle className="h-3 w-3" /> Unknown
    </span>;
  }

  const statusConfig = {
    available: { color: 'bg-green-500', text: 'Available', icon: Check },
    degraded: { color: 'bg-yellow-500', text: 'Degraded', icon: AlertCircle },
    unavailable: { color: 'bg-red-500', text: 'Unavailable', icon: X },
    unknown: { color: 'bg-gray-500', text: 'Unknown', icon: AlertCircle },
  };

  const config = statusConfig[status.status];
  const Icon = config.icon;

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={cn("h-2 w-2 rounded-full animate-pulse", config.color)} />
      <span className="text-muted-foreground">{config.text}</span>
      {status.responseTimeMs && (
        <span className="text-muted-foreground">({status.responseTimeMs}ms)</span>
      )}
    </span>
  );
}

export function WeatherSourceSelector({
  preferences,
  onPreferencesChange,
  providerStatuses = new Map(),
  onRefreshStatus,
  isLoading = false,
  className,
}: WeatherSourceSelectorProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  const handlePrimaryChange = (providerId: WeatherProviderId) => {
    const newPrefs = { ...localPrefs, primarySource: providerId };
    // Ensure primary source is enabled
    if (!newPrefs.enabledSources.includes(providerId)) {
      newPrefs.enabledSources = [...newPrefs.enabledSources, providerId];
    }
    setLocalPrefs(newPrefs);
    onPreferencesChange(newPrefs);
  };

  const handleToggleSource = (providerId: WeatherProviderId) => {
    const isEnabled = localPrefs.enabledSources.includes(providerId);
    let newEnabled: WeatherProviderId[];
    
    if (isEnabled) {
      // Don't disable if it's the only enabled source
      if (localPrefs.enabledSources.length <= 1) return;
      // Don't disable primary source
      if (providerId === localPrefs.primarySource) return;
      newEnabled = localPrefs.enabledSources.filter(id => id !== providerId);
    } else {
      newEnabled = [...localPrefs.enabledSources, providerId];
    }
    
    const newPrefs = { ...localPrefs, enabledSources: newEnabled };
    setLocalPrefs(newPrefs);
    onPreferencesChange(newPrefs);
  };

  const handleModeChange = (mode: 'single' | 'comparison' | 'consensus') => {
    const newPrefs = { ...localPrefs, comparisonMode: mode };
    setLocalPrefs(newPrefs);
    onPreferencesChange(newPrefs);
  };

  const availableProviders = Object.entries(WEATHER_PROVIDERS);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5" />
              Weather Sources
            </CardTitle>
            <CardDescription>
              Select and compare weather data from multiple providers
            </CardDescription>
          </div>
          {onRefreshStatus && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshStatus}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison Mode Selector */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {(['single', 'comparison', 'consensus'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                localPrefs.comparisonMode === mode
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Provider List */}
        <div className="space-y-3">
          {availableProviders.map(([id, config]) => {
            const providerId = id as WeatherProviderId;
            const isEnabled = localPrefs.enabledSources.includes(providerId);
            const isPrimary = localPrefs.primarySource === providerId;
            const status = providerStatuses.get(providerId);
            const isConfigured = !config.apiKeyRequired ||
              (providerId === 'weatherapi' && !!process.env.NEXT_PUBLIC_WEATHERAPI_KEY) ||
              (providerId === 'visual-crossing' && !!process.env.NEXT_PUBLIC_VISUAL_CROSSING_KEY);

            return (
              <div
                key={providerId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isPrimary && "border-primary bg-primary/5",
                  !isConfigured && "opacity-50"
                )}
                style={{ borderLeftColor: config.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <span style={{ color: config.color }}>
                      {ProviderIcons[providerId]}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.name}</span>
                      {isPrimary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                      {!config.apiKeyRequired && (
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                    <StatusIndicator status={status} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isEnabled && !isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePrimaryChange(providerId)}
                      disabled={!isConfigured}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleSource(providerId)}
                    disabled={!isConfigured || (isPrimary && localPrefs.enabledSources.length === 1)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mode Description */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          {localPrefs.comparisonMode === 'single' && (
            <>
              <Zap className="inline h-4 w-4 mr-1" />
              <strong>Single Mode:</strong> Uses only the primary source for fast, simple results.
            </>
          )}
          {localPrefs.comparisonMode === 'comparison' && (
            <>
              <Layers className="inline h-4 w-4 mr-1" />
              <strong>Comparison Mode:</strong> Shows data from all enabled sources side-by-side.
            </>
          )}
          {localPrefs.comparisonMode === 'consensus' && (
            <>
              <Settings className="inline h-4 w-4 mr-1" />
              <strong>Consensus Mode:</strong> Aggregates data from all sources for best accuracy.
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherSourceSelector;


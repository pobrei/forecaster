"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudSun, Sun, CloudLightning, Check, Settings, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeatherProviderId,
  WeatherSourcePreferences,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';

interface WeatherSourceSelectorProps {
  preferences: WeatherSourcePreferences;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  isLoading?: boolean;
  className?: string;
}

const ProviderIcons: Record<WeatherProviderId, React.ReactNode> = {
  'open-meteo': <Cloud className="h-4 w-4" />,
  'weatherapi': <CloudSun className="h-4 w-4" />,
  'visual-crossing': <CloudLightning className="h-4 w-4" />,
  'openweathermap': <Sun className="h-4 w-4" />,
};

export function WeatherSourceSelector({
  preferences,
  onPreferencesChange,
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
              Choose your weather data provider
            </CardDescription>
          </div>
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
        <div className="space-y-2">
          {availableProviders.map(([id, config]) => {
            const providerId = id as WeatherProviderId;
            const isPrimary = localPrefs.primarySource === providerId;

            // Check if provider is available (has API key or doesn't need one)
            const hasApiKey =
              providerId === 'open-meteo' || // Free, no key needed
              (providerId === 'openweathermap' && !!process.env.NEXT_PUBLIC_OPENWEATHERMAP_KEY) ||
              (providerId === 'visual-crossing' && !!process.env.NEXT_PUBLIC_VISUAL_CROSSING_KEY) ||
              (providerId === 'weatherapi' && !!process.env.NEXT_PUBLIC_WEATHERAPI_KEY);
            const isAvailable = !config.apiKeyRequired || hasApiKey;

            return (
              <div
                key={providerId}
                onClick={() => isAvailable && handlePrimaryChange(providerId)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isPrimary && "border-primary bg-primary/5 ring-1 ring-primary",
                  isAvailable ? "cursor-pointer hover:bg-accent" : "opacity-40 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    providerId === 'open-meteo' && "bg-emerald-100 dark:bg-emerald-900/30",
                    providerId === 'weatherapi' && "bg-blue-100 dark:bg-blue-900/30",
                    providerId === 'visual-crossing' && "bg-purple-100 dark:bg-purple-900/30",
                    providerId === 'openweathermap' && "bg-orange-100 dark:bg-orange-900/30"
                  )}>
                    <span className={cn(
                      providerId === 'open-meteo' && "text-emerald-600 dark:text-emerald-400",
                      providerId === 'weatherapi' && "text-blue-600 dark:text-blue-400",
                      providerId === 'visual-crossing' && "text-purple-600 dark:text-purple-400",
                      providerId === 'openweathermap' && "text-orange-600 dark:text-orange-400"
                    )}>
                      {ProviderIcons[providerId]}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{config.name}</span>
                      {isPrimary && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                      {!config.apiKeyRequired ? (
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs opacity-60">API Key</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{config.description}</p>
                  </div>
                </div>

                {isAvailable && (
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isPrimary ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {isPrimary && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                )}
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


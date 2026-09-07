"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Cloud,
  CloudSun,
  Sun,
  CloudLightning,
  Check,
  Settings,
  Layers,
  Zap,
  Globe,
  Shield,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeatherProviderId,
  WeatherSourcePreferences,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';
import { toast } from 'sonner';

interface WeatherSourceSelectorProps {
  preferences: WeatherSourcePreferences;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  isLoading?: boolean;
  className?: string;
}

const ProviderIcons: Record<WeatherProviderId, React.ReactNode> = {
  'open-meteo': <Globe className="h-4 w-4" />,
  'ecmwf': <Cloud className="h-4 w-4" />,
  'gfs': <CloudSun className="h-4 w-4" />,
  'icon': <Sun className="h-4 w-4" />,
  'meteofrance': <Cloud className="h-4 w-4" />,
  'gem': <CloudLightning className="h-4 w-4" />,
  'openweathermap': <Sun className="h-4 w-4" />,
  'weatherapi': <CloudSun className="h-4 w-4" />,
  'visual-crossing': <Shield className="h-4 w-4" />,
};

export function WeatherSourceSelector({
  preferences,
  onPreferencesChange,
  className,
}: WeatherSourceSelectorProps) {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [customKeys, setCustomKeys] = useState<{
    openweathermap: string;
    weatherapi: string;
    visualcrossing: string;
  }>({
    openweathermap: preferences.customApiKeys?.openweathermap || '',
    weatherapi: preferences.customApiKeys?.weatherapi || '',
    visualcrossing: preferences.customApiKeys?.visualcrossing || '',
  });

  const handlePrimaryChange = (providerId: WeatherProviderId) => {
    const newPrefs: WeatherSourcePreferences = {
      ...preferences,
      primarySource: providerId,
      enabledSources: preferences.enabledSources.includes(providerId)
        ? preferences.enabledSources
        : [...preferences.enabledSources, providerId],
    };
    onPreferencesChange(newPrefs);
  };

  const handleToggleSource = (providerId: WeatherProviderId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isEnabled = preferences.enabledSources.includes(providerId);
    let newEnabled: WeatherProviderId[];

    if (isEnabled) {
      if (preferences.enabledSources.length <= 1) {
        toast.info('At least one source must remain selected');
        return;
      }
      newEnabled = preferences.enabledSources.filter(id => id !== providerId);
      const newPrimary = preferences.primarySource === providerId
        ? newEnabled[0]
        : preferences.primarySource;
      const newPrefs: WeatherSourcePreferences = {
        ...preferences,
        primarySource: newPrimary,
        enabledSources: newEnabled,
      };
      onPreferencesChange(newPrefs);
    } else {
      newEnabled = [...preferences.enabledSources, providerId];
      const newPrefs: WeatherSourcePreferences = {
        ...preferences,
        enabledSources: newEnabled,
      };
      onPreferencesChange(newPrefs);
    }
  };

  const handleModeChange = (mode: 'single' | 'comparison' | 'consensus') => {
    const newPrefs: WeatherSourcePreferences = { ...preferences, comparisonMode: mode };
    onPreferencesChange(newPrefs);
  };

  const applyPreset = (preset: 'top3' | 'all-free' | 'all') => {
    let enabled: WeatherProviderId[];
    if (preset === 'top3') {
      enabled = ['ecmwf', 'gfs', 'icon'];
    } else if (preset === 'all-free') {
      enabled = ['open-meteo', 'ecmwf', 'gfs', 'icon', 'meteofrance', 'gem'];
    } else {
      enabled = Object.keys(WEATHER_PROVIDERS) as WeatherProviderId[];
    }
    const newPrefs: WeatherSourcePreferences = {
      ...preferences,
      enabledSources: enabled,
      primarySource: enabled.includes(preferences.primarySource) ? preferences.primarySource : enabled[0],
    };
    onPreferencesChange(newPrefs);
    toast.success(`Selected ${enabled.length} sources`);
  };

  const handleSaveApiKeys = () => {
    const newPrefs: WeatherSourcePreferences = {
      ...preferences,
      customApiKeys: {
        openweathermap: customKeys.openweathermap.trim() || undefined,
        weatherapi: customKeys.weatherapi.trim() || undefined,
        visualcrossing: customKeys.visualcrossing.trim() || undefined,
      },
    };
    onPreferencesChange(newPrefs);
    setApiKeyDialogOpen(false);
    toast.success('Custom API keys saved');
  };

  const availableProviders = Object.entries(WEATHER_PROVIDERS) as [WeatherProviderId, typeof WEATHER_PROVIDERS[WeatherProviderId]][];
  const isComparison = preferences.comparisonMode === 'comparison' || preferences.comparisonMode === 'consensus';

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Weather Sources & Models
            </CardTitle>
            <CardDescription>
              {isComparison
                ? `Comparing ${preferences.enabledSources.length} sources simultaneously`
                : 'Choose primary forecasting model'}
            </CardDescription>
          </div>

          <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Key className="h-4 w-4" />
                <span className="sr-only">API Keys</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Custom API Keys (Optional)
                </DialogTitle>
                <DialogDescription>
                  All 6 global meteorological models (ECMWF, GFS, ICON, Météo-France, GEM, Best Match) are free with no keys.
                  You can optionally connect personal keys for commercial providers below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <Label htmlFor="owm-key">OpenWeatherMap API Key</Label>
                  <Input
                    id="owm-key"
                    type="password"
                    placeholder="Enter OpenWeatherMap API Key"
                    value={customKeys.openweathermap}
                    onChange={(e) => setCustomKeys(prev => ({ ...prev, openweathermap: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wapi-key">WeatherAPI.com Key</Label>
                  <Input
                    id="wapi-key"
                    type="password"
                    placeholder="Enter WeatherAPI Key"
                    value={customKeys.weatherapi}
                    onChange={(e) => setCustomKeys(prev => ({ ...prev, weatherapi: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vc-key">Visual Crossing Key</Label>
                  <Input
                    id="vc-key"
                    type="password"
                    placeholder="Enter Visual Crossing API Key"
                    value={customKeys.visualcrossing}
                    onChange={(e) => setCustomKeys(prev => ({ ...prev, visualcrossing: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveApiKeys}>Save Keys</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode Selector */}
        <div className="flex gap-1.5 p-1 bg-muted/70 rounded-lg">
          {(['single', 'comparison', 'consensus'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all capitalize",
                preferences.comparisonMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Quick Presets for Comparison Mode */}
        {isComparison && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
            <span className="text-muted-foreground font-medium">Quick Presets:</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => applyPreset('top3')}
              >
                Top 3 Global
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => applyPreset('all-free')}
              >
                All 6 Free Models
              </Button>
            </div>
          </div>
        )}

        {/* Provider / Model List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {availableProviders.map(([id, config]) => {
            const providerId = id;
            const isPrimary = preferences.primarySource === providerId;
            const isEnabled = preferences.enabledSources.includes(providerId);

            const hasCustomKey = Boolean(
              (providerId === 'openweathermap' && (preferences.customApiKeys?.openweathermap || process.env.NEXT_PUBLIC_OPENWEATHERMAP_KEY)) ||
              (providerId === 'weatherapi' && (preferences.customApiKeys?.weatherapi || process.env.NEXT_PUBLIC_WEATHERAPI_KEY)) ||
              (providerId === 'visual-crossing' && (preferences.customApiKeys?.visualcrossing || process.env.NEXT_PUBLIC_VISUAL_CROSSING_KEY))
            );

            const isAvailable = config.isFree || hasCustomKey;

            return (
              <div
                key={providerId}
                onClick={() => {
                  if (!isAvailable) {
                    setApiKeyDialogOpen(true);
                    return;
                  }
                  if (isComparison) {
                    handleToggleSource(providerId);
                  } else {
                    handlePrimaryChange(providerId);
                  }
                }}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border transition-all select-none",
                  isComparison
                    ? (isEnabled
                        ? "border-primary/60 bg-primary/5 shadow-xs"
                        : "border-border/60 hover:bg-muted/40 opacity-70")
                    : (isPrimary
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border/60 hover:bg-muted/40"),
                  isAvailable ? "cursor-pointer" : "opacity-60 cursor-pointer hover:border-amber-500/50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Model Icon / Color Bubble */}
                  <div
                    className="p-1.5 rounded-md shrink-0 flex items-center justify-center text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {ProviderIcons[providerId]}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs truncate">{config.name}</span>
                      <span className="text-[11px] text-muted-foreground">{config.origin}</span>
                      {config.isFree ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 font-normal">
                          Free
                        </Badge>
                      ) : (
                        <Badge
                          variant={hasCustomKey ? "default" : "outline"}
                          className={cn("text-[10px] h-4 px-1 py-0 font-normal", !hasCustomKey && "text-amber-600 border-amber-300 dark:text-amber-400")}
                        >
                          {hasCustomKey ? 'Connected' : 'Key Needed'}
                        </Badge>
                      )}
                      {isPrimary && !isComparison && (
                        <Badge variant="default" className="text-[10px] h-4 px-1 py-0 font-normal">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[210px]">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Selection indicator */}
                <div className="shrink-0 pl-2">
                  {isComparison ? (
                    <div
                      className={cn(
                        "h-5 w-5 rounded flex items-center justify-center border transition-colors",
                        isEnabled ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                      )}
                    >
                      {isEnabled && <Check className="h-3 w-3" />}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                        isPrimary ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                      )}
                    >
                      {isPrimary && <Check className="h-3 w-3" />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mode Information Card */}
        <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40">
          {preferences.comparisonMode === 'single' && (
            <div className="flex items-start gap-1.5">
              <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Single Mode:</strong> Evaluates route weather using your chosen primary model.
              </span>
            </div>
          )}
          {preferences.comparisonMode === 'comparison' && (
            <div className="flex items-start gap-1.5">
              <Layers className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Comparison Mode:</strong> Visualizes divergence across selected global models with uncertainty bands and alerts.
              </span>
            </div>
          )}
          {preferences.comparisonMode === 'consensus' && (
            <div className="flex items-start gap-1.5">
              <Settings className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Consensus Mode:</strong> Aggregates predictions into an ensemble average with confidence boundaries.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherSourceSelector;

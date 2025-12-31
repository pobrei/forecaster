"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  WeatherSourcePreferences,
  WeatherProviderId,
  ProviderStatusInfo,
  MultiSourceWeatherData,
  DEFAULT_WEATHER_SOURCE_PREFERENCES,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';
import { WeatherSourceManager } from '@/lib/weather-source-manager';
import { RoutePoint } from '@/types';

const PREFERENCES_STORAGE_KEY = 'weather-source-preferences';

interface UseWeatherSourcesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseWeatherSourcesReturn {
  preferences: WeatherSourcePreferences;
  setPreferences: (prefs: WeatherSourcePreferences) => void;
  providerStatuses: Map<WeatherProviderId, ProviderStatusInfo>;
  isLoading: boolean;
  error: string | null;
  availableProviders: WeatherProviderId[];
  fetchWeatherData: (point: RoutePoint) => Promise<MultiSourceWeatherData | null>;
  refreshStatuses: () => Promise<void>;
  manager: WeatherSourceManager | null;
}

export function useWeatherSources(
  options: UseWeatherSourcesOptions = {}
): UseWeatherSourcesReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const [preferences, setPreferencesState] = useState<WeatherSourcePreferences>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_WEATHER_SOURCE_PREFERENCES, ...JSON.parse(stored) };
        } catch {
          // Invalid stored preferences
        }
      }
    }
    return DEFAULT_WEATHER_SOURCE_PREFERENCES;
  });

  const [providerStatuses, setProviderStatuses] = useState<Map<WeatherProviderId, ProviderStatusInfo>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manager, setManager] = useState<WeatherSourceManager | null>(null);

  // Initialize manager
  useEffect(() => {
    const instance = WeatherSourceManager.getInstance();
    // Update preferences on the singleton
    instance.setPreferences({
      enabledSources: preferences.enabledSources,
      primarySource: preferences.primarySource,
      autoFallback: preferences.autoFallback,
      refreshInterval: preferences.refreshInterval,
    });
    setManager(instance);
  }, [preferences.enabledSources, preferences.primarySource, preferences.autoFallback, preferences.refreshInterval]);

  // Persist preferences
  const setPreferences = useCallback((newPrefs: WeatherSourcePreferences) => {
    setPreferencesState(newPrefs);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(newPrefs));
    }
  }, []);

  // Get available providers (those that are configured)
  const availableProviders = useMemo(() => {
    return Object.entries(WEATHER_PROVIDERS)
      .filter(([id, config]) => {
        if (!config.apiKeyRequired) return true;
        // Check for API keys in environment
        if (id === 'weatherapi' && process.env.NEXT_PUBLIC_WEATHERAPI_KEY) return true;
        if (id === 'visual-crossing' && process.env.NEXT_PUBLIC_VISUAL_CROSSING_KEY) return true;
        if (id === 'openweathermap' && process.env.NEXT_PUBLIC_OPENWEATHERMAP_KEY) return true;
        return false;
      })
      .map(([id]) => id as WeatherProviderId);
  }, []);

  // Refresh provider statuses
  const refreshStatuses = useCallback(async () => {
    if (!manager) return;

    setIsLoading(true);
    setError(null);

    try {
      const statuses = await manager.checkAllProvidersHealth();
      setProviderStatuses(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check provider status');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  // Fetch weather data
  const fetchWeatherData = useCallback(
    async (point: RoutePoint): Promise<MultiSourceWeatherData | null> => {
      if (!manager) return null;

      setIsLoading(true);
      setError(null);

      try {
        const data = await manager.fetchMultiSourceData(point.lat, point.lon);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [manager]
  );

  // Auto-refresh statuses
  useEffect(() => {
    if (!autoRefresh || !manager) return;

    refreshStatuses();
    const interval = setInterval(refreshStatuses, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, manager, refreshStatuses]);

  return {
    preferences,
    setPreferences,
    providerStatuses,
    isLoading,
    error,
    availableProviders,
    fetchWeatherData,
    refreshStatuses,
    manager,
  };
}

export default useWeatherSources;

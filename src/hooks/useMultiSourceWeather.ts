"use client";

import { useState, useCallback } from 'react';
import { Route, AppSettings } from '@/types';
import { MultiSourceWeatherForecast, WeatherProviderId } from '@/types/weather-sources';
import { toast } from 'sonner';

interface MultiSourceWeatherState {
  forecasts: MultiSourceWeatherForecast[];
  isLoading: boolean;
  error: string | null;
  availableProviders: WeatherProviderId[];
  usedProviders: WeatherProviderId[];
}

interface UseMultiSourceWeatherOptions {
  onComplete?: (forecasts: MultiSourceWeatherForecast[]) => void;
  onError?: (error: string) => void;
}

export function useMultiSourceWeather(options: UseMultiSourceWeatherOptions = {}) {
  const { onComplete, onError } = options;
  
  const [state, setState] = useState<MultiSourceWeatherState>({
    forecasts: [],
    isLoading: false,
    error: null,
    availableProviders: [],
    usedProviders: [],
  });

  const loadMultiSourceWeather = useCallback(async (
    route: Route,
    settings?: AppSettings,
    sources?: WeatherProviderId[]
  ) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      forecasts: [],
    }));

    try {
      const response = await fetch('/api/weather/multi-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route, settings, sources })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch multi-source weather');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        forecasts: result.data.forecasts,
        availableProviders: result.data.availableProviders,
        usedProviders: result.data.usedProviders,
      }));

      onComplete?.(result.data.forecasts);
      return result.data.forecasts;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
      throw error;
    }
  }, [onComplete, onError]);

  const reset = useCallback(() => {
    setState({
      forecasts: [],
      isLoading: false,
      error: null,
      availableProviders: [],
      usedProviders: [],
    });
  }, []);

  return {
    ...state,
    loadMultiSourceWeather,
    reset,
  };
}


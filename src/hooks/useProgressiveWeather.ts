"use client";

import { useState, useCallback } from 'react';
import { Route, WeatherForecast, AppSettings } from '@/types';
import { toast } from 'sonner';

interface ProgressiveWeatherState {
  forecasts: WeatherForecast[];
  isLoading: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  error: string | null;
  isComplete: boolean;
}

interface UseProgressiveWeatherOptions {
  chunkSize?: number;
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void;
  onComplete?: (forecasts: WeatherForecast[]) => void;
  onError?: (error: string) => void;
}

export function useProgressiveWeather(options: UseProgressiveWeatherOptions = {}) {
  const { chunkSize = 50, onProgress, onComplete, onError } = options;
  
  const [state, setState] = useState<ProgressiveWeatherState>({
    forecasts: [],
    isLoading: false,
    progress: { current: 0, total: 0, percentage: 0 },
    error: null,
    isComplete: false
  });

  const loadWeatherData = useCallback(async (route: Route, settings?: AppSettings) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      forecasts: [],
      isComplete: false,
      progress: { current: 0, total: 0, percentage: 0 }
    }));

    try {
      // First, try the regular endpoint for smaller routes
      const estimatedPoints = Math.ceil(route.totalDistance / (settings?.forecastInterval || 5));
      
      if (estimatedPoints <= 100) {
        console.log('Using regular weather endpoint for small route');
        const response = await fetch('/api/weather', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ route, settings })
        });

        if (response.ok) {
          const data = await response.json();
          const forecasts = data.data.forecasts;
          
          setState(prev => ({
            ...prev,
            forecasts,
            isLoading: false,
            isComplete: true,
            progress: { current: 1, total: 1, percentage: 100 }
          }));
          
          onComplete?.(forecasts);
          return forecasts;
        } else if (response.status !== 408 && response.status !== 504) {
          // If it's not a timeout, throw the error
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch weather data');
        }
        
        console.log('Regular endpoint timed out, falling back to progressive loading');
      }

      // Use progressive loading for large routes or timeout fallback
      console.log('Using progressive weather endpoint for large route');
      
      const totalChunks = Math.ceil(estimatedPoints / chunkSize);
      setState(prev => ({
        ...prev,
        progress: { current: 0, total: totalChunks, percentage: 0 }
      }));

      const allForecasts: WeatherForecast[] = [];
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        console.log(`Loading chunk ${chunkIndex + 1}/${totalChunks}`);
        
        const response = await fetch('/api/weather/progressive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route,
            settings,
            chunk: {
              index: chunkIndex,
              size: chunkSize,
              total: totalChunks
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch chunk ${chunkIndex + 1}`);
        }

        const data = await response.json();
        const chunkForecasts = data.data.forecasts;
        allForecasts.push(...chunkForecasts);

        const progress = {
          current: chunkIndex + 1,
          total: totalChunks,
          percentage: Math.round(((chunkIndex + 1) / totalChunks) * 100)
        };

        setState(prev => ({
          ...prev,
          forecasts: [...allForecasts],
          progress
        }));

        onProgress?.(progress);

        // Add small delay between chunks to avoid overwhelming the server
        if (chunkIndex < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isComplete: true
      }));

      onComplete?.(allForecasts);
      toast.success(`Weather forecast loaded successfully (${allForecasts.length} points)`);
      
      return allForecasts;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load weather data';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, [chunkSize, onProgress, onComplete, onError]);

  const reset = useCallback(() => {
    setState({
      forecasts: [],
      isLoading: false,
      progress: { current: 0, total: 0, percentage: 0 },
      error: null,
      isComplete: false
    });
  }, []);

  return {
    ...state,
    loadWeatherData,
    reset
  };
}

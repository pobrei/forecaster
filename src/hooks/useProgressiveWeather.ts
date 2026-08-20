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
      const estimatedPoints = Math.ceil(route.totalDistance / (settings?.forecastInterval || 5));
      
      // For moderate routes, use regular endpoint
      if (estimatedPoints <= 50) {
        console.log('Using regular weather endpoint for route');
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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch weather data');
        }
      }

      // For larger routes or timeouts, use chunked progressive loading
      console.log('Using progressive chunked weather loading');
      const actualChunkSize = chunkSize || 25;
      const totalEstimatedChunks = Math.max(1, Math.ceil(estimatedPoints / actualChunkSize));
      
      const allForecasts: WeatherForecast[] = [];
      let currentChunk = 0;
      let totalChunks = totalEstimatedChunks;
      let isDone = false;

      while (!isDone && currentChunk < 50) { // Safety ceiling of 50 chunks
        const progressInfo = {
          current: currentChunk + 1,
          total: totalChunks,
          percentage: Math.round(((currentChunk + 1) / totalChunks) * 100)
        };

        setState(prev => ({
          ...prev,
          progress: progressInfo
        }));
        onProgress?.(progressInfo);

        const response = await fetch('/api/weather/progressive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route,
            settings,
            chunkIndex: currentChunk,
            chunkSize: actualChunkSize
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch weather chunk ${currentChunk + 1}`);
        }

        const resData = await response.json();
        if (!resData.success) {
          throw new Error(resData.error || 'Progressive fetch error');
        }

        const chunkForecasts: WeatherForecast[] = resData.data.forecasts || [];
        allForecasts.push(...chunkForecasts);
        totalChunks = resData.data.totalChunks || totalChunks;
        isDone = resData.data.isComplete || currentChunk >= totalChunks - 1;

        setState(prev => ({
          ...prev,
          forecasts: [...allForecasts],
          progress: {
            current: currentChunk + 1,
            total: totalChunks,
            percentage: Math.round(((currentChunk + 1) / totalChunks) * 100)
          }
        }));

        currentChunk++;
      }

      setState(prev => ({
        ...prev,
        forecasts: allForecasts,
        isLoading: false,
        isComplete: true,
        progress: { current: totalChunks, total: totalChunks, percentage: 100 }
      }));

      onComplete?.(allForecasts);
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

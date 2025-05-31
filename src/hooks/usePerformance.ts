import { useCallback, useMemo, useRef, useEffect } from 'react';
import { WeatherForecast, Route } from '@/types';

/**
 * Hook for memoizing expensive calculations
 */
export function useWeatherCalculations(forecasts: WeatherForecast[]) {
  return useMemo(() => {
    if (!forecasts || forecasts.length === 0) {
      return {
        temperatureRange: { min: 0, max: 0, avg: 0 },
        windRange: { min: 0, max: 0, avg: 0 },
        totalAlerts: 0,
        alertsByType: {},
        precipitationTotal: 0,
      };
    }

    const temps = forecasts.map(f => f.weather.temp);
    const winds = forecasts.map(f => f.weather.wind_speed);
    const totalAlerts = forecasts.reduce((sum, f) => sum + (f.alerts?.length || 0), 0);
    
    // Count alerts by type
    const alertsByType: Record<string, number> = {};
    forecasts.forEach(f => {
      f.alerts?.forEach(alert => {
        alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      });
    });

    // Calculate total precipitation
    const precipitationTotal = forecasts.reduce((sum, f) => {
      const precip = f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0;
      return sum + precip;
    }, 0);

    return {
      temperatureRange: {
        min: Math.min(...temps),
        max: Math.max(...temps),
        avg: temps.reduce((a, b) => a + b, 0) / temps.length,
      },
      windRange: {
        min: Math.min(...winds),
        max: Math.max(...winds),
        avg: winds.reduce((a, b) => a + b, 0) / winds.length,
      },
      totalAlerts,
      alertsByType,
      precipitationTotal,
    };
  }, [forecasts]);
}

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}

/**
 * Hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    startTime.current = performance.now();
  });

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);
    }
  });

  return {
    renderCount: renderCount.current,
    logPerformance: (operation: string, startTime: number) => {
      const endTime = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} ${operation}: ${(endTime - startTime).toFixed(2)}ms`);
      }
    }
  };
}

/**
 * Hook for lazy loading components
 */
export function useLazyLoad(threshold: number = 100) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/**
 * Hook for optimizing chart data
 */
export function useChartData(forecasts: WeatherForecast[], maxPoints: number = 50) {
  return useMemo(() => {
    if (!forecasts || forecasts.length === 0) {
      return {
        labels: [],
        temperatureData: [],
        windData: [],
        precipitationData: [],
        humidityData: [],
        pressureData: [],
      };
    }

    // Sample data if there are too many points
    let sampledForecasts = forecasts;
    if (forecasts.length > maxPoints) {
      const step = Math.ceil(forecasts.length / maxPoints);
      sampledForecasts = forecasts.filter((_, index) => index % step === 0);
      
      // Always include the last point
      if (sampledForecasts[sampledForecasts.length - 1] !== forecasts[forecasts.length - 1]) {
        sampledForecasts.push(forecasts[forecasts.length - 1]);
      }
    }

    return {
      labels: sampledForecasts.map(f => `${f.routePoint.distance.toFixed(1)}km`),
      temperatureData: sampledForecasts.map(f => f.weather.temp),
      windData: sampledForecasts.map(f => f.weather.wind_speed),
      precipitationData: sampledForecasts.map(f => f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0),
      humidityData: sampledForecasts.map(f => f.weather.humidity),
      pressureData: sampledForecasts.map(f => f.weather.pressure),
    };
  }, [forecasts, maxPoints]);
}

/**
 * Hook for route calculations
 */
export function useRouteCalculations(route: Route | null) {
  return useMemo(() => {
    if (!route) {
      return {
        totalDistance: 0,
        totalElevationGain: 0,
        estimatedDuration: 0,
        averageElevation: 0,
        maxElevation: 0,
        minElevation: 0,
      };
    }

    const elevations = route.points
      .map(p => p.elevation)
      .filter((e): e is number => e !== undefined);

    let totalElevationGain = 0;
    for (let i = 1; i < route.points.length; i++) {
      const prev = route.points[i - 1].elevation;
      const curr = route.points[i].elevation;
      if (prev !== undefined && curr !== undefined && curr > prev) {
        totalElevationGain += curr - prev;
      }
    }

    return {
      totalDistance: route.totalDistance,
      totalElevationGain,
      estimatedDuration: route.estimatedDuration || 0,
      averageElevation: elevations.length > 0 ? elevations.reduce((a, b) => a + b, 0) / elevations.length : 0,
      maxElevation: elevations.length > 0 ? Math.max(...elevations) : 0,
      minElevation: elevations.length > 0 ? Math.min(...elevations) : 0,
    };
  }, [route]);
}

// Import useState for useDebounce
import { useState } from 'react';

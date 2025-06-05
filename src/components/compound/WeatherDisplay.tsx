"use client";

import React, { createContext, useContext, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WeatherForecast, SelectedWeatherPoint } from '@/types'
import { cn } from '@/lib/utils'

// Context for weather display compound component
interface WeatherDisplayContextValue {
  forecasts: WeatherForecast[]
  units: 'metric' | 'imperial'
  selectedPoint?: SelectedWeatherPoint | null
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void
  className?: string
}

const WeatherDisplayContext = createContext<WeatherDisplayContextValue | null>(null)

// Hook to use weather display context
export function useWeatherDisplay() {
  const context = useContext(WeatherDisplayContext)
  if (!context) {
    throw new Error('useWeatherDisplay must be used within WeatherDisplay')
  }
  return context
}

// Root component
interface WeatherDisplayProps {
  forecasts: WeatherForecast[]
  units?: 'metric' | 'imperial'
  selectedPoint?: SelectedWeatherPoint | null
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void
  className?: string
  children: ReactNode
}

export function WeatherDisplay({
  forecasts,
  units = 'metric',
  selectedPoint,
  onPointSelect,
  className,
  children,
}: WeatherDisplayProps) {
  return (
    <WeatherDisplayContext.Provider
      value={{
        forecasts,
        units,
        selectedPoint,
        onPointSelect,
        className,
      }}
    >
      <div className={cn('space-y-6', className)}>
        {children}
      </div>
    </WeatherDisplayContext.Provider>
  )
}

// Summary component
interface SummaryProps {
  className?: string
}

WeatherDisplay.Summary = function Summary({ className }: SummaryProps) {
  const { forecasts, units } = useWeatherDisplay()
  
  if (!forecasts || forecasts.length === 0) {
    return null
  }

  // Calculate summary statistics
  const temperatures = forecasts.map(f => f.weather.temp)
  const windSpeeds = forecasts.map(f => f.weather.wind_speed)
  const precipitation = forecasts.map(f => f.weather.rain?.["1h"] || f.weather.snow?.["1h"] || 0)
  
  const stats = {
    tempMin: Math.min(...temperatures),
    tempMax: Math.max(...temperatures),
    windMax: Math.max(...windSpeeds),
    precipitationTotal: precipitation.reduce((sum, p) => sum + p, 0),
    totalAlerts: forecasts.reduce((sum, f) => sum + (f.alerts?.length || 0), 0),
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weather Summary</CardTitle>
        <CardDescription>
          Overview of weather conditions along your route
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {stats.tempMin}° - {stats.tempMax}°
            </div>
            <div className="text-sm text-muted-foreground">Temperature Range</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.windMax}</div>
            <div className="text-sm text-muted-foreground">
              Max Wind {units === 'metric' ? 'km/h' : 'mph'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.precipitationTotal.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">
              Total Rain {units === 'metric' ? 'mm' : 'in'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.totalAlerts}</div>
            <div className="text-sm text-muted-foreground">Weather Alerts</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Timeline component
interface TimelineProps {
  className?: string
}

WeatherDisplay.Timeline = function Timeline({ className }: TimelineProps) {
  const { forecasts, units, selectedPoint, onPointSelect } = useWeatherDisplay()
  
  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Weather Timeline</CardTitle>
          <CardDescription>
            Weather forecast points will appear here after generating forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No weather data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weather Timeline</CardTitle>
        <CardDescription>
          Detailed weather forecast along your route ({forecasts.length} points)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {forecasts.map((forecast, index) => (
            <div
              key={index}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-colors',
                selectedPoint?.forecastIndex === index
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted/50'
              )}
              onClick={() => onPointSelect?.(index, 'timeline')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">
                    {forecast.routePoint.distance.toFixed(1)} km
                  </div>
                  <div className="text-lg font-semibold">
                    {forecast.weather.temp}°
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {forecast.weather.weather[0]?.description || 'N/A'}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>💨 {(forecast.weather.wind_speed * 3.6).toFixed(1)} {units === 'metric' ? 'km/h' : 'mph'}</span>
                  {(forecast.weather.rain?.["1h"] || forecast.weather.snow?.["1h"] || 0) > 0 && (
                    <span>🌧️ {(forecast.weather.rain?.["1h"] || forecast.weather.snow?.["1h"] || 0).toFixed(1)} {units === 'metric' ? 'mm' : 'in'}</span>
                  )}
                  {forecast.alerts && forecast.alerts.length > 0 && (
                    <span className="text-amber-600">⚠️ {forecast.alerts.length}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Charts component placeholder
WeatherDisplay.Charts = function Charts({ className }: { className?: string }) {
  const { forecasts } = useWeatherDisplay()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weather Charts</CardTitle>
        <CardDescription>
          Interactive charts showing weather patterns ({forecasts.length} points)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Charts component will be implemented here
        </div>
      </CardContent>
    </Card>
  )
}

// Map component placeholder
WeatherDisplay.Map = function Map({ className }: { className?: string }) {
  const { forecasts } = useWeatherDisplay()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Interactive Map</CardTitle>
        <CardDescription>
          Route visualization with weather markers ({forecasts.length} points)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Map component will be implemented here
        </div>
      </CardContent>
    </Card>
  )
}

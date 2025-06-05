"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  Wind,
  Droplets,
  Gauge,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2
} from 'lucide-react'
import { WeatherForecast, SelectedWeatherPoint } from '@/types'
import { formatTemperature, formatWindSpeed, formatPrecipitation } from '@/lib/format'
import { useTouchChart } from '@/hooks/useTouch'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

interface AdvancedWeatherChartsProps {
  forecasts: WeatherForecast[]
  units?: 'metric' | 'imperial'
  selectedPoint?: SelectedWeatherPoint | null
  onPointSelect?: (forecastIndex: number, source: 'chart') => void
  className?: string
}

export function AdvancedWeatherCharts({
  forecasts,
  units = 'metric',
  selectedPoint,
  onPointSelect,
  className
}: AdvancedWeatherChartsProps) {
  const [activeTab, setActiveTab] = useState('temperature')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showTrendlines, setShowTrendlines] = useState(true)
  const [showDataLabels, setShowDataLabels] = useState(false)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  const chartRef = useRef<any>(null)

  // Touch interactions for charts
  const { bind, selectedPoint: touchSelectedPoint, resetZoom } = useTouchChart(
    (index) => onPointSelect?.(index, 'chart'),
    (scale) => setZoomLevel(scale),
  )

  // Use effect for chart updates
  useEffect(() => {
    // Chart update logic would go here
  }, [selectedPoint])

  // Prepare chart data with advanced features
  const chartData = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return null

    const labels = forecasts.map((forecast) =>
      forecast.routePoint.estimatedTime
        ? forecast.routePoint.estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `${forecast.routePoint.distance.toFixed(1)}km`
    )

    // Temperature data with trend analysis
    const temperatureData = forecasts.map(f => f.weather.temp)
    const temperatureTrend = calculateTrend(temperatureData)

    // Wind data with direction
    const windSpeedData = forecasts.map(f => f.weather.wind_speed * 3.6) // Convert m/s to km/h
    const windDirectionData = forecasts.map(f => f.weather.wind_deg)

    // Precipitation with probability
    const precipitationData = forecasts.map(f => f.weather.rain?.["1h"] || f.weather.snow?.["1h"] || 0)
    const precipitationProbData = forecasts.map(f => (f.weather.pop || 0) * 100)

    // Atmospheric data
    const humidityData = forecasts.map(f => f.weather.humidity)
    const pressureData = forecasts.map(f => f.weather.pressure)

    return {
      labels,
      datasets: {
        temperature: [
          {
            label: `Temperature (°${units === 'metric' ? 'C' : 'F'})`,
            data: temperatureData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: temperatureData.map((_, index) =>
              selectedPoint?.forecastIndex === index ? 'rgb(239, 68, 68)' : 'white'
            ),
            pointBorderColor: 'rgb(239, 68, 68)',
            pointBorderWidth: 2,
          },
          ...(showTrendlines ? [{
            label: 'Temperature Trend',
            data: temperatureTrend,
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          }] : [])
        ],
        wind: [
          {
            label: `Wind Speed (${units === 'metric' ? 'km/h' : 'mph'})`,
            data: windSpeedData,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
          {
            label: 'Wind Direction (°)',
            data: windDirectionData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y1',
            fill: false,
            tension: 0.4,
            pointRadius: 4,
          }
        ],
        precipitation: [
          {
            type: 'bar' as const,
            label: `Precipitation (${units === 'metric' ? 'mm' : 'in'})`,
            data: precipitationData,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
          {
            type: 'line' as const,
            label: 'Precipitation Probability (%)',
            data: precipitationProbData,
            borderColor: 'rgb(147, 51, 234)',
            backgroundColor: 'rgba(147, 51, 234, 0.1)',
            yAxisID: 'y1',
            fill: false,
            tension: 0.4,
          }
        ],
        atmospheric: [
          {
            label: 'Humidity (%)',
            data: humidityData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Pressure (hPa)',
            data: pressureData,
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yAxisID: 'y1',
            fill: false,
            tension: 0.4,
          }
        ]
      }
    }
  }, [forecasts, units, selectedPoint, showTrendlines])

  // Chart options with advanced features
  const getChartOptions = (type: string): Record<string, unknown> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: Array<{ dataIndex: number }>) => {
            const index = context[0].dataIndex
            const forecast = forecasts[index]
            return `${forecast.routePoint.distance.toFixed(1)}km - ${
              forecast.routePoint.estimatedTime?.toLocaleTimeString() || 'N/A'
            }`
          },
          afterBody: (context: Array<{ dataIndex: number }>) => {
            const index = context[0].dataIndex
            const forecast = forecasts[index]
            const alerts = forecast.alerts?.length || 0
            return alerts > 0 ? [`⚠️ ${alerts} weather alert(s)`] : []
          }
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time / Distance'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getYAxisLabel(type)
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      ...(needsSecondaryAxis(type) ? {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: getSecondaryYAxisLabel(type)
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      } : {})
    },
    onClick: (event: Event, elements: Array<{ index: number }>) => {
      if (elements.length > 0) {
        const index = elements[0].index
        onPointSelect?.(index, 'chart')
      }
    }
  })

  if (!chartData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Weather Charts
          </CardTitle>
          <CardDescription>
            Interactive weather data visualization will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No weather data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Weather Charts
            </CardTitle>
            <CardDescription>
              Interactive weather visualization with {forecasts.length} data points
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Zoom: {(zoomLevel * 100).toFixed(0)}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              disabled={zoomLevel === 1}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="temperature" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Temperature
            </TabsTrigger>
            <TabsTrigger value="wind" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Wind
            </TabsTrigger>
            <TabsTrigger value="precipitation" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Precipitation
            </TabsTrigger>
            <TabsTrigger value="atmospheric" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Atmospheric
            </TabsTrigger>
          </TabsList>

          {Object.entries(chartData.datasets).map(([key, datasets]) => (
            <TabsContent key={key} value={key} className="mt-6">
              <div className="h-80" {...bind}>
                <Line
                  ref={chartRef}
                  data={{
                    labels: chartData.labels,
                    datasets: datasets as any
                  }}
                  options={getChartOptions(key)}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Helper functions
function calculateTrend(data: number[]): number[] {
  // Simple linear regression for trend line
  const n = data.length
  const sumX = data.reduce((sum, _, i) => sum + i, 0)
  const sumY = data.reduce((sum, val) => sum + val, 0)
  const sumXY = data.reduce((sum, val, i) => sum + i * val, 0)
  const sumXX = data.reduce((sum, _, i) => sum + i * i, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return data.map((_, i) => slope * i + intercept)
}

function getYAxisLabel(type: string): string {
  switch (type) {
    case 'temperature': return 'Temperature (°C/°F)'
    case 'wind': return 'Wind Speed (km/h / mph)'
    case 'precipitation': return 'Precipitation (mm / in)'
    case 'atmospheric': return 'Humidity (%)'
    default: return 'Value'
  }
}

function getSecondaryYAxisLabel(type: string): string {
  switch (type) {
    case 'wind': return 'Direction (°)'
    case 'precipitation': return 'Probability (%)'
    case 'atmospheric': return 'Pressure (hPa)'
    default: return 'Secondary Value'
  }
}

function needsSecondaryAxis(type: string): boolean {
  return ['wind', 'precipitation', 'atmospheric'].includes(type)
}

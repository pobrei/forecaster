"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { BarChart3, Zap, Thermometer, Wind, CloudRain, Sun } from 'lucide-react';
import { FileUpload } from '@/components/features/ClientOnlyFileUpload';
import { SettingsPanel } from '@/components/features/SettingsPanel';
import { WeatherMap } from '@/components/features/WeatherMap';
import { WeatherCharts } from '@/components/features/WeatherCharts';
import { ProWeatherCharts } from '@/components/charts/ProWeatherCharts';
import { WeatherTimeline } from '@/components/features/WeatherTimeline';
import { WeatherSummary } from '@/components/features/WeatherSummary';
import { UnifiedExport } from '@/components/features/UnifiedExport';
import { PerformanceIndicator } from '@/components/ui/performance-indicator';

import { ProgressBreadcrumbs } from '@/components/ui/progress-breadcrumbs';
import { HelpTooltip } from '@/components/ui/enhanced-tooltip';
import { MetricGrid } from '@/components/ui/metric-card';

import { StatusBadge } from '@/components/ui/status-indicator';
import { SmartSuggestions, generateWeatherSuggestions } from '@/components/ui/smart-suggestions';

import { Header } from '@/components/layout/Header';
import { PWAInstallBanner, PWAOfflineBanner } from '@/components/features/PWAInstallBanner';
import { Route, AppSettings, SelectedWeatherPoint } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { useProgressiveWeather } from '@/hooks/useProgressiveWeather';
import { toast } from 'sonner';

export default function Home() {
  const [route, setRoute] = useState<Route | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
    forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
    units: 'metric',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [selectedPoint, setSelectedPoint] = useState<SelectedWeatherPoint | null>(null);
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  const [chartMode, setChartMode] = useState<'standard' | 'professional'>('professional');

  // Use progressive weather loading hook
  const {
    forecasts,
    isLoading: isGeneratingForecast,
    progress,
    loadWeatherData,
    reset: resetWeatherData
  } = useProgressiveWeather({
    onProgress: (progress) => {
      if (progress.total > 1) {
        toast.loading(`Loading weather data... ${progress.percentage}% (${progress.current}/${progress.total} chunks)`, {
          id: 'weather-progress'
        });
      }
    },
    onComplete: (forecasts) => {
      toast.dismiss('weather-progress');
      const totalAlerts = forecasts.reduce((sum, forecast) => sum + (forecast.alerts?.length || 0), 0);
      if (totalAlerts > 0) {
        toast.warning(`Generated ${totalAlerts} weather alert(s) for your route`);
      }
    },
    onError: (error) => {
      toast.dismiss('weather-progress');
      console.error('Weather loading error:', error);
    }
  });

  const handleRouteUploaded = (newRoute: Route) => {
    setRoute(newRoute);
    resetWeatherData(); // Clear previous forecasts
    toast.success(`Route "${newRoute.name}" loaded successfully!`);
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handlePointSelection = useCallback((forecastIndex: number, source: 'timeline' | 'chart' | 'map') => {
    if (forecasts[forecastIndex]) {
      setSelectedPoint({
        forecastIndex,
        forecast: forecasts[forecastIndex],
        source
      });
    }
  }, [forecasts]);

  const handleGenerateForecast = async () => {
    if (!route) {
      toast.error('Please upload a GPX file first');
      return;
    }

    try {
      await loadWeatherData(route, settings);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Forecast generation error:', error);
    }
  };

  const hasData = route && forecasts.length > 0;

  return (
    <>
      <Header />
      <PWAOfflineBanner />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Forecaster
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A weather planning application for outdoor activities. Upload GPX files,
            analyze weather conditions along your path, and make informed decisions for your adventures.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <StatusBadge status="live" showPulse>
              Open-Meteo Weather Service
            </StatusBadge>
            <StatusBadge status="success">
              Interactive Maps
            </StatusBadge>
            <StatusBadge status="success">
              PDF Reports
            </StatusBadge>
            <StatusBadge status="success">
              Professional Analytics
            </StatusBadge>
          </div>
        </div>

        {/* Progress Breadcrumbs */}
        <ProgressBreadcrumbs
          hasGpxData={!!route}
          hasWeatherData={!!forecasts.length}
          className="mb-8"
        />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Upload Section */}
        <FileUpload
          onRouteUploaded={handleRouteUploaded}
          isLoading={isGeneratingForecast}
          className="lg:col-span-1"
        />

        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onGenerateForecast={handleGenerateForecast}
          isLoading={isGeneratingForecast}
          hasRoute={!!route}
          className="lg:col-span-2"
        />

        {/* Enhanced Progress Indicator for Large Routes */}
        {isGeneratingForecast && progress.total > 1 && (
          <div className="lg:col-span-3">
            <PerformanceIndicator
              isProcessing={isGeneratingForecast}
              progress={progress.percentage}
              currentStep={`Processing weather data chunk ${progress.current} of ${progress.total}`}
              totalSteps={progress.total}
              currentStepIndex={progress.current - 1}
              estimatedTimeRemaining={route ? (100 - progress.percentage) * (route.points.length / 100) : undefined}
              processingSpeed={route && route.points.length > 20 ? progress.percentage * 1.5 : undefined}
            />
          </div>
        )}
      </div>

      {/* Weather Data Visualization */}
      {hasData && (
        <div className="space-y-8">
          {/* Smart Suggestions */}
          <SmartSuggestions
            suggestions={generateWeatherSuggestions(forecasts)}
            onApplySuggestion={(suggestion) => {
              toast.info(`Applied suggestion: ${suggestion.title}`);
            }}
            onDismissSuggestion={() => {
              toast.success('Suggestion dismissed');
            }}
          />

          {/* Weather Metrics Overview */}
          <MetricGrid
            metrics={[
              {
                icon: <Thermometer className="h-8 w-8" />,
                label: "Temperature Range",
                value: `${Math.min(...forecasts.map(f => f.weather.temp)).toFixed(0)}° - ${Math.max(...forecasts.map(f => f.weather.temp)).toFixed(0)}°`,
                trend: `${(Math.max(...forecasts.map(f => f.weather.temp)) - Math.min(...forecasts.map(f => f.weather.temp))).toFixed(0)}° variation`,
                trendDirection: 'neutral',
                color: 'red'
              },
              {
                icon: <Wind className="h-8 w-8" />,
                label: "Wind Speed",
                value: `${Math.max(...forecasts.map(f => f.weather.wind_speed * 3.6)).toFixed(0)} km/h`,
                trend: "Max wind speed",
                trendDirection: 'up',
                color: 'blue'
              },
              {
                icon: <CloudRain className="h-8 w-8" />,
                label: "Precipitation",
                value: `${forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length}`,
                trend: `${Math.round((forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length / forecasts.length) * 100)}% of route`,
                trendDirection: forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length > 0 ? 'up' : 'neutral',
                color: 'purple'
              },
              {
                icon: <Sun className="h-8 w-8" />,
                label: "Forecast Points",
                value: `${forecasts.length}`,
                trend: "Data points analyzed",
                trendDirection: 'neutral',
                color: 'yellow'
              }
            ]}
            className="mb-8"
          />

          {/* Weather Summary */}
          <WeatherSummary
            forecasts={forecasts}
            units={settings.units}
          />

          {/* Weather Timeline */}
          <WeatherTimeline
            forecasts={forecasts}
            units={settings.units}
            onPointSelect={handlePointSelection}
            selectedPoint={selectedPoint}
          />

          {/* Map and Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <WeatherMap
              route={route}
              forecasts={forecasts}
              units={settings.units}
              selectedPoint={selectedPoint}
              onPointSelect={handlePointSelection}
            />
            {chartMode === 'professional' ? (
              <ProWeatherCharts
                forecasts={forecasts}
                units={settings.units}
                onPointSelect={handlePointSelection}
                selectedPoint={selectedPoint}
              />
            ) : (
              <WeatherCharts
                forecasts={forecasts}
                units={settings.units}
                onPointSelect={handlePointSelection}
                selectedPoint={selectedPoint}
              />
            )}
          </div>

          {/* Export Section */}
          <UnifiedExport
            route={route}
            forecasts={forecasts}
            settings={settings}
          />

          {/* Advanced Features Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Features</CardTitle>
              <CardDescription>
                Explore chart modes and advanced visualization options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Advanced Features</p>
                  <p className="text-sm text-muted-foreground">
                    Chart modes, visualization options, and advanced features
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {showAdvancedFeatures ? 'Hide' : 'Show'}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Features Section */}
          {showAdvancedFeatures && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-8">
              </div>

              {/* Chart Mode Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Chart Rendering Mode
                    <HelpTooltip
                      title="Chart Modes"
                      content="Standard charts provide basic weather visualization, while Professional charts include advanced analytics, data export, and customization options."
                    />
                  </CardTitle>
                  <CardDescription>
                    Choose between standard and professional chart modes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        className={`cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                          chartMode === 'standard'
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setChartMode('standard')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium mb-1">Standard Charts</h3>
                              <p className="text-sm text-muted-foreground">Basic chart functionality with essential features</p>
                            </div>
                            <BarChart3 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card
                        className={`cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${
                          chartMode === 'professional'
                            ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setChartMode('professional')}
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
                        <CardContent className="p-4 relative">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium flex items-center gap-2 mb-1">
                                Professional Charts
                                <Badge className="text-xs bg-gradient-to-r from-primary to-primary/80">PRO</Badge>
                              </h3>
                              <p className="text-sm text-muted-foreground">Advanced features, analytics & data export</p>
                            </div>
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Current mode:</strong> {chartMode === 'professional' ? 'Professional (Recommended)' : 'Standard'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Getting Started / Features Overview */}
      {!hasData && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these simple steps to analyze weather conditions for your outdoor activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Upload GPX</h3>
                <p className="text-sm text-muted-foreground">Upload your GPX file containing the route data</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 dark:text-green-400 font-semibold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Configure</h3>
                <p className="text-sm text-muted-foreground">Set start time, speed, and forecast intervals</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Analyze</h3>
                <p className="text-sm text-muted-foreground">View weather data on maps and charts</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">4</span>
                </div>
                <h3 className="font-semibold mb-2">Export</h3>
                <p className="text-sm text-muted-foreground">Export weather data in multiple formats (PDF, PNG, HTML, CSV, JSON, GPX)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Summary */}
      {route && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Route Summary</CardTitle>
            <CardDescription>
              Overview of your uploaded route and current settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Route Name:</span>
                <div className="font-medium">{route.name}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Distance:</span>
                <div className="font-medium">{route.totalDistance.toFixed(1)} km</div>
              </div>
              <div>
                <span className="text-muted-foreground">Route Points:</span>
                <div className="font-medium">{route.points.length}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Forecast Points:</span>
                <div className="font-medium">{forecasts.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      <PWAInstallBanner />


    </>
  );
}

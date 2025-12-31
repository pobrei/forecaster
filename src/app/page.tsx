"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Wind, CloudRain, Sun, Layers } from 'lucide-react';
import { FileUpload } from '@/components/features/ClientOnlyFileUpload';
import { SettingsPanel } from '@/components/features/SettingsPanel';
import { WeatherSourceSelector } from '@/components/features/WeatherSourceSelector';
import { WeatherMap } from '@/components/features/WeatherMap';
import { WeatherCharts } from '@/components/features/WeatherCharts';
import { WeatherTimeline } from '@/components/features/WeatherTimeline';
import { WeatherSummary } from '@/components/features/WeatherSummary';
import { UnifiedExport } from '@/components/features/UnifiedExport';
import { PerformanceIndicator } from '@/components/ui/performance-indicator';

import { ProgressBreadcrumbs } from '@/components/ui/progress-breadcrumbs';
import { MetricGrid } from '@/components/ui/metric-card';

import { SmartSuggestions, generateWeatherSuggestions } from '@/components/ui/smart-suggestions';

import { Header } from '@/components/layout/Header';
import { PWAInstallBanner, PWAOfflineBanner } from '@/components/features/PWAInstallBanner';
import { Route, AppSettings, SelectedWeatherPoint } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { useProgressiveWeather } from '@/hooks/useProgressiveWeather';
import { useWeatherSourcePreferences, useAppStore } from '@/store/app-store';
import { WeatherSourcePreferences } from '@/types/weather-sources';
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

  // Weather source preferences from store
  const weatherSourcePreferences = useWeatherSourcePreferences();
  const updateWeatherSourcePreferences = useAppStore((state) => state.updateWeatherSourcePreferences);

  const handleWeatherSourceChange = useCallback((prefs: WeatherSourcePreferences) => {
    updateWeatherSourcePreferences(prefs);
  }, [updateWeatherSourcePreferences]);

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

      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Hero Section - Clean and Minimal */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Forecaster
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Plan your outdoor adventures with accurate weather forecasts along your route
          </p>
        </div>

        {/* Progress Breadcrumbs */}
        <ProgressBreadcrumbs
          hasGpxData={!!route}
          hasWeatherData={!!forecasts.length}
          className="mb-8"
        />

        {/* Main Content - Clean Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column - Upload */}
          <div className="lg:col-span-4">
            <FileUpload
              onRouteUploaded={handleRouteUploaded}
              isLoading={isGeneratingForecast}
            />
          </div>

          {/* Middle Column - Settings */}
          <div className="lg:col-span-4">
            <SettingsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onGenerateForecast={handleGenerateForecast}
              isLoading={isGeneratingForecast}
              hasRoute={!!route}
            />
          </div>

          {/* Right Column - Weather Sources */}
          <div className="lg:col-span-4">
            <WeatherSourceSelector
              preferences={weatherSourcePreferences}
              onPreferencesChange={handleWeatherSourceChange}
              isLoading={isGeneratingForecast}
            />
          </div>
        </div>

        {/* Progress Indicator for Large Routes */}
        {isGeneratingForecast && progress.total > 1 && (
          <PerformanceIndicator
            isProcessing={isGeneratingForecast}
            progress={progress.percentage}
            currentStep={`Loading weather... ${progress.current}/${progress.total}`}
            totalSteps={progress.total}
            currentStepIndex={progress.current - 1}
          />
        )}

        {/* Weather Data Visualization */}
        {hasData && (
          <div className="space-y-6">
            {/* Smart Suggestions - Compact */}
            <SmartSuggestions
              suggestions={generateWeatherSuggestions(forecasts)}
              onApplySuggestion={(suggestion) => {
                toast.info(`Applied: ${suggestion.title}`);
              }}
              onDismissSuggestion={() => {}}
            />

            {/* Weather Metrics - Clean Grid */}
            <MetricGrid
              metrics={[
                {
                  icon: <Thermometer className="h-6 w-6" />,
                  label: "Temperature",
                  value: `${Math.min(...forecasts.map(f => f.weather.temp)).toFixed(0)}° - ${Math.max(...forecasts.map(f => f.weather.temp)).toFixed(0)}°`,
                  trend: `${(Math.max(...forecasts.map(f => f.weather.temp)) - Math.min(...forecasts.map(f => f.weather.temp))).toFixed(0)}° range`,
                  trendDirection: 'neutral',
                  color: 'red'
                },
                {
                  icon: <Wind className="h-6 w-6" />,
                  label: "Max Wind",
                  value: `${Math.max(...forecasts.map(f => f.weather.wind_speed * 3.6)).toFixed(0)} km/h`,
                  trend: "Peak wind speed",
                  trendDirection: 'up',
                  color: 'blue'
                },
                {
                  icon: <CloudRain className="h-6 w-6" />,
                  label: "Rain Points",
                  value: `${forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length}`,
                  trend: `${Math.round((forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length / forecasts.length) * 100)}% of route`,
                  trendDirection: forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length > 0 ? 'up' : 'neutral',
                  color: 'purple'
                },
                {
                  icon: <Sun className="h-6 w-6" />,
                  label: "Data Points",
                  value: `${forecasts.length}`,
                  trend: "Analyzed",
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

            {/* Map and Charts - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <WeatherMap
                route={route}
                forecasts={forecasts}
                units={settings.units}
                selectedPoint={selectedPoint}
                onPointSelect={handlePointSelection}
              />
              <WeatherCharts
                forecasts={forecasts}
                units={settings.units}
                onPointSelect={handlePointSelection}
                selectedPoint={selectedPoint}
              />
            </div>

            {/* Export */}
            <UnifiedExport
              route={route}
              forecasts={forecasts}
              settings={settings}
            />
          </div>
        )}

        {/* Route Summary - Show when route is loaded */}
        {route && !hasData && (
          <Card className="mt-6 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{route.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {route.totalDistance.toFixed(1)} km · {route.points.length} points
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure settings and click &quot;Generate Weather Forecast&quot; to view weather data
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PWAInstallBanner />
    </>
  );
}

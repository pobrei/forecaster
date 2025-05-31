"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from '@/components/features/ClientOnlyFileUpload';
import { SettingsPanel } from '@/components/features/SettingsPanel';
import { WeatherMap } from '@/components/features/WeatherMap';
import { WeatherCharts } from '@/components/features/WeatherCharts';
import { WeatherTimeline } from '@/components/features/WeatherTimeline';
import { WeatherSummary } from '@/components/features/WeatherSummary';
import { PDFExport } from '@/components/features/PDFExport';
import { SettingsManager } from '@/components/features/SettingsManager';
import { Header } from '@/components/layout/Header';
import { PWAInstallBanner, PWAOfflineBanner } from '@/components/features/PWAInstallBanner';
import { Route, WeatherForecast, AppSettings, APIResponse, WeatherResponse, SelectedWeatherPoint } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { toast } from 'sonner';

export default function Home() {
  const [route, setRoute] = useState<Route | null>(null);
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
    forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
    units: 'metric',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [selectedPoint, setSelectedPoint] = useState<SelectedWeatherPoint | null>(null);

  const handleRouteUploaded = (newRoute: Route) => {
    setRoute(newRoute);
    setForecasts([]); // Clear previous forecasts
    toast.success(`Route "${newRoute.name}" loaded successfully!`);
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handlePointSelection = (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => {
    if (forecasts[forecastIndex]) {
      setSelectedPoint({
        forecastIndex,
        forecast: forecasts[forecastIndex],
        source
      });
    }
  };

  const handleGenerateForecast = async () => {
    if (!route) {
      toast.error('Please upload a GPX file first');
      return;
    }

    setIsGeneratingForecast(true);
    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route,
          settings,
        }),
      });

      const result: APIResponse<WeatherResponse> = await response.json();

      if (result.success && result.data) {
        setForecasts(result.data.forecasts);
        toast.success(result.data.message);

        // Show alert summary if there are alerts
        const totalAlerts = result.data.forecasts.reduce(
          (sum, forecast) => sum + (forecast.alerts?.length || 0),
          0
        );
        if (totalAlerts > 0) {
          toast.warning(`Generated ${totalAlerts} weather alert(s) for your route`);
        }
      } else {
        toast.error(result.error || 'Failed to generate weather forecast');
      }
    } catch (error) {
      console.error('Forecast generation error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsGeneratingForecast(false);
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
            A premium weather planning application for outdoor activities. Upload GPX files,
            analyze weather conditions along your path, and make informed decisions for your adventures.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time Weather Data</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Interactive Maps</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>PDF Reports</span>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
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

        {/* Settings Manager */}
        <SettingsManager
          settings={settings}
          onSettingsChange={handleSettingsChange}
          className="lg:col-span-1"
        />
      </div>

      {/* Weather Data Visualization */}
      {hasData && (
        <div className="space-y-8">
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
            <WeatherCharts
              forecasts={forecasts}
              units={settings.units}
              onPointSelect={handlePointSelection}
              selectedPoint={selectedPoint}
            />
          </div>

          {/* Export Section */}
          <PDFExport
            route={route}
            forecasts={forecasts}
            settings={settings}
          />
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
                <p className="text-sm text-muted-foreground">Generate and download PDF reports (coming soon)</p>
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

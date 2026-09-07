"use client";

import { useState, useCallback } from 'react';
import { 
  Thermometer, 
  Wind, 
  ShieldCheck, 
  Activity 
} from 'lucide-react';
import { 
  SplitScreenLayout, 
  MobileTab, 
  LeftPanel, 
  RightStage 
} from '@/components/workstation';
import { AtmosphericCanvas3D } from '@/components/canvas/AtmosphericCanvas3D';
import { 
  WeatherCharts, 
  WeatherTimeline, 
  WeatherSummary, 
  UnifiedExport 
} from '@/components/features';
import { MetricGrid } from '@/components/ui';
import dynamic from 'next/dynamic';
import { Route, AppSettings, SelectedWeatherPoint } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { createAlpine45KmSampleRoute } from '@/lib/sample-routes';
import { useProgressiveWeather } from '@/hooks/useProgressiveWeather';
import { useMultiSourceWeather } from '@/hooks/useMultiSourceWeather';
import { useWeatherSourcePreferences, useAppStore } from '@/store/app-store';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { playTelemetryChirp } from '@/lib/audio-fx';
import { toast } from 'sonner';

const SpatialWorkspace = dynamic(
  () => import('@/components/3d').then((mod) => mod.SpatialWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#12100E] text-[#E5A93C] font-mono text-xs select-none">
        <div className="h-10 w-10 border-2 border-[#E5A93C] border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_20px_rgba(229,169,60,0.35)]" />
        <span className="tracking-widest uppercase text-[#F5F2EB]">INITIALIZING 3D SPATIAL WORKSPACE...</span>
      </div>
    ),
  }
);

export default function Home() {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [route, setRoute] = useState<Route | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => ({
    startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
    forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
    units: 'metric',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
  const [selectedPoint, setSelectedPoint] = useState<SelectedWeatherPoint | null>(null);
  const [isSavingExpedition, setIsSavingExpedition] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('parameters');

  // Weather source preferences from store
  const weatherSourcePreferences = useWeatherSourcePreferences();
  const updateWeatherSourcePreferences = useAppStore((state) => state.updateWeatherSourcePreferences);

  const handleWeatherSourceChange = useCallback((prefs: WeatherSourcePreferences) => {
    updateWeatherSourcePreferences(prefs);
  }, [updateWeatherSourcePreferences]);

  // Progressive weather loading hook
  const {
    forecasts,
    isLoading: isGeneratingForecast,
    progress,
    loadWeatherData,
    setForecasts,
    reset: resetWeatherData,
  } = useProgressiveWeather({
    onError: (error) => {
      console.error('Weather loading failed:', error);
      toast.error('Failed to load weather data. Please check network connection.');
    },
  });

  // Multi-source comparison hook
  const {
    forecasts: multiSourceForecasts,
    isLoading: isLoadingMultiSource,
    loadMultiSourceWeather,
    reset: resetMultiSource,
  } = useMultiSourceWeather();

  const handleRouteLoaded = (newRoute: Route) => {
    setRoute(newRoute);
    resetWeatherData();
    resetMultiSource();
    setSelectedPoint(null);
  };

  const handleResetRoute = () => {
    setRoute(null);
    resetWeatherData();
    resetMultiSource();
    setSelectedPoint(null);
    toast.info('Expedition ejected. Recon standby.');
  };

  const handlePointSelection = useCallback(
    (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => {
      setSelectedPoint((prev) => {
        if (prev?.forecastIndex === forecastIndex && prev?.source === source) {
          return prev;
        }
        return forecasts[forecastIndex]
          ? {
              forecastIndex,
              forecast: forecasts[forecastIndex],
              source,
            }
          : null;
      });
    },
    [forecasts]
  );

  const handleGenerateForecast = async () => {
    if (!route) {
      toast.error('Please upload a GPX file first');
      return;
    }

    try {
      if (weatherSourcePreferences.comparisonMode === 'comparison') {
        toast.loading(`Querying ${weatherSourcePreferences.enabledSources.length} meteorological models...`, {
          id: 'multi-source',
        });
        await Promise.all([
          loadWeatherData(route, settings),
          loadMultiSourceWeather(
            route,
            settings,
            weatherSourcePreferences.enabledSources,
            weatherSourcePreferences.customApiKeys
          ),
        ]);
        toast.dismiss('multi-source');
        toast.success(
          `Consensus generated across ${weatherSourcePreferences.enabledSources.length} supercomputers!`
        );
      } else {
        await loadWeatherData(route, settings);
        toast.success(`Weather forecast generated for ${route.name}!`);
      }
    } catch (error) {
      toast.dismiss('multi-source');
      console.error('Forecast generation error:', error);
    }
  };

  const handleSaveExpeditionToAtlas = async () => {
    if (!route) {
      toast.error('No armed expedition route to save');
      return;
    }
    setIsSavingExpedition(true);
    try {
      playTelemetryChirp();
      toast.loading('Archiving expedition in MongoDB Atlas...', { id: 'save-exp' });
      const res = await fetch('/api/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: route.name,
          route,
          forecasts,
          settings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save expedition');
      }
      toast.dismiss('save-exp');
      toast.success(`Archived "${route.name}" in MongoDB Atlas!`);
    } catch (err) {
      toast.dismiss('save-exp');
      toast.error(err instanceof Error ? err.message : 'Failed to archive expedition');
    } finally {
      setIsSavingExpedition(false);
    }
  };

  // Render mobile specific view for Telemetry or Dispatch tabs
  const renderMobileSpecialContent = () => {
    if (mobileTab === 'telemetry') {
      return (
        <div className="p-4 space-y-5 overflow-y-auto h-full bg-[#12100E] font-mono text-xs">
          {forecasts.length === 0 ? (
            <div className="text-center py-16 text-[#A89F91]">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-50 text-[#E5A93C]" />
              <p>NO TELEMETRY AVAILABLE. GENERATE FORECAST IN PARAMETERS.</p>
            </div>
          ) : (
            <>
              <MetricGrid
                metrics={[
                  {
                    icon: <Thermometer className="h-5 w-5" />,
                    label: "Temperature Range",
                    value: `${Math.min(...forecasts.map(f => f.weather.temp)).toFixed(0)}° - ${Math.max(...forecasts.map(f => f.weather.temp)).toFixed(0)}°C`,
                    trend: "Min / Max",
                    trendDirection: 'neutral',
                    color: 'red',
                  },
                  {
                    icon: <Wind className="h-5 w-5" />,
                    label: "Max Velocity",
                    value: `${Math.max(...forecasts.map(f => f.weather.wind_speed * 3.6)).toFixed(0)} km/h`,
                    trend: "Peak Gusts",
                    trendDirection: 'up',
                    color: 'blue',
                  },
                ]}
              />

              <WeatherTimeline
                forecasts={forecasts}
                units={settings.units}
                onPointSelect={handlePointSelection}
                selectedPoint={selectedPoint}
              />

              <WeatherCharts
                forecasts={forecasts}
                units={settings.units}
                onPointSelect={handlePointSelection}
                selectedPoint={selectedPoint}
              />
            </>
          )}
        </div>
      );
    }

    if (mobileTab === 'dispatch') {
      return (
        <div className="p-4 space-y-5 overflow-y-auto h-full bg-[#12100E]">
          {!route || forecasts.length === 0 ? (
            <div className="text-center py-16 text-[#A89F91] font-mono text-xs">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-50 text-[#82937D]" />
              <p>DISPATCH READY ONCE FORECAST DATA IS SYNTHESIZED.</p>
            </div>
          ) : (
            <>
              <WeatherSummary forecasts={forecasts} units={settings.units} />
              <UnifiedExport route={route} forecasts={forecasts} settings={settings} />
            </>
          )}
        </div>
      );
    }

    return null;
  };

  if (viewMode === '3d') {
    return (
      <SpatialWorkspace
        route={route}
        forecasts={forecasts}
        settings={settings}
        preferences={weatherSourcePreferences}
        selectedPoint={selectedPoint}
        isLoading={isGeneratingForecast || isLoadingMultiSource}
        onRouteLoaded={handleRouteLoaded}
        onResetRoute={handleResetRoute}
        onSettingsChange={setSettings}
        onPreferencesChange={handleWeatherSourceChange}
        onGenerateForecast={handleGenerateForecast}
        onPointSelect={handlePointSelection}
        onToggleViewMode={() => setViewMode('2d')}
        onSaveExpedition={handleSaveExpeditionToAtlas}
        isSavingExpedition={isSavingExpedition}
      />
    );
  }

  return (
    <>
      {/* Photorealistic Ambient Atmospheric Canvas */}
      <AtmosphericCanvas3D />

      {/* Modern High-Density Split-Screen Workstation Layout */}
      <SplitScreenLayout
        route={route}
        forecasts={forecasts}
        onResetRoute={handleResetRoute}
        onSaveExpedition={handleSaveExpeditionToAtlas}
        isSavingExpedition={isSavingExpedition}
        activeMobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
        onToggleViewMode={() => setViewMode('3d')}
        leftPanel={
          <LeftPanel
            route={route}
            settings={settings}
            preferences={weatherSourcePreferences}
            onRouteLoaded={handleRouteLoaded}
            onResetRoute={handleResetRoute}
            onSettingsChange={setSettings}
            onPreferencesChange={handleWeatherSourceChange}
            onGenerateForecast={handleGenerateForecast}
            isLoading={isGeneratingForecast || isLoadingMultiSource}
            hasForecasts={forecasts.length > 0}
          />
        }
        mapStage={
          mobileTab === 'telemetry' || mobileTab === 'dispatch' ? (
            renderMobileSpecialContent()
          ) : (
            <RightStage
              route={route}
              forecasts={forecasts}
              selectedPoint={selectedPoint}
              onPointSelect={handlePointSelection}
              units={settings.units}
              onLoadSampleAlpine={() => {
                const sampleAlpine = createAlpine45KmSampleRoute();
                handleRouteLoaded(sampleAlpine);
                toast.success('Loaded "Alpine 45km" Swiss Traverse');
              }}
            />
          )
        }
      />
    </>
  );
}

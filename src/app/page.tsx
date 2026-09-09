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
  WorkstationStage,
  LeftPanel, 
  RightStage,
  ModelComparisonSuite,
  AtlasArchiveModal,
  ElevationWeatherSync
} from '@/components/workstation';
import { 
  WeatherCharts, 
  WeatherTimeline, 
  WeatherSummary, 
  UnifiedExport 
} from '@/components/features';
import { MetricGrid } from '@/components/ui';
import { Route, AppSettings, SelectedWeatherPoint, WeatherForecast } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { createAlpine45KmSampleRoute } from '@/lib/sample-routes';
import { useProgressiveWeather } from '@/hooks/useProgressiveWeather';
import { useMultiSourceWeather } from '@/hooks/useMultiSourceWeather';
import { useWeatherSourcePreferences, useAppStore } from '@/store/app-store';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { playTelemetryChirp } from '@/lib/audio-fx';
import { toast } from 'sonner';

export default function Home() {
  const [stage, setStage] = useState<WorkstationStage>('radar');
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
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
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
    loadWeatherData,
    setForecasts,
    reset: resetWeatherData,
  } = useProgressiveWeather({
    onError: (error) => {
      console.error('Weather loading failed:', error);
      toast.error('Failed to load weather data. Please check network connection.');
    },
  });

  const handleLoadSavedExpedition = useCallback(({
    route: savedRoute,
    forecasts: savedForecasts,
    settings: savedSettings,
  }: {
    route: Route;
    forecasts: WeatherForecast[];
    settings?: AppSettings;
  }) => {
    setRoute(savedRoute);
    setForecasts(savedForecasts);
    if (savedSettings) {
      setSettings(savedSettings);
    }
    setSelectedPoint(null);
    setStage('radar');
  }, [setForecasts]);

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
    setStage('radar');
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
      toast.loading(`Querying meteorological ensemble models...`, {
        id: 'forecast-gen',
      });

      // Always load base weather and multi-source consensus in parallel
      await Promise.allSettled([
        loadWeatherData(route, settings),
        loadMultiSourceWeather(
          route,
          settings,
          weatherSourcePreferences.enabledSources,
          weatherSourcePreferences.customApiKeys
        ),
      ]);

      toast.dismiss('forecast-gen');
      toast.success(`Weather forecast synthesized for ${route.name}!`);
    } catch (error) {
      toast.dismiss('forecast-gen');
      console.error('Forecast generation error:', error);
      toast.error('Error synthesizing forecast data.');
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
        <div className="p-3 sm:p-4 space-y-4 overflow-y-auto h-full bg-[#12100E] font-mono text-xs custom-scrollbar">
          {forecasts.length === 0 ? (
            <div className="text-center py-16 text-[#A89F91]">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-50 text-[#E5A93C]" />
              <p>NO TELEMETRY AVAILABLE. GENERATE FORECAST IN PARAMETERS.</p>
            </div>
          ) : (
            <>
              {route && (
                <div className="h-[230px] rounded-xl border border-[#453A2E] bg-[#16120F] overflow-hidden">
                  <ElevationWeatherSync
                    route={route}
                    forecasts={forecasts}
                    units={settings.units}
                    hoveredIndex={selectedPoint?.forecastIndex ?? null}
                    onHoverPoint={() => {}}
                    onSelectPoint={(f, idx) => handlePointSelection(idx, 'chart')}
                    isExpanded={true}
                  />
                </div>
              )}

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

  return (
    <>
      <SplitScreenLayout
        route={route}
        forecasts={forecasts}
        onResetRoute={handleResetRoute}
        onSaveExpedition={handleSaveExpeditionToAtlas}
        onOpenArchive={() => setIsArchiveOpen(true)}
        isSavingExpedition={isSavingExpedition}
        activeStage={stage}
        onStageChange={setStage}
        activeMobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
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
            onOpenComparison={() => setStage('comparison')}
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
              onOpenComparison={() => setStage('comparison')}
              onLoadSampleAlpine={() => {
                const sampleAlpine = createAlpine45KmSampleRoute();
                handleRouteLoaded(sampleAlpine);
                toast.success('Loaded "Alpine 45km" Swiss Traverse');
              }}
            />
          )
        }
        comparisonStage={
          <ModelComparisonSuite
            route={route}
            forecasts={forecasts}
            multiSourceForecasts={multiSourceForecasts}
            preferences={weatherSourcePreferences}
            onPreferencesChange={handleWeatherSourceChange}
            units={settings.units}
            onSelectPoint={(idx) => handlePointSelection(idx, 'chart')}
            onBackToRadar={() => setStage('radar')}
          />
        }
        exportStage={
          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto h-full bg-[#12100E] max-w-7xl mx-auto w-full custom-scrollbar">
            {!route || forecasts.length === 0 ? (
              <div className="text-center py-24 text-[#A89F91] font-mono text-xs">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50 text-[#82937D]" />
                <p className="uppercase tracking-wider">EXPEDITION DOSSIER DISPATCH READY ONCE ROUTE & FORECAST DATA ARE ARMED.</p>
              </div>
            ) : (
              <>
                <WeatherSummary forecasts={forecasts} units={settings.units} />
                <UnifiedExport route={route} forecasts={forecasts} settings={settings} />
              </>
            )}
          </div>
        }
      />

      <AtlasArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        activeRoute={route}
        onLoadExpedition={handleLoadSavedExpedition}
        onSaveCurrentRoute={handleSaveExpeditionToAtlas}
        isSavingCurrent={isSavingExpedition}
      />
    </>
  );
}

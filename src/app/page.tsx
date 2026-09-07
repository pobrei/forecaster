"use client";

import { useState, useCallback } from 'react';
import { Thermometer, Wind, CloudRain, Sun, Layers, Compass, ShieldCheck, MapPin, Activity, Database } from 'lucide-react';
import { FileUpload } from '@/components/features/ClientOnlyFileUpload';
import { SettingsPanel } from '@/components/features/SettingsPanel';
import { WeatherSourceSelector } from '@/components/features/WeatherSourceSelector';
import { WeatherMap } from '@/components/features/WeatherMap';
import { WeatherCharts } from '@/components/features/WeatherCharts';
import { WeatherTimeline } from '@/components/features/WeatherTimeline';
import { WeatherSummary } from '@/components/features/WeatherSummary';
import { UnifiedExport } from '@/components/features/UnifiedExport';
import { WeatherSourceComparison } from '@/components/features/WeatherSourceComparison';
import { PerformanceIndicator } from '@/components/ui/performance-indicator';
import { ProgressBreadcrumbs } from '@/components/ui/progress-breadcrumbs';
import { MetricGrid } from '@/components/ui/metric-card';
import { SmartSuggestions, generateWeatherSuggestions } from '@/components/ui/smart-suggestions';
import { Header } from '@/components/layout/Header';
import { PWAInstallBanner, PWAOfflineBanner } from '@/components/features/PWAInstallBanner';
import { AtmosphericCanvas3D } from '@/components/canvas/AtmosphericCanvas3D';
import { ExpeditionTablet } from '@/components/device/ExpeditionTablet';
import { DossierFolder } from '@/components/dossier/DossierFolder';
import { DossierPillDock } from '@/components/dossier/DossierPillDock';
import { Route, AppSettings, SelectedWeatherPoint, SavedExpedition } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { useProgressiveWeather } from '@/hooks/useProgressiveWeather';
import { useMultiSourceWeather } from '@/hooks/useMultiSourceWeather';
import { useWeatherSourcePreferences, useAppStore } from '@/store/app-store';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { playTelemetryChirp } from '@/lib/audio-fx';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Home() {
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
    setForecasts,
    reset: resetWeatherData
  } = useProgressiveWeather({
    onProgress: (progress) => {
      if (progress.total > 1) {
        console.log(`Weather loading progress: ${progress.percentage}%`);
      }
    },
    onError: (error) => {
      console.error('Weather loading failed:', error);
      toast.error('Failed to load weather data. Please check your network connection and try again.');
    }
  });

  // Multi-source comparison hook
  const {
    forecasts: multiSourceForecasts,
    isLoading: isLoadingMultiSource,
    loadMultiSourceWeather,
    reset: resetMultiSource
  } = useMultiSourceWeather();

  const handleRouteUploaded = (newRoute: Route) => {
    setRoute(newRoute);
    resetWeatherData();
    resetMultiSource();
    setSelectedPoint(null);
    toast.success(`Route "${newRoute.name}" loaded successfully!`);
  };

  const handleExpeditionLoaded = useCallback((expedition: SavedExpedition) => {
    setRoute(expedition.route);
    if (expedition.settings) {
      setSettings(expedition.settings);
    }
    if (expedition.forecasts && expedition.forecasts.length > 0) {
      setForecasts(expedition.forecasts);
    } else {
      resetWeatherData();
    }
    resetMultiSource();
    setSelectedPoint(null);
  }, [resetWeatherData, resetMultiSource, setForecasts]);

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
      toast.success(`Archived "${route.name}" in MongoDB Atlas!`, {
        description: 'Permanently saved to cloud database. Access it anytime under ATLAS ARCHIVE.',
      });
    } catch (err) {
      toast.dismiss('save-exp');
      toast.error(err instanceof Error ? err.message : 'Failed to archive expedition');
    } finally {
      setIsSavingExpedition(false);
    }
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
      if (weatherSourcePreferences.comparisonMode === 'comparison') {
        toast.loading(`Querying ${weatherSourcePreferences.enabledSources.length} meteorological models...`, { id: 'multi-source' });
        await Promise.all([
          loadWeatherData(route, settings),
          loadMultiSourceWeather(
            route,
            settings,
            weatherSourcePreferences.enabledSources,
            weatherSourcePreferences.customApiKeys
          )
        ]);
        toast.dismiss('multi-source');
        toast.success(`Multi-model forecast generated across ${weatherSourcePreferences.enabledSources.length} models!`);
      } else {
        await loadWeatherData(route, settings);
      }
    } catch (error) {
      toast.dismiss('multi-source');
      console.error('Forecast generation error:', error);
    }
  };

  const handleLoadComparison = async () => {
    if (!route) {
      toast.error('Please upload a GPX file first');
      return;
    }

    toast.loading(`Loading comparison for ${weatherSourcePreferences.enabledSources.length} models...`, { id: 'multi-source' });
    try {
      await loadMultiSourceWeather(
        route,
        settings,
        weatherSourcePreferences.enabledSources,
        weatherSourcePreferences.customApiKeys
      );
      toast.dismiss('multi-source');
      toast.success('Model comparison data loaded!');
    } catch {
      toast.dismiss('multi-source');
      toast.error('Failed to load comparison data');
    }
  };

  const hasData = route && forecasts.length > 0;
  const hasMultiSourceData = multiSourceForecasts.length > 0;

  return (
    <>
      {/* 1. Photorealistic Nature 3D Atmospheric Canvas (Wind, Floating Leaves & Dust) */}
      <AtmosphericCanvas3D />

      {/* 2. Interactive Expedition Tablet / iPad Touch Screen Device Object */}
      <div className="relative z-10 w-full h-dvh overflow-hidden">
        <ExpeditionTablet>
          {/* Tablet Screen Header Navigation */}
          <Header />
          <PWAOfflineBanner />

          {/* Floating Tablet Dossier Dock */}
          <DossierPillDock />

          <main className="container mx-auto px-3 sm:px-6 py-6 md:py-10 pb-36 max-w-7xl">
            {/* Editorial Hero Section (Mosby Files & Gionatan Nese Minimalist Luxury) */}
            <section className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 select-none">
          {/* Classification & Metadata Top Stamp */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-primary/20 bg-primary/5 font-mono text-[10px] tracking-widest text-primary uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
            <span>CLASSIFIED // EXPEDITION RECONNAISSANCE</span>
            <span>•</span>
            <span className="hidden sm:inline">DATUM: WGS84</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 text-foreground">
            FORECASTER <span className="text-muted-foreground/50 font-serif italic font-normal">ARCHIVE</span>
          </h1>

          <p className="font-mono text-xs sm:text-sm text-muted-foreground/80 max-w-2xl mx-auto uppercase tracking-wide leading-relaxed">
            Atmospheric Intelligence • Multi-Model Divergence • Route Topography
          </p>

          <div className="flex items-center justify-center gap-6 mt-6 font-mono text-[11px] text-muted-foreground/70 border-y border-border/40 py-2.5 max-w-xl mx-auto">
            <span className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>GLOBAL ENSEMBLE</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>RADAR SYNCHRONIZED</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>ZERO TRACKING</span>
            </span>
          </div>
        </section>

        {/* Progress Breadcrumbs */}
        <ProgressBreadcrumbs
          hasGpxData={!!route}
          hasWeatherData={!!forecasts.length}
          className="mb-10 max-w-3xl mx-auto"
        />

        {/* ========================================================== */}
        {/* FILE // 01: ROUTE INGESTION & MISSION PARAMETERS           */}
        {/* ========================================================== */}
        <DossierFolder
          id="dossier-ingest"
          fileNumber="01"
          title="Route Ingestion & Telemetry"
          category="Mission Brief & Parameters"
          classification="UNCLASSIFIED // GPX INGESTION"
          coordinateStamp="DATUM: WGS84 // RECON"
          statusBadge={route ? "ROUTE ARMED" : "AWAITING GPX"}
          accentColor="indigo"
          defaultExpanded={true}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Upload + Quick Presets */}
            <div className="lg:col-span-4">
              <FileUpload
                onRouteUploaded={handleRouteUploaded}
                onExpeditionLoaded={handleExpeditionLoaded}
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

          {/* Active Route Telemetry Strip & Atlas Save Action */}
          {route && (
            <div className="mt-6 pt-5 border-t border-border/40 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono select-none">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase">EXPEDITION NAME</div>
                  <div className="font-semibold text-sm truncate text-foreground">{route.name}</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase">TOTAL DISTANCE</div>
                  <div className="font-semibold text-sm text-primary">{route.totalDistance.toFixed(1)} km</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase">ELEVATION GAIN</div>
                  <div className="font-semibold text-sm text-foreground">
                    {route.totalElevationGain ? `+${Math.round(route.totalElevationGain)}m` : 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-[10px] text-muted-foreground uppercase">WAYPOINT NODES</div>
                  <div className="font-semibold text-sm text-foreground">{route.points.length} coords</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/20">
                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                  <span>MONGODB ATLAS PERSISTENCE ACTIVE</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveExpeditionToAtlas}
                  disabled={isSavingExpedition}
                  className="px-3.5 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                >
                  <Database className={cn("h-3.5 w-3.5 text-emerald-500", isSavingExpedition && "animate-spin")} />
                  <span>{isSavingExpedition ? 'Archiving to Atlas...' : 'Save Expedition to Atlas Archive'}</span>
                </button>
              </div>
            </div>
          )}
        </DossierFolder>

        {/* Progress Indicator for Large Routes */}
        {isGeneratingForecast && progress.total > 1 && (
          <div className="mb-8 max-w-2xl mx-auto">
            <PerformanceIndicator
              isProcessing={isGeneratingForecast}
              progress={progress.percentage}
              currentStep={`Synthesizing weather telemetry... ${progress.current}/${progress.total}`}
              totalSteps={progress.total}
              currentStepIndex={progress.current - 1}
            />
          </div>
        )}

        {/* ========================================================== */}
        {/* FILE // 02: MODEL ENSEMBLE & DIVERGENCE INTELLIGENCE       */}
        {/* ========================================================== */}
        <DossierFolder
          id="dossier-ensemble"
          fileNumber="02"
          title="Model Ensemble & Divergence"
          category="Cross-Model Meteorological Intelligence"
          classification="ECMWF • GFS • ICON • METEO-FRANCE"
          coordinateStamp="6 GLOBAL ENSEMBLE MODELS"
          statusBadge={hasMultiSourceData ? "CONSENSUS COMPUTED" : "READY TO RUN"}
          accentColor="blue"
          defaultExpanded={true}
        >
          {!route ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40 text-blue-500" />
              <p className="font-mono text-xs uppercase tracking-wider">
                NO EXPEDITION ARMED. PLEASE LOAD A GPX ROUTE IN FILE // 01.
              </p>
            </div>
          ) : !hasMultiSourceData && !isLoadingMultiSource ? (
            <div className="py-10 text-center space-y-4 max-w-xl mx-auto">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Cross-Analyze {weatherSourcePreferences.enabledSources.length} Meteorological Models
                </h3>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  Compare predictions from European (ECMWF IFS), US (NOAA GFS), German (DWD ICON), French (Météo-France), and Canadian (GEM) global supercomputers along your exact coordinates.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadComparison}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
              >
                Launch Model Comparison ({weatherSourcePreferences.enabledSources.length} Active Models)
              </button>
            </div>
          ) : isLoadingMultiSource ? (
            <div className="py-12 text-center space-y-4">
              <div className="h-10 w-10 mx-auto border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Cross-analyzing meteorological predictions across {weatherSourcePreferences.enabledSources.length} supercomputers...
              </p>
            </div>
          ) : (
            <WeatherSourceComparison
              forecasts={multiSourceForecasts}
              units={settings.units}
              selectedPointIndex={selectedPoint?.forecastIndex}
              onPointSelect={handlePointSelection}
            />
          )}
        </DossierFolder>

        {/* ========================================================== */}
        {/* FILE // 03: TACTICAL RADAR & TOPOGRAPHIC MAP               */}
        {/* ========================================================== */}
        <DossierFolder
          id="dossier-radar"
          fileNumber="03"
          title="Tactical Satellite Radar & Topography"
          category="Geospatial Topographic Tracking"
          classification="OPENLAYERS SATELLITE ENGINE"
          coordinateStamp="VECTOR WIND MAPPING"
          statusBadge={route ? "TRACK RENDERED" : "AWAITING COORDINATES"}
          accentColor="emerald"
          defaultExpanded={true}
        >
          {!route ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40 text-emerald-500" />
              <p className="font-mono text-xs uppercase tracking-wider">
                TOPOGRAPHIC RADAR IDLE. LOAD A ROUTE TO INITIALIZE MAPPING.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <WeatherMap
                route={route}
                forecasts={forecasts}
                units={settings.units}
                selectedPoint={selectedPoint}
                onPointSelect={handlePointSelection}
              />
            </div>
          )}
        </DossierFolder>

        {/* ========================================================== */}
        {/* FILE // 04: ATMOSPHERIC DYNAMICS & TIMELINE                */}
        {/* ========================================================== */}
        <DossierFolder
          id="dossier-dynamics"
          fileNumber="04"
          title="Atmospheric Dynamics & Timeline"
          category="Telemetry Curves & Conditions"
          classification="BAROMETRIC & THERMAL PROFILES"
          coordinateStamp="TIME SERIES RESOLUTION"
          statusBadge={hasData ? "TELEMETRY SYNCED" : "PENDING FORECAST"}
          accentColor="amber"
          defaultExpanded={true}
        >
          {!hasData ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40 text-amber-500" />
              <p className="font-mono text-xs uppercase tracking-wider">
                NO ATMOSPHERIC READINGS. CLICK &quot;GENERATE WEATHER FORECAST&quot; IN FILE // 01.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Smart Weather Suggestions */}
              <SmartSuggestions
                suggestions={generateWeatherSuggestions(forecasts)}
                onApplySuggestion={(suggestion) => {
                  toast.info(`Applied recommendation: ${suggestion.title}`);
                }}
                onDismissSuggestion={() => {}}
              />

              {/* Weather Metrics Grid */}
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
                    trend: "Peak wind velocity",
                    trendDirection: 'up',
                    color: 'blue'
                  },
                  {
                    icon: <CloudRain className="h-6 w-6" />,
                    label: "Precipitation",
                    value: `${forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length} pts`,
                    trend: `${Math.round((forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length / forecasts.length) * 100)}% route rain exposure`,
                    trendDirection: forecasts.filter(f => (f.weather.rain?.['1h'] || 0) > 0).length > 0 ? 'up' : 'neutral',
                    color: 'purple'
                  },
                  {
                    icon: <Sun className="h-6 w-6" />,
                    label: "Data Density",
                    value: `${forecasts.length} pts`,
                    trend: "Analyzed waypoints",
                    trendDirection: 'neutral',
                    color: 'yellow'
                  }
                ]}
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

              {/* Detailed Elevation & Parameter Charts */}
              <WeatherCharts
                forecasts={forecasts}
                units={settings.units}
                onPointSelect={handlePointSelection}
                selectedPoint={selectedPoint}
              />
            </div>
          )}
        </DossierFolder>

        {/* ========================================================== */}
        {/* FILE // 05: EXPEDITION DISPATCH & ARCHIVE EXPORT           */}
        {/* ========================================================== */}
        <DossierFolder
          id="dossier-dispatch"
          fileNumber="05"
          title="Expedition Dispatch & Archive"
          category="Cryptographic PDF & GeoJSON Dispatch"
          classification="VERIFIED WEATHER REPORT"
          coordinateStamp="STANDARDIZED EXPORT"
          statusBadge={hasData ? "EXPORT READY" : "AWAITING DATA"}
          accentColor="purple"
          defaultExpanded={true}
        >
          {!hasData || !route ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-40 text-purple-500" />
              <p className="font-mono text-xs uppercase tracking-wider">
                DISPATCH GENERATOR ON STANDBY. GENERATE FORECAST TO ACTIVATE EXPORTS.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Atlas Cloud Archive Mission Banner */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Save Expedition to Atlas Cloud Archive</h4>
                    <p className="text-xs text-muted-foreground">Persist route coordinates, weather synthesis, and ensemble results to MongoDB Atlas for instant multi-device reload.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveExpeditionToAtlas}
                  disabled={isSavingExpedition}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <Database className={cn("h-3.5 w-3.5", isSavingExpedition && "animate-spin")} />
                  <span>{isSavingExpedition ? 'Archiving...' : 'Save to Atlas Archive'}</span>
                </button>
              </div>

              <UnifiedExport
                route={route}
                forecasts={forecasts}
                settings={settings}
              />
            </div>
          )}
        </DossierFolder>
          </main>
        </ExpeditionTablet>
      </div>

      <PWAInstallBanner />
    </>
  );
}

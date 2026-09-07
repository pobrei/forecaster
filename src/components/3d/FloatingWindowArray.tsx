"use client";

import React, { useState } from 'react';
import { Float, Html } from '@react-three/drei';
import { 
  Compass, 
  Layers, 
  Activity, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Terminal,
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast, SelectedWeatherPoint, AppSettings } from '@/types';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { LeftPanel } from '@/components/workstation/LeftPanel';
import { WeatherMap, BasemapMode } from '@/components/features/WeatherMap';
import { ElevationWeatherSync } from '@/components/workstation/ElevationWeatherSync';
import { ModelDivergenceRibbon } from '@/components/workstation/ModelDivergenceRibbon';
import { MapHUDControls } from '@/components/workstation/MapHUDControls';
import { createAlpine45KmSampleRoute } from '@/lib/sample-routes';
import { toast } from 'sonner';

interface FloatingWindowArrayProps {
  route: Route | null;
  forecasts: WeatherForecast[];
  settings: AppSettings;
  preferences: WeatherSourcePreferences;
  selectedPoint: SelectedWeatherPoint | null;
  isLoading: boolean;
  onRouteLoaded: (route: Route) => void;
  onResetRoute: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  onGenerateForecast: () => void;
  onPointSelect: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  onSaveExpedition?: () => void;
  isSavingExpedition?: boolean;
  onFocusCamera?: (mode: 'overview' | 'left' | 'center' | 'right') => void;
  activeCameraMode?: 'overview' | 'left' | 'center' | 'right';
}

const DISTANCE_FACTOR = 2.4;

export function FloatingWindowArray({
  route,
  forecasts,
  settings,
  preferences,
  selectedPoint,
  isLoading,
  onRouteLoaded,
  onResetRoute,
  onSettingsChange,
  onPreferencesChange,
  onGenerateForecast,
  onPointSelect,
  onSaveExpedition,
  isSavingExpedition = false,
  onFocusCamera,
  activeCameraMode = 'overview',
}: FloatingWindowArrayProps) {
  // Center Map HUD state
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
  const [radarActive, setRadarActive] = useState(true);
  const [windVectorsActive, setWindVectorsActive] = useState(true);

  // Right Drawer state
  const [isElevationExpanded, setIsElevationExpanded] = useState(false);

  const handleLoadSample = () => {
    const sample = createAlpine45KmSampleRoute();
    onRouteLoaded(sample);
    toast.success('Loaded "Alpine 45km" Swiss Traverse in 3D Spatial Radar');
  };

  return (
    <group name="floating-window-array">
      {/* ========================================================================= */}
      {/* WINDOW 1: LEFT HUD - RECON INGESTION & SPEED PARAMETERS                   */}
      {/* Positioned on cylindrical arc: [-3.5, 0, 0.35], Rotation: [0, 0.24, 0]    */}
      {/* ========================================================================= */}
      <group position={[-3.5, 0, 0.35]} rotation={[0, 0.24, 0]}>
        <Float speed={1.0} rotationIntensity={0.015} floatIntensity={0.05}>
          <Html
            transform
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '380px', height: '580px' }}
          >
            <div
              className={cn(
                "w-[380px] h-[580px] flex flex-col rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/20 overflow-hidden font-mono text-xs text-slate-100 transition-all duration-300",
                activeCameraMode === 'left' && "ring-2 ring-cyan-400 border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.3)]"
              )}
            >
              {/* Window Top Tactical Header */}
              <div className="px-3 py-2 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <span className="font-bold tracking-wider text-cyan-300 text-[11px]">
                    FILE // 01 • INGESTION
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 hidden sm:inline">GPS RECON</span>
                  {onFocusCamera && (
                    <button
                      type="button"
                      onClick={() => onFocusCamera(activeCameraMode === 'left' ? 'overview' : 'left')}
                      title={activeCameraMode === 'left' ? "Reset to Overview" : "Focus Panel"}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Window Content: Scrollable Left Panel */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
                <LeftPanel
                  route={route}
                  settings={settings}
                  preferences={preferences}
                  onRouteLoaded={onRouteLoaded}
                  onResetRoute={onResetRoute}
                  onSettingsChange={onSettingsChange}
                  onPreferencesChange={onPreferencesChange}
                  onGenerateForecast={onGenerateForecast}
                  isLoading={isLoading}
                  hasForecasts={forecasts.length > 0}
                />
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500 select-none">
                <span>CHANNEL: GPX-01</span>
                <span>STATUS: ARMED</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>

      {/* ========================================================================= */}
      {/* WINDOW 2: CENTER HUD - TACTICAL GEOSPATIAL RADAR & OPENLAYERS MAP        */}
      {/* Positioned at center: [0, 0, 0], Rotation: [0, 0, 0]                     */}
      {/* ========================================================================= */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <Float speed={1.0} rotationIntensity={0.015} floatIntensity={0.05}>
          <Html
            transform
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '620px', height: '580px' }}
          >
            <div
              className={cn(
                "w-[620px] h-[580px] flex flex-col rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 overflow-hidden font-mono text-xs text-slate-100 transition-all duration-300",
                activeCameraMode === 'center' && "ring-2 ring-cyan-400 border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.3)]"
              )}
            >
              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="font-bold tracking-wider text-emerald-300 text-[11px]">
                    FILE // 02 • GEOSPATIAL RADAR
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[9px]">
                    {(['satellite', 'dark', 'mono', 'terrain', 'topo'] as BasemapMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBasemap(mode)}
                        className={cn(
                          "px-1.5 py-0.5 rounded uppercase transition-colors cursor-pointer",
                          basemap === mode
                            ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {mode === 'mono' ? 'B&W' : mode}
                      </button>
                    ))}
                  </div>

                  {onFocusCamera && (
                    <button
                      type="button"
                      onClick={() => onFocusCamera(activeCameraMode === 'center' ? 'overview' : 'center')}
                      title={activeCameraMode === 'center' ? "Reset to Overview" : "Focus Panel"}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Window Content: Map Viewport or Zero-State */}
              <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-slate-950">
                {route ? (
                  <>
                    <WeatherMap
                      route={route}
                      forecasts={forecasts}
                      units={settings.units}
                      selectedPoint={selectedPoint}
                      onPointSelect={onPointSelect}
                      basemapMode={basemap}
                      onBasemapChange={setBasemap}
                      className="w-full h-full border-none rounded-none"
                    />

                    {/* Floating Tactical HUD Controls */}
                    <div className="absolute top-3 right-3 z-30 pointer-events-auto flex flex-col items-end gap-2 max-w-xs">
                      <MapHUDControls
                        radarActive={radarActive}
                        onToggleRadar={() => setRadarActive(!radarActive)}
                        windVectorsActive={windVectorsActive}
                        onToggleWindVectors={() => setWindVectorsActive(!windVectorsActive)}
                        cloudsActive={false}
                        onToggleClouds={() => {}}
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                    <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2.5 shadow-inner">
                      <Compass className="h-6 w-6" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 font-mono tracking-wide">
                      EXPEDITION GEOSPATIAL RADAR
                    </h3>
                    <p className="font-sans text-[11px] text-slate-400 max-w-xs mt-1 mb-4 leading-relaxed">
                      Satellite terrain engine standing by. Ingest a GPX track or load the Swiss Alps traverse to plot polyline atmospheric telemetry.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Load Alpine 45km Route</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-3.5 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500 select-none">
                <span>PROJECTION: EPSG:3857</span>
                <span>RADAR: ACTIVE</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>

      {/* ========================================================================= */}
      {/* WINDOW 3: RIGHT HUD - DYNAMIC TELEMETRY & MULTI-MODEL DIVERGENCE         */}
      {/* Positioned on cylindrical arc: [3.55, 0, 0.35], Rotation: [0, -0.24, 0]   */}
      {/* ========================================================================= */}
      <group position={[3.55, 0, 0.35]} rotation={[0, -0.24, 0]}>
        <Float speed={1.0} rotationIntensity={0.015} floatIntensity={0.05}>
          <Html
            transform
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '460px', height: '580px' }}
          >
            <div
              className={cn(
                "w-[460px] h-[580px] flex flex-col rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/20 overflow-hidden font-mono text-xs text-slate-100 transition-all duration-300",
                activeCameraMode === 'right' && "ring-2 ring-cyan-400 border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.3)]"
              )}
            >
              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <span className="font-bold tracking-wider text-amber-300 text-[11px]">
                    FILE // 03 • TELEMETRY & CONSENSUS
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {route && onSaveExpedition && (
                    <button
                      type="button"
                      onClick={onSaveExpedition}
                      disabled={isSavingExpedition}
                      title="Archive expedition to MongoDB Atlas"
                      className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[9px] uppercase flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Database className={cn("h-3 w-3 text-emerald-400", isSavingExpedition && "animate-spin")} />
                      <span>{isSavingExpedition ? 'Saving...' : 'Atlas'}</span>
                    </button>
                  )}

                  {onFocusCamera && (
                    <button
                      type="button"
                      onClick={() => onFocusCamera(activeCameraMode === 'right' ? 'overview' : 'right')}
                      title={activeCameraMode === 'right' ? "Reset to Overview" : "Focus Panel"}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Window Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Elevation & Weather Synchronized Graph */}
                <div className="flex-1 min-h-0 p-2.5 bg-slate-950/70 border-b border-slate-800">
                  <ElevationWeatherSync
                    route={route}
                    forecasts={forecasts}
                    units={settings.units}
                    hoveredIndex={selectedPoint?.forecastIndex ?? null}
                    onHoverPoint={() => {}}
                    onSelectPoint={(f, idx) => onPointSelect(idx, 'chart')}
                    isExpanded={isElevationExpanded}
                    onToggleExpand={() => setIsElevationExpanded(!isElevationExpanded)}
                  />
                </div>

                {/* Multi-Model Consensus Ribbon & Divergence */}
                <div className="shrink-0 p-2.5 bg-slate-950/90 max-h-[190px] overflow-y-auto custom-scrollbar">
                  <div className="text-[9px] uppercase text-slate-500 font-bold mb-1 flex items-center justify-between">
                    <span>SUPERCOMPUTER CONSENSUS</span>
                    <span className="text-cyan-400">ECMWF • GFS • ICON</span>
                  </div>
                  <ModelDivergenceRibbon forecasts={forecasts} className="w-full" />
                </div>
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-3.5 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500 select-none">
                <span>TELEMETRY: SYNCHRONIZED</span>
                <span>SAMPLES: {forecasts.length} PTS</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>
    </group>
  );
}

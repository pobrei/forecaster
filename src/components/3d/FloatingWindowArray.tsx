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
}

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
      {/* Positioned on cylindrical arc: [-3.4, 0, 0.4], Rotation: [0, 0.32, 0]    */}
      {/* ========================================================================= */}
      <group position={[-3.4, 0, 0.4]} rotation={[0, 0.32, 0]}>
        <Float speed={1.8} rotationIntensity={0.06} floatIntensity={0.2}>
          <Html
            transform
            distanceFactor={5.2}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '430px', height: '640px' }}
          >
            <div className="w-[430px] h-[640px] flex flex-col rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 overflow-hidden font-mono text-xs text-slate-100">
              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <span className="font-bold tracking-wider text-cyan-300 text-[11px]">
                    FILE // 01 • INGESTION & PARAMETERS
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <Terminal className="h-3 w-3 text-cyan-400" />
                  <span>GPS / GPX RECON</span>
                </div>
              </div>

              {/* Window Content: Scrollable Left Panel */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
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
              <div className="px-3.5 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 select-none">
                <span>CHANNEL: GPX-INGEST-01</span>
                <span>STATUS: ARMED</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>

      {/* ========================================================================= */}
      {/* WINDOW 2: CENTER HUD - TACTICAL GEOSPATIAL RADAR & OPENLAYERS MAP        */}
      {/* Positioned at center of cylindrical arc: [0, 0, 0], Rotation: [0, 0, 0]   */}
      {/* ========================================================================= */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <Float speed={1.8} rotationIntensity={0.05} floatIntensity={0.22}>
          <Html
            transform
            distanceFactor={5.2}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '640px', height: '640px' }}
          >
            <div className="w-[640px] h-[640px] flex flex-col rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/20 overflow-hidden font-mono text-xs text-slate-100">
              {/* Window Top Tactical Header */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="font-bold tracking-wider text-emerald-300 text-[11px]">
                    FILE // 02 • TACTICAL GEOSPATIAL RADAR
                  </span>
                </div>

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
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                    <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                      <Compass className="h-7 w-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                      EXPEDITION GEOSPATIAL RADAR
                    </h3>
                    <p className="font-sans text-xs text-slate-400 max-w-sm mt-1 mb-5 leading-relaxed">
                      Satellite terrain engine standing by. Ingest a GPX track in File 01 or load the Swiss Alps traverse to plot polyline atmospheric telemetry.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Load Alpine 45km Route</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-4 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 select-none">
                <span>PROJECTION: EPSG:3857 (SPHERICAL MERCATOR)</span>
                <span>HUD: ACTIVE</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>

      {/* ========================================================================= */}
      {/* WINDOW 3: RIGHT HUD - DYNAMIC TELEMETRY & MULTI-MODEL DIVERGENCE         */}
      {/* Positioned on cylindrical arc: [3.4, 0, 0.4], Rotation: [0, -0.32, 0]   */}
      {/* ========================================================================= */}
      <group position={[3.4, 0, 0.4]} rotation={[0, -0.32, 0]}>
        <Float speed={1.8} rotationIntensity={0.06} floatIntensity={0.2}>
          <Html
            transform
            distanceFactor={5.2}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '510px', height: '640px' }}
          >
            <div className="w-[510px] h-[640px] flex flex-col rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 overflow-hidden font-mono text-xs text-slate-100">
              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <span className="font-bold tracking-wider text-amber-300 text-[11px]">
                    FILE // 03 • DYNAMIC TELEMETRY & CONSENSUS
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                </div>
              </div>

              {/* Window Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Elevation & Weather Synchronized Graph */}
                <div className="flex-1 min-h-0 p-3 bg-slate-950/70 border-b border-slate-800">
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
                <div className="shrink-0 p-3 bg-slate-950/90 max-h-[220px] overflow-y-auto custom-scrollbar">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-1.5 flex items-center justify-between">
                    <span>SUPERCOMPUTER CONSENSUS SPREAD</span>
                    <span className="text-cyan-400">ECMWF • GFS • ICON</span>
                  </div>
                  <ModelDivergenceRibbon forecasts={forecasts} className="w-full" />
                </div>
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-3.5 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 select-none">
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

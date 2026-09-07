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
  onHoverHUDChange?: (isHovering: boolean) => void;
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
  onHoverHUDChange,
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
      {/* WINDOW 1: LEFT HUD - FILE 01 INGESTION & RECON DOSSIER                    */}
      {/* Positioned on cylindrical arc: [-3.5, 0, 0.45], Rotation: [0, 0.30, 0]    */}
      {/* ========================================================================= */}
      <group position={[-3.5, 0, 0.45]} rotation={[0, 0.30, 0]}>
        <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.25}>
          <Html
            transform
            occlude="blending"
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '380px', height: '580px' }}
          >
            <div
              onMouseEnter={() => onHoverHUDChange?.(true)}
              onMouseLeave={() => onHoverHUDChange?.(false)}
              className={cn(
                "relative w-[380px] h-[580px] flex flex-col rounded-2xl bg-[rgba(28,24,20,0.88)] backdrop-blur-xl border border-[#453A2E] shadow-[inset_0_1px_0_0_rgba(245,242,235,0.45),0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden font-mono text-xs text-[#F5F2EB] transition-all duration-300",
                activeCameraMode === 'left' && "ring-2 ring-[#E5A93C] border-[#E5A93C]/80 shadow-[0_0_40px_rgba(229,169,60,0.3)]"
              )}
            >
              {/* Sun-bleached corner crosses */}
              <span className="absolute top-1.5 left-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute top-1.5 right-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute bottom-1.5 left-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>

              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2.5 bg-[#1a1613]/90 border-b border-[#453A2E] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#E5A93C] shadow-[0_0_8px_rgba(229,169,60,0.85)] animate-pulse" />
                  <span className="font-bold tracking-wider text-[#F5F2EB] text-[11px]">
                    FILE // 01 • INGESTION
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-[#A89F91] hidden sm:inline">GPS RECON</span>
                  {onFocusCamera && (
                    <button
                      type="button"
                      onClick={() => onFocusCamera(activeCameraMode === 'left' ? 'overview' : 'left')}
                      title={activeCameraMode === 'left' ? "Reset to Overview" : "Focus Panel"}
                      className="p-1 rounded hover:bg-[#28221b] text-[#A89F91] hover:text-[#F5F2EB] transition-colors cursor-pointer"
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
              <div className="px-3.5 py-1.5 bg-[#16120F]/95 border-t border-[#453A2E]/80 flex items-center justify-between text-[9px] text-[#A89F91] select-none">
                <span>DOSSIER: GPX-INGEST-01</span>
                <span>STATUS: ARMED // 3D</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>

      {/* ========================================================================= */}
      {/* WINDOW 2: CENTER HUD - FILE 02 TACTICAL GEOSPATIAL RADAR & MAP            */}
      {/* Positioned at center of cylindrical arc: [0, 0, 0], Rotation: [0, 0, 0]   */}
      {/* ========================================================================= */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.25}>
          <Html
            transform
            occlude="blending"
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '620px', height: '580px' }}
          >
            <div
              onMouseEnter={() => onHoverHUDChange?.(true)}
              onMouseLeave={() => onHoverHUDChange?.(false)}
              className={cn(
                "relative w-[620px] h-[580px] flex flex-col rounded-2xl bg-[rgba(28,24,20,0.88)] backdrop-blur-xl border border-[#453A2E] shadow-[inset_0_1px_0_0_rgba(245,242,235,0.45),0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden font-mono text-xs text-[#F5F2EB] transition-all duration-300",
                activeCameraMode === 'center' && "ring-2 ring-[#E5A93C] border-[#E5A93C]/80 shadow-[0_0_40px_rgba(229,169,60,0.3)]"
              )}
            >
              {/* Sun-bleached corner crosses */}
              <span className="absolute top-1.5 left-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute top-1.5 right-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute bottom-1.5 left-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>

              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2.5 bg-[#1a1613]/90 border-b border-[#453A2E] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#E5A93C] shadow-[0_0_8px_rgba(229,169,60,0.85)] animate-pulse" />
                  <span className="font-bold tracking-wider text-[#F5F2EB] text-[11px]">
                    FILE // 02 • TACTICAL GEOSPATIAL RADAR
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-[#16120F]/90 p-0.5 rounded-lg border border-[#453A2E] text-[9px]">
                    {(['satellite', 'dark', 'mono', 'terrain', 'topo'] as BasemapMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBasemap(mode)}
                        className={cn(
                          "px-1.5 py-0.5 rounded uppercase transition-colors cursor-pointer",
                          basemap === mode
                            ? "bg-[#E5A93C]/20 text-[#E5A93C] font-bold border border-[#E5A93C]/50"
                            : "text-[#A89F91] hover:text-[#F5F2EB]"
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
                      className="p-1 rounded hover:bg-[#28221b] text-[#A89F91] hover:text-[#F5F2EB] transition-colors cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Window Content: Map Viewport or Zero-State */}
              <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#12100E]">
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
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(#2c251f_1px,transparent_1px)] [background-size:20px_20px]">
                    <div className="h-12 w-12 rounded-2xl bg-[#28221B] border border-[#453A2E] flex items-center justify-center text-[#E5A93C] mb-2.5 shadow-inner">
                      <Compass className="h-6 w-6" />
                    </div>
                    <h3 className="text-xs font-bold text-[#F5F2EB] font-mono tracking-wide">
                      EXPEDITION GEOSPATIAL RADAR
                    </h3>
                    <p className="font-sans text-[11px] text-[#A89F91] max-w-xs mt-1 mb-4 leading-relaxed">
                      Satellite terrain engine standing by. Ingest a GPX track in File 01 or load the Swiss Alps traverse to plot polyline atmospheric telemetry.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-3.5 py-1.5 rounded-xl bg-[#E5A93C] hover:bg-[#d4962b] text-[#12100E] font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(229,169,60,0.35)] transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#12100E]" />
                      <span>Load Alpine 45km Route</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-3.5 py-1.5 bg-[#16120F]/95 border-t border-[#453A2E]/80 flex items-center justify-between text-[9px] text-[#A89F91] select-none">
                <span>PROJECTION: EPSG:3857 (SPHERICAL MERCATOR)</span>
                <span>RADAR: ACTIVE</span>
              </div>
            </div>
          </Html>
        </Float>
      </group>

      {/* ========================================================================= */}
      {/* WINDOW 3: RIGHT HUD - FILE 03 TELEMETRY & DIVERGENCE                      */}
      {/* Positioned on cylindrical arc: [3.5, 0, 0.45], Rotation: [0, -0.30, 0]    */}
      {/* ========================================================================= */}
      <group position={[3.5, 0, 0.45]} rotation={[0, -0.30, 0]}>
        <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.25}>
          <Html
            transform
            occlude="blending"
            distanceFactor={DISTANCE_FACTOR}
            position={[0, 0, 0]}
            className="pointer-events-auto select-auto"
            style={{ width: '460px', height: '580px' }}
          >
            <div
              onMouseEnter={() => onHoverHUDChange?.(true)}
              onMouseLeave={() => onHoverHUDChange?.(false)}
              className={cn(
                "relative w-[460px] h-[580px] flex flex-col rounded-2xl bg-[rgba(28,24,20,0.88)] backdrop-blur-xl border border-[#453A2E] shadow-[inset_0_1px_0_0_rgba(245,242,235,0.45),0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden font-mono text-xs text-[#F5F2EB] transition-all duration-300",
                activeCameraMode === 'right' && "ring-2 ring-[#E5A93C] border-[#E5A93C]/80 shadow-[0_0_40px_rgba(229,169,60,0.3)]"
              )}
            >
              {/* Sun-bleached corner crosses */}
              <span className="absolute top-1.5 left-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute top-1.5 right-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute bottom-1.5 left-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>
              <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-[#A89F91]/50 select-none pointer-events-none">+</span>

              {/* Window Top Tactical Header */}
              <div className="px-3.5 py-2.5 bg-[#1a1613]/90 border-b border-[#453A2E] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#E5A93C] shadow-[0_0_8px_rgba(229,169,60,0.85)] animate-pulse" />
                  <span className="font-bold tracking-wider text-[#F5F2EB] text-[11px]">
                    FILE // 03 • TELEMETRY & DIVERGENCE
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {route && onSaveExpedition && (
                    <button
                      type="button"
                      onClick={onSaveExpedition}
                      disabled={isSavingExpedition}
                      title="Archive expedition to MongoDB Atlas"
                      className="px-2 py-0.5 rounded bg-[#82937D]/15 hover:bg-[#82937D]/25 border border-[#82937D]/50 text-[#82937D] font-mono text-[9px] uppercase flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Database className={cn("h-3 w-3 text-[#82937D]", isSavingExpedition && "animate-spin")} />
                      <span>{isSavingExpedition ? 'Saving...' : 'Atlas'}</span>
                    </button>
                  )}

                  {onFocusCamera && (
                    <button
                      type="button"
                      onClick={() => onFocusCamera(activeCameraMode === 'right' ? 'overview' : 'right')}
                      title={activeCameraMode === 'right' ? "Reset to Overview" : "Focus Panel"}
                      className="p-1 rounded hover:bg-[#28221b] text-[#A89F91] hover:text-[#F5F2EB] transition-colors cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Window Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Elevation & Weather Synchronized Graph */}
                <div className="flex-1 min-h-0 p-2.5 bg-[#16120F]/85 border-b border-[#453A2E]">
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
                <div className="shrink-0 p-2.5 bg-[#1a1613]/95 max-h-[190px] overflow-y-auto custom-scrollbar">
                  <div className="text-[9px] uppercase text-[#A89F91] font-bold mb-1 flex items-center justify-between">
                    <span>SUPERCOMPUTER CONSENSUS</span>
                    <span className="text-[#E5A93C]">ECMWF • GFS • ICON</span>
                  </div>
                  <ModelDivergenceRibbon forecasts={forecasts} className="w-full" />
                </div>
              </div>

              {/* Window Bottom Status Strip */}
              <div className="px-3.5 py-1.5 bg-[#16120F]/95 border-t border-[#453A2E]/80 flex items-center justify-between text-[9px] text-[#A89F91] select-none">
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

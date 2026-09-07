"use client";

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Layers, 
  Map as MapIcon, 
  BarChart3, 
  Sliders, 
  Send, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Database, 
  Activity, 
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast } from '@/types';
import { isAudioMuted, setAudioMuted, playTactileClick } from '@/lib/audio-fx';
import { toast } from 'sonner';

export type MobileTab = 'parameters' | 'map' | 'telemetry' | 'dispatch';

interface SplitScreenLayoutProps {
  leftPanel: React.ReactNode;
  mapStage: React.ReactNode;
  elevationDrawer?: React.ReactNode;
  divergenceRibbon?: React.ReactNode;
  route: Route | null;
  forecasts: WeatherForecast[];
  onResetRoute?: () => void;
  onSaveExpedition?: () => void;
  isSavingExpedition?: boolean;
  activeMobileTab?: MobileTab;
  onMobileTabChange?: (tab: MobileTab) => void;
}

export function SplitScreenLayout({
  leftPanel,
  mapStage,
  elevationDrawer,
  divergenceRibbon,
  route,
  forecasts,
  onResetRoute,
  onSaveExpedition,
  isSavingExpedition = false,
  activeMobileTab: externalTab,
  onMobileTabChange,
}: SplitScreenLayoutProps) {
  const [internalTab, setInternalTab] = useState<MobileTab>('parameters');
  const [muted, setMuted] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  const activeTab = externalTab ?? internalTab;
  const handleTabChange = (tab: MobileTab) => {
    playTactileClick();
    if (onMobileTabChange) {
      onMobileTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  useEffect(() => {
    setMuted(isAudioMuted());
    const handleAudioToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      setMuted(customEvent.detail.muted);
    };
    window.addEventListener('forecaster-audio-toggle', handleAudioToggle);
    return () => window.removeEventListener('forecaster-audio-toggle', handleAudioToggle);
  }, []);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    toast.info(next ? 'Audio Feedback Muted' : 'Audio Feedback Enabled', { duration: 1500 });
  };

  const handleReset = () => {
    playTactileClick();
    if (onResetRoute) {
      onResetRoute();
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* 1. SLIM EXPEDITION TELEMETRY HEADER                                       */}
      {/* ========================================================================= */}
      <header className="h-11 shrink-0 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-40 text-xs">
        {/* Left: Brand Identity & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono font-bold tracking-wider text-slate-100 uppercase text-xs">
              FORECASTER <span className="text-slate-400 font-normal">• EXPEDITION METEOROLOGY</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-3 font-mono text-[10px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30 font-medium">
              {route ? "ROUTE ARMED" : "STANDBY"}
            </span>
            <span className="text-slate-600">•</span>
            <span>MULTI-MODEL SYNOPTIC CONSENSUS</span>
          </div>
        </div>

        {/* Center: Live Geodetic & Atmospheric Barometer Chip */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-slate-400 px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800/80">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span className="text-slate-300">WGS84</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">1013.2 hPa (MSL)</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">ATLAS SYNC</span>
          {route && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">{route.totalDistance.toFixed(1)} km</span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {route && onSaveExpedition && (
            <button
              type="button"
              onClick={onSaveExpedition}
              disabled={isSavingExpedition}
              title="Archive expedition route and forecasts to MongoDB Atlas"
              className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] tracking-wide uppercase flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Database className={cn("h-3 w-3 text-emerald-400", isSavingExpedition && "animate-spin")} />
              <span className="hidden sm:inline">{isSavingExpedition ? 'Saving...' : 'Atlas Archive'}</span>
            </button>
          )}

          {route && (
            <button
              type="button"
              onClick={handleReset}
              title="Clear current route"
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleSound}
            title={muted ? 'Enable audio feedback' : 'Mute audio feedback'}
            className={cn(
              "p-1.5 rounded-md transition-colors cursor-pointer",
              muted ? "text-slate-500 hover:bg-slate-800" : "text-emerald-400 hover:bg-slate-800"
            )}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SPLIT-SCREEN WORKSTATION VIEWPORT (100vh CONTAINMENT)                  */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left Control Panel (Fixed 410px-440px on Desktop, Tab switchable on Mobile) */}
        <aside
          className={cn(
            "w-full lg:w-[410px] xl:w-[440px] shrink-0 h-full bg-slate-950/95 border-r border-slate-800/80 flex flex-col z-20 overflow-hidden transition-all duration-300",
            activeTab === 'parameters' ? "flex" : "hidden lg:flex"
          )}
        >
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 custom-scrollbar">
            {leftPanel}
          </div>
        </aside>

        {/* Right Stage (Fluid Map & Dynamic Telemetry Stage) */}
        <main
          className={cn(
            "flex-1 h-full min-w-0 flex flex-col relative overflow-hidden bg-slate-950",
            activeTab !== 'parameters' ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Main Map Viewport Area */}
          <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
            {mapStage}

            {divergenceRibbon && (
              <div className="absolute top-3 right-3 z-20 max-w-sm pointer-events-auto">
                {divergenceRibbon}
              </div>
            )}
          </div>

          {/* Synchronized Bottom Elevation & Wind Telemetry Drawer */}
          {elevationDrawer && (
            <div
              className={cn(
                "shrink-0 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-md z-20 transition-all duration-300 flex flex-col",
                isDrawerCollapsed ? "h-8" : "h-[200px] sm:h-[215px]"
              )}
            >
              <div 
                onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                className="h-7 shrink-0 px-3 bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/60 flex items-center justify-between cursor-pointer text-slate-300 select-none transition-colors"
              >
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase text-slate-400">
                  <Activity className="h-3 w-3 text-cyan-400" />
                  <span className="font-semibold text-slate-200">ELEVATION PROFILE & AERODYNAMIC WIND CROSS-SECTION</span>
                  {route && (
                    <span className="hidden sm:inline text-slate-500">
                      • {route.totalDistance.toFixed(1)} km
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {isDrawerCollapsed ? "EXPAND" : "COLLAPSE"}
                  </span>
                  {isDrawerCollapsed ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </div>

              <div className={cn("flex-1 min-h-0 overflow-hidden", isDrawerCollapsed && "hidden")}>
                {elevationDrawer}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE & TABLET BOTTOM WORKSTATION NAVIGATION DOCK (< 1024px)          */}
      {/* ========================================================================= */}
      <nav className="lg:hidden shrink-0 h-12 border-t border-slate-800 bg-slate-900/95 backdrop-blur px-2 flex items-center justify-around z-50">
        <button
          type="button"
          onClick={() => handleTabChange('parameters')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-mono tracking-wider transition-colors cursor-pointer",
            activeTab === 'parameters' ? "text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Sliders className="h-4 w-4" />
          <span>PARAMETERS</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('map')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-mono tracking-wider transition-colors cursor-pointer",
            activeTab === 'map' ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <MapIcon className="h-4 w-4" />
          <span>MAP</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('telemetry')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-mono tracking-wider transition-colors cursor-pointer",
            activeTab === 'telemetry' ? "text-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span>TELEMETRY</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('dispatch')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-mono tracking-wider transition-colors cursor-pointer",
            activeTab === 'dispatch' ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Send className="h-4 w-4" />
          <span>DISPATCH</span>
        </button>
      </nav>
    </div>
  );
}

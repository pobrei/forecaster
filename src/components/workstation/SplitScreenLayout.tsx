"use client";

import React, { useState, useEffect } from 'react';
import { 
  Map as MapIcon, 
  BarChart3, 
  Sliders, 
  Send, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Database, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Sparkles 
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
  onToggleViewMode?: () => void;
}

export function SplitScreenLayout({
  leftPanel,
  mapStage,
  elevationDrawer,
  divergenceRibbon,
  route,
  forecasts: _forecasts,
  onResetRoute,
  onSaveExpedition,
  isSavingExpedition = false,
  activeMobileTab: externalTab,
  onMobileTabChange,
  onToggleViewMode,
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#12100E] text-[#F5F2EB] font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* 1. SLIM EXPEDITION TELEMETRY HEADER                                       */}
      {/* ========================================================================= */}
      <header className="h-11 shrink-0 border-b border-[#453A2E] bg-[#16120F]/95 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-40 text-xs">
        {/* Left: Brand Identity & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E5A93C] shadow-[0_0_8px_rgba(229,169,60,0.8)]" />
            </span>
            <span className="font-mono font-bold tracking-wider text-[#F5F2EB] uppercase text-xs">
              FORECASTER <span className="text-[#A89F91] font-normal">• EXPEDITION METEOROLOGY</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-[#453A2E] pl-3 font-mono text-[10px] text-[#A89F91]">
            <span className="px-1.5 py-0.5 rounded bg-[#221B15] text-[#E5A93C] border border-[#E5A93C]/30 font-medium">
              {route ? "ROUTE ARMED" : "STANDBY"}
            </span>
            <span className="text-[#453A2E]">•</span>
            <span>MULTI-MODEL SYNOPTIC CONSENSUS</span>
          </div>
        </div>

        {/* Center: Live Geodetic & Atmospheric Barometer Chip */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-[#A89F91] px-3 py-1 rounded-full bg-[#12100E]/80 border border-[#453A2E]">
          <Activity className="h-3 w-3 text-[#82937D]" />
          <span className="text-[#F5F2EB]">WGS84</span>
          <span className="text-[#453A2E]">•</span>
          <span className="text-[#F5F2EB]">1013.2 hPa (MSL)</span>
          <span className="text-[#453A2E]">•</span>
          <span className="text-[#A89F91]">ATLAS SYNC</span>
          {route && (
            <>
              <span className="text-[#453A2E]">•</span>
              <span className="text-[#E5A93C] font-bold">{route.totalDistance.toFixed(1)} km</span>
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
              className="px-2.5 py-1 rounded-md bg-[#82937D]/15 hover:bg-[#82937D]/25 border border-[#82937D]/40 text-[#82937D] font-mono text-[10px] tracking-wide uppercase flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Database className={cn("h-3 w-3 text-[#82937D]", isSavingExpedition && "animate-spin")} />
              <span className="hidden sm:inline">{isSavingExpedition ? 'Saving...' : 'Atlas Archive'}</span>
            </button>
          )}

          {route && (
            <button
              type="button"
              onClick={handleReset}
              title="Clear current route"
              className="p-1.5 rounded-md hover:bg-[#251F19] text-[#A89F91] hover:text-[#e06c75] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          {onToggleViewMode && (
            <button
              type="button"
              onClick={onToggleViewMode}
              title="Switch to 3D Spatial Workstation"
              className="px-2 py-1 rounded-md bg-[#E5A93C]/10 hover:bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#E5A93C] font-mono text-[10px] tracking-wide uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-[#E5A93C]" />
              <span className="hidden sm:inline">3D Spatial</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleSound}
            title={muted ? 'Enable audio feedback' : 'Mute audio feedback'}
            className={cn(
              "p-1.5 rounded-md transition-colors cursor-pointer",
              muted ? "text-[#A89F91]/50 hover:bg-[#251F19]" : "text-[#82937D] hover:bg-[#251F19]"
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
            "w-full lg:w-[410px] xl:w-[440px] shrink-0 h-full bg-[#16120F]/95 border-r border-[#453A2E] flex flex-col z-20 overflow-hidden transition-all duration-300",
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
            "flex-1 h-full min-w-0 flex flex-col relative overflow-hidden bg-[#12100E]",
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
                "shrink-0 border-t border-[#453A2E] bg-[#16120F]/95 backdrop-blur-md z-20 transition-all duration-300 flex flex-col",
                isDrawerCollapsed ? "h-8" : "h-[200px] sm:h-[215px]"
              )}
            >
              <div 
                onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                className="h-7 shrink-0 px-3 bg-[#1C1814] hover:bg-[#251F19] border-b border-[#453A2E]/70 flex items-center justify-between cursor-pointer text-[#F5F2EB] select-none transition-colors"
              >
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase text-[#A89F91]">
                  <Activity className="h-3 w-3 text-[#E5A93C]" />
                  <span className="font-semibold text-[#F5F2EB]">ELEVATION PROFILE & AERODYNAMIC WIND CROSS-SECTION</span>
                  {route && (
                    <span className="hidden sm:inline text-[#A89F91]/70">
                      • {route.totalDistance.toFixed(1)} km
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#A89F91] uppercase">
                    {isDrawerCollapsed ? "EXPAND" : "COLLAPSE"}
                  </span>
                  {isDrawerCollapsed ? (
                    <ChevronUp className="h-3.5 w-3.5 text-[#A89F91]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#A89F91]" />
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
      <nav className="lg:hidden shrink-0 h-12 border-t border-[#453A2E] bg-[#16120F]/95 backdrop-blur px-2 flex items-center justify-around z-50">
        <button
          type="button"
          onClick={() => handleTabChange('parameters')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-mono tracking-wider transition-colors cursor-pointer",
            activeTab === 'parameters' ? "text-[#E5A93C] font-semibold" : "text-[#A89F91] hover:text-[#F5F2EB]"
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
            activeTab === 'map' ? "text-[#E5A93C] font-semibold" : "text-[#A89F91] hover:text-[#F5F2EB]"
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
            activeTab === 'telemetry' ? "text-[#E5A93C] font-semibold" : "text-[#A89F91] hover:text-[#F5F2EB]"
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
            activeTab === 'dispatch' ? "text-[#82937D] font-semibold" : "text-[#A89F91] hover:text-[#F5F2EB]"
          )}
        >
          <Send className="h-4 w-4" />
          <span>DISPATCH</span>
        </button>
      </nav>
    </div>
  );
}

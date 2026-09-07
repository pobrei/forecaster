"use client";

import React from 'react';
import { 
  Zap, 
  RotateCcw, 
  Compass, 
  Database, 
  Loader2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, AppSettings } from '@/types';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { GpxDropzone } from './GpxDropzone';
import { ActivityPacePresets } from './ActivityPacePresets';
import { ModelSelectorMatrix } from './ModelSelectorMatrix';
import { playTelemetryChirp, playTactileClick } from '@/lib/audio-fx';

interface LeftPanelProps {
  route: Route | null;
  settings: AppSettings;
  preferences: WeatherSourcePreferences;
  onRouteLoaded: (route: Route) => void;
  onResetRoute: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  onGenerateForecast: () => void;
  isLoading: boolean;
  hasForecasts: boolean;
}

export function LeftPanel({
  route,
  settings,
  preferences,
  onRouteLoaded,
  onResetRoute,
  onSettingsChange,
  onPreferencesChange,
  onGenerateForecast,
  isLoading,
  hasForecasts,
}: LeftPanelProps) {
  const handleCtaClick = () => {
    playTelemetryChirp();
    onGenerateForecast();
  };

  return (
    <div className="space-y-3.5 font-sans select-none">
      {/* 1. GPX Telemetry Ingestion Dropzone */}
      <section className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xs">
        <GpxDropzone
          route={route}
          onRouteLoaded={onRouteLoaded}
          onResetRoute={onResetRoute}
          isLoading={isLoading}
        />
      </section>

      {/* 2. Activity Profiles & Speed Presets */}
      <section className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xs">
        <ActivityPacePresets
          settings={settings}
          onSettingsChange={onSettingsChange}
          route={route}
        />
      </section>

      {/* 3. Meteorological Multi-Model Matrix */}
      <section className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xs">
        <ModelSelectorMatrix
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          isLoading={isLoading}
        />
      </section>

      {/* 4. High-Contrast Tactical Primary CTA Button */}
      <div className="pt-2 sticky bottom-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pb-1">
        <button
          type="button"
          onClick={handleCtaClick}
          disabled={!route || isLoading}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-md active:scale-[0.98]",
            !route
              ? "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60"
              : isLoading
              ? "bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse cursor-wait"
              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <span>Synthesizing Meteorological Data...</span>
            </>
          ) : (
            <>
              <Zap className={cn("h-4 w-4", route ? "text-slate-950 fill-slate-950" : "text-slate-500")} />
              <span>
                {hasForecasts ? "Re-Run Weather Forecast" : "Generate Weather Forecast"}
              </span>
            </>
          )}
        </button>

        {!route && (
          <p className="text-center font-mono text-[10px] text-slate-500 mt-2">
            Load a GPX track or the Alpine 45km route to begin forecast analysis
          </p>
        )}
      </div>
    </div>
  );
}

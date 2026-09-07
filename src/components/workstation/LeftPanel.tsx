"use client";

import React from 'react';
import { 
  Zap, 
  RotateCcw, 
  Compass, 
  Database, 
  Loader2,
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, AppSettings } from '@/types';
import { WeatherSourcePreferences } from '@/types/weather-sources';
import { GpxDropzone } from './GpxDropzone';
import { ActivityPacePresets } from './ActivityPacePresets';
import { ModelSelectorMatrix } from './ModelSelectorMatrix';
import { createAlpine45KmSampleRoute } from '@/lib/sample-routes';
import { playTelemetryChirp, playTactileClick } from '@/lib/audio-fx';
import { toast } from 'sonner';

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

  const handleLoadSample = () => {
    playTactileClick();
    const sample = createAlpine45KmSampleRoute();
    onRouteLoaded(sample);
    toast.success('Loaded "Alpine 45km" Swiss Traverse');
  };

  return (
    <div className="space-y-3 font-sans select-none text-[#F5F2EB]">
      {/* 1. GPX Telemetry Ingestion Dropzone */}
      <section className="p-3 rounded-xl bg-[#1c1814]/70 border border-[#453A2E] shadow-xs">
        <GpxDropzone
          route={route}
          onRouteLoaded={onRouteLoaded}
          onResetRoute={onResetRoute}
          isLoading={isLoading}
        />
        {!route && (
          <button
            type="button"
            onClick={handleLoadSample}
            className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-[#28221B] hover:bg-[#342B23] border border-[#453A2E] text-[#E5A93C] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-[#E5A93C]" />
            <span>LOAD SAMPLE ROUTE (ALPINE 45KM)</span>
          </button>
        )}
      </section>

      {/* 2. Activity Profiles & Speed Presets */}
      <section className="p-3 rounded-xl bg-[#1c1814]/70 border border-[#453A2E] shadow-xs">
        <ActivityPacePresets
          settings={settings}
          onSettingsChange={onSettingsChange}
          route={route}
        />
      </section>

      {/* 3. Meteorological Multi-Model Matrix */}
      <section className="p-3 rounded-xl bg-[#1c1814]/70 border border-[#453A2E] shadow-xs">
        <ModelSelectorMatrix
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          isLoading={isLoading}
        />
      </section>

      {/* 4. High-Contrast Phosphor Ochre Primary CTA Button */}
      <div className="pt-2 sticky bottom-0 z-10 bg-gradient-to-t from-[#12100E] via-[#12100E] to-transparent pb-1">
        <button
          type="button"
          onClick={handleCtaClick}
          disabled={!route || isLoading}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-md active:scale-[0.98]",
            !route
              ? "bg-[#1f1a16] border border-[#453A2E] text-[#A89F91]/50 cursor-not-allowed"
              : isLoading
              ? "bg-[#E5A93C]/20 border border-[#E5A93C] text-[#E5A93C] animate-pulse cursor-wait"
              : "bg-[#E5A93C] hover:bg-[#d4962b] text-[#12100E] border border-[#E5A93C] shadow-[0_0_20px_rgba(229,169,60,0.35)]"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#12100E]" />
              <span>Synthesizing Meteorological Data...</span>
            </>
          ) : (
            <>
              <Zap className={cn("h-4 w-4", route ? "text-[#12100E] fill-[#12100E]" : "text-[#A89F91]")} />
              <span>
                {hasForecasts ? "RE-RUN WEATHER FORECAST" : "GENERATE FORECAST"}
              </span>
            </>
          )}
        </button>

        {!route && (
          <p className="text-center font-mono text-[10px] text-[#A89F91] mt-1.5">
            Load a GPX track or the Alpine 45km route to begin forecast analysis
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { 
  Layers, 
  Globe, 
  Cloud, 
  CloudSun, 
  Sun, 
  Check, 
  Star, 
  Zap, 
  Shield, 
  Info,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  WeatherProviderId, 
  WeatherSourcePreferences, 
  WEATHER_PROVIDERS 
} from '@/types/weather-sources';
import { playTactileClick } from '@/lib/audio-fx';
import { toast } from 'sonner';

interface ModelSelectorMatrixProps {
  preferences: WeatherSourcePreferences;
  onPreferencesChange: (prefs: WeatherSourcePreferences) => void;
  isLoading?: boolean;
  className?: string;
}

// Curated list of primary meteorological supercomputing models
const SUPPORTED_MODELS: Array<{
  id: WeatherProviderId;
  name: string;
  agency: string;
  category: 'Global Ensemble' | 'High-Res Regional' | 'Operational Global';
  flag: string;
  resolution: string;
  color: string;
  description: string;
}> = [
  {
    id: 'open-meteo',
    name: 'Best Match',
    agency: 'Open-Meteo Ensemble',
    category: 'Global Ensemble',
    flag: '🌐',
    resolution: '1-11 km',
    color: '#10b981', // emerald
    description: 'Blended optimal ensemble combining ECMWF, GFS, ICON, and local radars',
  },
  {
    id: 'ecmwf',
    name: 'ECMWF IFS',
    agency: 'Reading, UK (Europe)',
    category: 'Operational Global',
    flag: '🇪🇺',
    resolution: '9 km',
    color: '#3b82f6', // blue
    description: 'Gold standard European numerical weather prediction model',
  },
  {
    id: 'gfs',
    name: 'NOAA GFS',
    agency: 'NCEP, USA',
    category: 'Operational Global',
    flag: '🇺🇸',
    resolution: '13-25 km',
    color: '#f59e0b', // amber
    description: 'United States flagship global atmospheric forecast system',
  },
  {
    id: 'icon',
    name: 'DWD ICON',
    agency: 'Offenbach, Germany',
    category: 'High-Res Regional',
    flag: '🇩🇪',
    resolution: '7-13 km',
    color: '#8b5cf6', // purple
    description: 'Non-hydrostatic global model with precision alpine valley resolution',
  },
  {
    id: 'meteofrance',
    name: 'Météo-France',
    agency: 'AROME / ARPEGE',
    category: 'High-Res Regional',
    flag: '🇫🇷',
    resolution: '2.5 km',
    color: '#ec4899', // pink
    description: 'Ultra-high resolution convective scale model for mountainous terrain',
  },
  {
    id: 'gem',
    name: 'GEM Regional',
    agency: 'CMC Canada',
    category: 'Global Ensemble',
    flag: '🇨🇦',
    resolution: '15 km',
    color: '#06b6d4', // cyan
    description: 'Environment Canada global environmental multiscale prediction system',
  },
];

export function ModelSelectorMatrix({
  preferences,
  onPreferencesChange,
  isLoading = false,
  className,
}: ModelSelectorMatrixProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleToggleModel = (id: WeatherProviderId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    playTactileClick();

    const isEnabled = preferences.enabledSources.includes(id);
    let newEnabled: WeatherProviderId[];

    if (isEnabled) {
      if (preferences.enabledSources.length <= 1) {
        toast.info('At least one meteorological model must remain enabled');
        return;
      }
      newEnabled = preferences.enabledSources.filter((m) => m !== id);
      const newPrimary = preferences.primarySource === id ? newEnabled[0] : preferences.primarySource;
      onPreferencesChange({
        ...preferences,
        enabledSources: newEnabled,
        primarySource: newPrimary,
      });
    } else {
      newEnabled = [...preferences.enabledSources, id];
      onPreferencesChange({
        ...preferences,
        enabledSources: newEnabled,
      });
    }
  };

  const handleSetPrimary = (id: WeatherProviderId, e: React.MouseEvent) => {
    e.stopPropagation();
    playTactileClick();
    const newEnabled = preferences.enabledSources.includes(id)
      ? preferences.enabledSources
      : [...preferences.enabledSources, id];
    
    onPreferencesChange({
      ...preferences,
      primarySource: id,
      enabledSources: newEnabled,
    });
    toast.success(`Set ${id.toUpperCase()} as primary forecast baseline`);
  };

  const handleModeChange = (mode: 'single' | 'comparison' | 'consensus') => {
    playTactileClick();
    onPreferencesChange({
      ...preferences,
      comparisonMode: mode,
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with Active Model Counter & Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          <span>FILE // 02 • MODEL MATRIX</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
            {preferences.enabledSources.length} / {SUPPORTED_MODELS.length} ACTIVE
          </span>
        </div>
      </div>

      {/* Mode Selector Pill Bar */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-center font-mono text-[10px]">
        <button
          type="button"
          onClick={() => handleModeChange('single')}
          className={cn(
            "py-1 px-2 rounded-md transition-all cursor-pointer",
            preferences.comparisonMode === 'single'
              ? "bg-slate-800 text-slate-100 font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          SINGLE BASE
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('comparison')}
          className={cn(
            "py-1 px-2 rounded-md transition-all cursor-pointer",
            preferences.comparisonMode === 'comparison'
              ? "bg-blue-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          DIVERGENCE
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('consensus')}
          className={cn(
            "py-1 px-2 rounded-md transition-all cursor-pointer",
            preferences.comparisonMode === 'consensus'
              ? "bg-emerald-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          CONSENSUS
        </button>
      </div>

      {/* Dense 2-Column Responsive Matrix of Model Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUPPORTED_MODELS.map((model) => {
          const isEnabled = preferences.enabledSources.includes(model.id);
          const isPrimary = preferences.primarySource === model.id;

          return (
            <div
              key={model.id}
              onClick={() => handleToggleModel(model.id)}
              className={cn(
                "group relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between gap-1.5",
                isEnabled
                  ? "bg-slate-900/90 border-slate-700 hover:border-slate-600 shadow-sm"
                  : "bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-85 hover:border-slate-800"
              )}
            >
              {/* Top Row: Flag, Name, Primary Star */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{model.flag}</span>
                  <div className="truncate">
                    <div className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                      <span>{model.name}</span>
                      <span 
                        className="h-1.5 w-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: model.color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Star Action Button */}
                <button
                  type="button"
                  onClick={(e) => handleSetPrimary(model.id, e)}
                  title={isPrimary ? 'Current baseline model' : 'Set as primary baseline'}
                  className={cn(
                    "p-1 rounded transition-colors",
                    isPrimary 
                      ? "text-amber-400 hover:text-amber-300" 
                      : "text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Star className={cn("h-3 w-3", isPrimary && "fill-amber-400")} />
                </button>
              </div>

              {/* Middle: Agency & Resolution */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="truncate max-w-[110px]">{model.agency}</span>
                <span className="px-1 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  {model.resolution}
                </span>
              </div>

              {/* Bottom: Checkbox State & Category Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-mono text-[9px]">
                <span className="text-slate-500 uppercase">{model.category}</span>
                <div className="flex items-center gap-1">
                  {isPrimary && (
                    <span className="text-[9px] text-amber-400 font-bold uppercase">BASE</span>
                  )}
                  <div
                    className={cn(
                      "h-3.5 w-3.5 rounded flex items-center justify-center border transition-all",
                      isEnabled
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "border-slate-700 bg-slate-900 text-transparent"
                    )}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

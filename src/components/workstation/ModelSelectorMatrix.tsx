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
    <div className={cn("space-y-2.5", className)}>
      {/* Header with Active Model Counter & Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#A89F91]">
          <Layers className="h-3.5 w-3.5 text-[#E5A93C]" />
          <span>FILE // 02 • MODEL MATRIX</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E5A93C]/10 text-[#E5A93C] border border-[#E5A93C]/30">
            {preferences.enabledSources.length} / {SUPPORTED_MODELS.length} ACTIVE
          </span>
        </div>
      </div>

      {/* Mode Selector Pill Bar */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#16120F] border border-[#453A2E] text-center font-mono text-[9px]">
        <button
          type="button"
          onClick={() => handleModeChange('single')}
          className={cn(
            "py-1 px-1.5 rounded-md transition-all cursor-pointer truncate",
            preferences.comparisonMode === 'single'
              ? "bg-[#28221B] text-[#F5F2EB] font-bold border border-[#453A2E] shadow-xs"
              : "text-[#A89F91] hover:text-[#F5F2EB]"
          )}
        >
          SINGLE BASE
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('comparison')}
          className={cn(
            "py-1 px-1.5 rounded-md transition-all cursor-pointer truncate",
            preferences.comparisonMode === 'comparison'
              ? "bg-[#E5A93C] text-[#12100E] font-bold shadow-xs"
              : "text-[#A89F91] hover:text-[#F5F2EB]"
          )}
        >
          DIVERGENCE
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('consensus')}
          className={cn(
            "py-1 px-1.5 rounded-md transition-all cursor-pointer truncate",
            preferences.comparisonMode === 'consensus'
              ? "bg-[#82937D] text-[#12100E] font-bold shadow-xs"
              : "text-[#A89F91] hover:text-[#F5F2EB]"
          )}
        >
          CONSENSUS
        </button>
      </div>

      {/* 3-Column Responsive Matrix of Meteorological Supercomputing Models */}
      <div className="grid grid-cols-3 gap-1.5">
        {SUPPORTED_MODELS.map((model) => {
          const isEnabled = preferences.enabledSources.includes(model.id);
          const isPrimary = preferences.primarySource === model.id;

          return (
            <div
              key={model.id}
              onClick={() => handleToggleModel(model.id)}
              className={cn(
                "group relative p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between gap-1",
                isEnabled
                  ? "bg-[#221c17] border-[#453A2E] hover:border-[#E5A93C]/60 shadow-sm"
                  : "bg-[#16120F]/60 border-[#453A2E]/40 opacity-60 hover:opacity-85 hover:border-[#453A2E]"
              )}
            >
              {/* Top Row: Flag, Name, Primary Star */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs shrink-0">{model.flag}</span>
                  <div className="truncate">
                    <div className="font-bold text-[10px] text-[#F5F2EB] truncate flex items-center gap-1">
                      <span className="truncate">{model.name}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Star Action Button */}
                <button
                  type="button"
                  onClick={(e) => handleSetPrimary(model.id, e)}
                  title={isPrimary ? 'Current baseline model' : 'Set as primary baseline'}
                  className={cn(
                    "p-0.5 rounded transition-colors shrink-0",
                    isPrimary 
                      ? "text-[#E5A93C]" 
                      : "text-[#A89F91]/50 hover:text-[#A89F91] opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Star className={cn("h-2.5 w-2.5", isPrimary && "fill-[#E5A93C]")} />
                </button>
              </div>

              {/* Middle: Agency & Resolution */}
              <div className="flex items-center justify-between text-[9px] font-mono text-[#A89F91]">
                <span className="truncate max-w-[65px]">{model.agency}</span>
                <span className="px-1 py-0.2 rounded bg-[#16120F] text-[#F5F2EB] border border-[#453A2E]/60 text-[8px]">
                  {model.resolution}
                </span>
              </div>

              {/* Bottom: Checkbox State & Base Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-[#453A2E]/60 font-mono text-[8px]">
                <span className="text-[#A89F91]/70 truncate uppercase max-w-[60px]">{model.category.split(' ')[0]}</span>
                <div className="flex items-center gap-1">
                  {isPrimary && (
                    <span className="text-[8px] text-[#E5A93C] font-bold uppercase">BASE</span>
                  )}
                  <div
                    className={cn(
                      "h-3 w-3 rounded flex items-center justify-center border transition-all",
                      isEnabled
                        ? "bg-[#E5A93C] border-[#E5A93C] text-[#12100E]"
                        : "border-[#453A2E] bg-[#16120F] text-transparent"
                    )}
                  >
                    <Check className="h-2 w-2 stroke-[3]" />
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

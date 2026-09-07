"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  Footprints, 
  Clock, 
  Gauge, 
  Sliders, 
  Activity,
  Plus,
  Minus,
  Timer,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSettings, Route } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { playTactileClick } from '@/lib/audio-fx';

interface ActivityPacePresetsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  route?: Route | null;
  className?: string;
}

interface ActivityProfile {
  id: string;
  name: string;
  speedKmH: number;
  icon: React.ReactNode;
  description: string;
}

const ACTIVITY_PROFILES: ActivityProfile[] = [
  {
    id: 'hiking',
    name: 'Alpine Hiking',
    speedKmH: 4.5,
    icon: <Footprints className="h-3.5 w-3.5" />,
    description: 'Steep incline pack march',
  },
  {
    id: 'running',
    name: 'Trail Running',
    speedKmH: 9.0,
    icon: <Activity className="h-3.5 w-3.5" />,
    description: 'Mountain trail pace',
  },
  {
    id: 'gravel',
    name: 'Gravel / MTB',
    speedKmH: 15.0,
    icon: <Bike className="h-3.5 w-3.5" />,
    description: 'Off-road exploration',
  },
  {
    id: 'road',
    name: 'Road Cycling',
    speedKmH: 26.0,
    icon: <Bike className="h-3.5 w-3.5" />,
    description: 'Paved endurance pace',
  },
];

const INTERVAL_PRESETS = [2, 5, 10, 15, 25];

export function ActivityPacePresets({
  settings,
  onSettingsChange,
  route,
  className,
}: ActivityPacePresetsProps) {
  // Local input states for fluid typing without jumping cursor
  const [speedInput, setSpeedInput] = useState<string>(settings.averageSpeed.toString());
  const [intervalInput, setIntervalInput] = useState<string>(settings.forecastInterval.toString());

  // Sync local inputs when settings change from outside (e.g. preset click or props)
  useEffect(() => {
    setSpeedInput(settings.averageSpeed.toString());
  }, [settings.averageSpeed]);

  useEffect(() => {
    setIntervalInput(settings.forecastInterval.toString());
  }, [settings.forecastInterval]);

  const handleSelectProfile = (speed: number) => {
    playTactileClick();
    setSpeedInput(speed.toString());
    onSettingsChange({
      ...settings,
      averageSpeed: speed,
    });
  };

  const handleSpeedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setSpeedInput(raw);
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= ROUTE_CONFIG.MIN_SPEED && val <= ROUTE_CONFIG.MAX_SPEED) {
      onSettingsChange({
        ...settings,
        averageSpeed: Math.round(val * 10) / 10,
      });
    }
  };

  const handleSpeedBlur = () => {
    const val = parseFloat(speedInput);
    if (isNaN(val) || val < ROUTE_CONFIG.MIN_SPEED) {
      const clamped = ROUTE_CONFIG.MIN_SPEED;
      setSpeedInput(clamped.toString());
      onSettingsChange({ ...settings, averageSpeed: clamped });
    } else if (val > ROUTE_CONFIG.MAX_SPEED) {
      const clamped = ROUTE_CONFIG.MAX_SPEED;
      setSpeedInput(clamped.toString());
      onSettingsChange({ ...settings, averageSpeed: clamped });
    } else {
      const formatted = Math.round(val * 10) / 10;
      setSpeedInput(formatted.toString());
      onSettingsChange({ ...settings, averageSpeed: formatted });
    }
  };

  const adjustSpeed = (delta: number) => {
    playTactileClick();
    const current = typeof settings.averageSpeed === 'number' ? settings.averageSpeed : ROUTE_CONFIG.DEFAULT_SPEED;
    const next = Math.max(
      ROUTE_CONFIG.MIN_SPEED,
      Math.min(ROUTE_CONFIG.MAX_SPEED, Math.round((current + delta) * 10) / 10)
    );
    setSpeedInput(next.toString());
    onSettingsChange({ ...settings, averageSpeed: next });
  };

  const handleIntervalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setIntervalInput(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= ROUTE_CONFIG.MIN_INTERVAL && val <= ROUTE_CONFIG.MAX_INTERVAL) {
      onSettingsChange({
        ...settings,
        forecastInterval: val,
      });
    }
  };

  const handleIntervalBlur = () => {
    const val = parseInt(intervalInput, 10);
    if (isNaN(val) || val < ROUTE_CONFIG.MIN_INTERVAL) {
      const clamped = ROUTE_CONFIG.MIN_INTERVAL;
      setIntervalInput(clamped.toString());
      onSettingsChange({ ...settings, forecastInterval: clamped });
    } else if (val > ROUTE_CONFIG.MAX_INTERVAL) {
      const clamped = ROUTE_CONFIG.MAX_INTERVAL;
      setIntervalInput(clamped.toString());
      onSettingsChange({ ...settings, forecastInterval: clamped });
    } else {
      setIntervalInput(val.toString());
      onSettingsChange({ ...settings, forecastInterval: val });
    }
  };

  const adjustInterval = (delta: number) => {
    playTactileClick();
    const current = typeof settings.forecastInterval === 'number' ? settings.forecastInterval : ROUTE_CONFIG.DEFAULT_INTERVAL;
    const next = Math.max(
      ROUTE_CONFIG.MIN_INTERVAL,
      Math.min(ROUTE_CONFIG.MAX_INTERVAL, current + delta)
    );
    setIntervalInput(next.toString());
    onSettingsChange({ ...settings, forecastInterval: next });
  };

  const handleSelectInterval = (interval: number) => {
    playTactileClick();
    setIntervalInput(interval.toString());
    onSettingsChange({
      ...settings,
      forecastInterval: interval,
    });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      onSettingsChange({
        ...settings,
        startTime: d,
      });
    }
  };

  const handleSetCurrentTime = () => {
    playTactileClick();
    onSettingsChange({
      ...settings,
      startTime: new Date(),
    });
  };

  const toLocalDateTimeString = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Route telemetry preview calculations
  let estimatedDurationStr = '';
  let estimatedPointsCount = 0;
  if (route && route.totalDistance > 0 && settings.averageSpeed > 0) {
    const totalHours = route.totalDistance / settings.averageSpeed;
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    estimatedDurationStr = h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
    estimatedPointsCount = Math.max(2, Math.floor(route.totalDistance / settings.forecastInterval) + 1);
  }

  const matchingProfile = ACTIVITY_PROFILES.find(
    (p) => Math.abs(settings.averageSpeed - p.speedKmH) < 0.1
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with Title & Live Readout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
          <Gauge className="h-3.5 w-3.5 text-amber-400" />
          <span>SPEED & ROUTE SAMPLING</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
            {settings.averageSpeed} km/h
          </span>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            {settings.forecastInterval} km
          </span>
        </div>
      </div>

      {/* Activity Profile Presets Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {ACTIVITY_PROFILES.map((profile) => {
          const isSelected = matchingProfile?.id === profile.id;

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelectProfile(profile.speedKmH)}
              className={cn(
                "p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none flex items-center gap-2",
                isSelected
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-xs"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-lg border shrink-0",
                  isSelected
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-slate-800/80 border-slate-700/60 text-slate-400"
                )}
              >
                {profile.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-slate-100 truncate">
                  {profile.name}
                </div>
                <div className="font-mono text-[10px] text-slate-500">
                  {profile.speedKmH} km/h
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Manual Input Controls: Speed & Interval */}
      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
        {/* Manual Speed Input with Steppers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
              <Gauge className="h-3 w-3 text-amber-400" />
              <span>SPEED</span>
            </label>
            <span className="text-[9px] text-slate-500">1–100 km/h</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-amber-500/70 transition-colors">
            <button
              type="button"
              onClick={() => adjustSpeed(-0.5)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer border-r border-slate-800"
              title="Decrease speed by 0.5 km/h"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={ROUTE_CONFIG.MIN_SPEED}
              max={ROUTE_CONFIG.MAX_SPEED}
              step="0.5"
              value={speedInput}
              onChange={handleSpeedInputChange}
              onBlur={handleSpeedBlur}
              className="w-full bg-transparent text-center font-mono text-xs font-bold text-amber-300 focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => adjustSpeed(0.5)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer border-l border-slate-800"
              title="Increase speed by 0.5 km/h"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="pr-2 font-mono text-[10px] text-slate-500 select-none">
              km/h
            </span>
          </div>
        </div>

        {/* Manual Interval Input with Steppers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
              <Sliders className="h-3 w-3 text-emerald-400" />
              <span>INTERVAL</span>
            </label>
            <span className="text-[9px] text-slate-500">1–50 km</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-emerald-500/70 transition-colors">
            <button
              type="button"
              onClick={() => adjustInterval(-1)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer border-r border-slate-800"
              title="Decrease interval by 1 km"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={ROUTE_CONFIG.MIN_INTERVAL}
              max={ROUTE_CONFIG.MAX_INTERVAL}
              step="1"
              value={intervalInput}
              onChange={handleIntervalInputChange}
              onBlur={handleIntervalBlur}
              className="w-full bg-transparent text-center font-mono text-xs font-bold text-emerald-300 focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => adjustInterval(1)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer border-l border-slate-800"
              title="Increase interval by 1 km"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="pr-2 font-mono text-[10px] text-slate-500 select-none">
              km
            </span>
          </div>
        </div>
      </div>

      {/* Quick Interval Preset Pills */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>QUICK INTERVAL PRESETS</span>
        </div>
        <div className="flex items-center gap-1">
          {INTERVAL_PRESETS.map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => handleSelectInterval(interval)}
              className={cn(
                "flex-1 py-1 rounded-md border text-[11px] font-mono transition-colors cursor-pointer text-center",
                settings.forecastInterval === interval
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              {interval}k
            </button>
          ))}
        </div>
      </div>

      {/* Start Time Picker */}
      <div className="space-y-1 pt-1 font-mono text-xs">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span>START TIME (LOCAL)</span>
          </label>
          <button
            type="button"
            onClick={handleSetCurrentTime}
            className="text-[9px] text-cyan-400 hover:text-cyan-300 uppercase tracking-wider underline cursor-pointer"
          >
            Set Now
          </button>
        </div>
        <input
          type="datetime-local"
          value={toLocalDateTimeString(new Date(settings.startTime))}
          onChange={handleStartTimeChange}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Live Route Pacing Telemetry Strip */}
      {route && route.totalDistance > 0 && (
        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between font-mono text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Timer className="h-3 w-3 text-amber-400" />
            <span>EST. TIME:</span>
            <span className="text-amber-300 font-bold">{estimatedDurationStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3 w-3 text-emerald-400" />
            <span>SAMPLES:</span>
            <span className="text-emerald-300 font-bold">{estimatedPointsCount} points</span>
          </div>
        </div>
      )}
    </div>
  );
}

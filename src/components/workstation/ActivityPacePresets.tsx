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
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#A89F91]">
          <Gauge className="h-3.5 w-3.5 text-[#E5A93C]" />
          <span>SPEED & ROUTE SAMPLING</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-[#E5A93C] font-bold bg-[#E5A93C]/10 border border-[#E5A93C]/30 px-1.5 py-0.5 rounded">
            {settings.averageSpeed} km/h
          </span>
          <span className="text-[#82937D] font-bold bg-[#82937D]/15 border border-[#82937D]/40 px-1.5 py-0.5 rounded">
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
                  ? "bg-[#E5A93C]/15 border-[#E5A93C] text-[#E5A93C] shadow-xs"
                  : "bg-[#1c1814]/70 border-[#453A2E] hover:border-[#E5A93C]/50 text-[#A89F91] hover:text-[#F5F2EB]"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-lg border shrink-0",
                  isSelected
                    ? "bg-[#E5A93C]/20 border-[#E5A93C]/40 text-[#E5A93C]"
                    : "bg-[#28221B] border-[#453A2E] text-[#A89F91]"
                )}
              >
                {profile.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-[#F5F2EB] truncate">
                  {profile.name}
                </div>
                <div className="font-mono text-[10px] text-[#A89F91]">
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
            <label className="text-[10px] text-[#A89F91] uppercase flex items-center gap-1">
              <Gauge className="h-3 w-3 text-[#E5A93C]" />
              <span>SPEED</span>
            </label>
            <span className="text-[9px] text-[#A89F91]/70">1–100 km/h</span>
          </div>

          <div className="flex items-center bg-[#16120F] border border-[#453A2E] rounded-lg overflow-hidden focus-within:border-[#E5A93C]/70 transition-colors">
            <button
              type="button"
              onClick={() => adjustSpeed(-0.5)}
              className="px-2 py-1.5 text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer border-r border-[#453A2E]"
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
              className="w-full bg-transparent text-center font-mono text-xs font-bold text-[#E5A93C] focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => adjustSpeed(0.5)}
              className="px-2 py-1.5 text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer border-l border-[#453A2E]"
              title="Increase speed by 0.5 km/h"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="pr-2 font-mono text-[10px] text-[#A89F91] select-none">
              km/h
            </span>
          </div>
        </div>

        {/* Manual Interval Input with Steppers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-[#A89F91] uppercase flex items-center gap-1">
              <Sliders className="h-3 w-3 text-[#82937D]" />
              <span>INTERVAL</span>
            </label>
            <span className="text-[9px] text-[#A89F91]/70">1–50 km</span>
          </div>

          <div className="flex items-center bg-[#16120F] border border-[#453A2E] rounded-lg overflow-hidden focus-within:border-[#82937D]/70 transition-colors">
            <button
              type="button"
              onClick={() => adjustInterval(-1)}
              className="px-2 py-1.5 text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer border-r border-[#453A2E]"
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
              className="w-full bg-transparent text-center font-mono text-xs font-bold text-[#82937D] focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => adjustInterval(1)}
              className="px-2 py-1.5 text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer border-l border-[#453A2E]"
              title="Increase interval by 1 km"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="pr-2 font-mono text-[10px] text-[#A89F91] select-none">
              km
            </span>
          </div>
        </div>
      </div>

      {/* Quick Interval Preset Pills */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[#A89F91] font-mono">
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
                  ? "bg-[#82937D]/20 border-[#82937D] text-[#82937D] font-bold"
                  : "bg-[#16120F] border-[#453A2E] text-[#A89F91] hover:text-[#F5F2EB]"
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
          <label className="text-[10px] text-[#A89F91] uppercase flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#E5A93C]" />
            <span>START TIME (LOCAL)</span>
          </label>
          <button
            type="button"
            onClick={handleSetCurrentTime}
            className="text-[9px] text-[#E5A93C] hover:text-[#d4962b] uppercase tracking-wider underline cursor-pointer"
          >
            Set Now
          </button>
        </div>
        <input
          type="datetime-local"
          value={toLocalDateTimeString(new Date(settings.startTime))}
          onChange={handleStartTimeChange}
          className="w-full bg-[#16120F] border border-[#453A2E] rounded-lg px-2.5 py-1.5 text-[#F5F2EB] text-xs focus:outline-none focus:border-[#E5A93C]"
        />
      </div>

      {/* Live Route Pacing Telemetry Strip */}
      {route && route.totalDistance > 0 && (
        <div className="p-2 rounded-lg bg-[#16120F]/90 border border-[#453A2E] flex items-center justify-between font-mono text-[10px] text-[#A89F91]">
          <div className="flex items-center gap-1.5">
            <Timer className="h-3 w-3 text-[#E5A93C]" />
            <span>EST. TIME:</span>
            <span className="text-[#E5A93C] font-bold">{estimatedDurationStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3 w-3 text-[#82937D]" />
            <span>SAMPLES:</span>
            <span className="text-[#82937D] font-bold">{estimatedPointsCount} points</span>
          </div>
        </div>
      )}
    </div>
  );
}

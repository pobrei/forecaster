"use client";

import React, { useState } from 'react';
import { 
  Layers, 
  CloudRain, 
  Wind, 
  Eye, 
  EyeOff, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playTactileClick } from '@/lib/audio-fx';

interface MapHUDControlsProps {
  radarActive: boolean;
  onToggleRadar: () => void;
  windVectorsActive: boolean;
  onToggleWindVectors: () => void;
  cloudsActive: boolean;
  onToggleClouds: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  className?: string;
}

export function MapHUDControls({
  radarActive,
  onToggleRadar,
  windVectorsActive,
  onToggleWindVectors,
  cloudsActive,
  onToggleClouds,
  onZoomIn,
  onZoomOut,
  onResetView,
  className,
}: MapHUDControlsProps) {
  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className={cn("flex flex-col items-end gap-2 font-mono text-xs select-none", className)}>
      {/* 1. Floating Tactical Layer Toggle Cluster */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            playTactileClick();
            onToggleRadar();
          }}
          title="Toggle Precipitation Radar"
          className={cn(
            "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] uppercase cursor-pointer",
            radarActive
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          )}
        >
          <CloudRain className="h-3 w-3 text-cyan-400" />
          <span className="hidden sm:inline">RADAR</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileClick();
            onToggleWindVectors();
          }}
          title="Toggle Wind Vector Streamlines"
          className={cn(
            "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] uppercase cursor-pointer",
            windVectorsActive
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          )}
        >
          <Wind className="h-3 w-3 text-emerald-400" />
          <span className="hidden sm:inline">VECTORS</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileClick();
            onToggleClouds();
          }}
          title="Toggle Cloud Density Layer"
          className={cn(
            "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] uppercase cursor-pointer",
            cloudsActive
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          )}
        >
          <Layers className="h-3 w-3 text-amber-400" />
          <span className="hidden sm:inline">CLOUDS</span>
        </button>
      </div>

      {/* 2. Map Navigation Controls (Zoom & Recenter) */}
      <div className="flex flex-col gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl">
        {onZoomIn && (
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onZoomIn();
            }}
            title="Zoom In"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        )}

        {onZoomOut && (
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onZoomOut();
            }}
            title="Zoom Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        )}

        {onResetView && (
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onResetView();
            }}
            title="Recenter Map on Route"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors cursor-pointer border-t border-slate-800/80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

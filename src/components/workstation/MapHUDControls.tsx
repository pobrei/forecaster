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
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#16120F]/90 backdrop-blur-md border border-[#453A2E] shadow-2xl">
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
              ? "bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/60 shadow-xs font-bold"
              : "text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B]"
          )}
        >
          <CloudRain className="h-3 w-3 text-[#E5A93C]" />
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
              ? "bg-[#82937D]/25 text-[#82937D] border border-[#82937D]/60 shadow-xs font-bold"
              : "text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B]"
          )}
        >
          <Wind className="h-3 w-3 text-[#82937D]" />
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
              ? "bg-[#C4A482]/20 text-[#C4A482] border border-[#C4A482]/60 shadow-xs font-bold"
              : "text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B]"
          )}
        >
          <Layers className="h-3 w-3 text-[#C4A482]" />
          <span className="hidden sm:inline">CLOUDS</span>
        </button>
      </div>

      {/* 2. Map Navigation Controls (Zoom & Recenter) */}
      <div className="flex flex-col gap-1 p-1 rounded-xl bg-[#16120F]/90 backdrop-blur-md border border-[#453A2E] shadow-2xl">
        {onZoomIn && (
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onZoomIn();
            }}
            title="Zoom In"
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer"
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
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer"
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
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#E5A93C] hover:bg-[#28221B] transition-colors cursor-pointer border-t border-[#453A2E]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

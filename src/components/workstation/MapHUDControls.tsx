"use client";

import React from 'react';
import { 
  Layers, 
  CloudRain, 
  Wind, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw
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
          title={radarActive ? "Disable Precipitation Radar" : "Enable Precipitation Radar"}
          className={cn(
            "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] tracking-wider uppercase cursor-pointer border",
            radarActive
              ? "bg-[#E5A93C]/20 text-[#E5A93C] border-[#E5A93C]/60 shadow-xs font-bold"
              : "text-[#A89F91] border-transparent hover:text-[#F5F2EB] hover:bg-[#28221B]"
          )}
        >
          <CloudRain className={cn("h-3.5 w-3.5 transition-colors", radarActive ? "text-[#E5A93C]" : "text-[#A89F91]/70")} />
          <span>RADAR</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileClick();
            onToggleWindVectors();
          }}
          title={windVectorsActive ? "Disable Wind Vectors" : "Enable Wind Vectors"}
          className={cn(
            "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] tracking-wider uppercase cursor-pointer border",
            windVectorsActive
              ? "bg-[#82937D]/25 text-[#82937D] border-[#82937D]/60 shadow-xs font-bold"
              : "text-[#A89F91] border-transparent hover:text-[#F5F2EB] hover:bg-[#28221B]"
          )}
        >
          <Wind className={cn("h-3.5 w-3.5 transition-colors", windVectorsActive ? "text-[#82937D]" : "text-[#A89F91]/70")} />
          <span>VECTORS</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileClick();
            onToggleClouds();
          }}
          title={cloudsActive ? "Disable Cloud Cover Layer" : "Enable Cloud Cover Layer"}
          className={cn(
            "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px] tracking-wider uppercase cursor-pointer border",
            cloudsActive
              ? "bg-[#C4A482]/20 text-[#C4A482] border-[#C4A482]/60 shadow-xs font-bold"
              : "text-[#A89F91] border-transparent hover:text-[#F5F2EB] hover:bg-[#28221B]"
          )}
        >
          <Layers className={cn("h-3.5 w-3.5 transition-colors", cloudsActive ? "text-[#C4A482]" : "text-[#A89F91]/70")} />
          <span>CLOUDS</span>
        </button>
      </div>

      {/* 2. Map Navigation Controls (Zoom & Recenter) */}
      {(onZoomIn || onZoomOut || onResetView) && (
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
      )}
    </div>
  );
}

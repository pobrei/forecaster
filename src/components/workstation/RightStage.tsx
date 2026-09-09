"use client";

import React, { useState, useCallback } from 'react';
import { 
  Compass, 
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast, SelectedWeatherPoint } from '@/types';
import { WeatherMap, BasemapMode } from '@/components/features/WeatherMap';
import { MapHUDControls } from './MapHUDControls';
import { ElevationWeatherSync } from './ElevationWeatherSync';
import { ModelDivergenceRibbon } from './ModelDivergenceRibbon';

interface RightStageProps {
  route: Route | null;
  forecasts: WeatherForecast[];
  selectedPoint: SelectedWeatherPoint | null;
  onPointSelect: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  units?: 'metric' | 'imperial';
  onLoadSampleAlpine?: () => void;
  onOpenComparison?: () => void;
  isVisible?: boolean;
  activeTab?: string;
}

export function RightStage({
  route,
  forecasts,
  selectedPoint,
  onPointSelect,
  units = 'metric',
  onLoadSampleAlpine,
  onOpenComparison,
  isVisible,
  activeTab,
}: RightStageProps) {
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
  const [radarActive, setRadarActive] = useState(false);
  const [windVectorsActive, setWindVectorsActive] = useState(true);
  const [cloudsActive, setCloudsActive] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  const handleElevationHover = useCallback((_forecast: WeatherForecast | null, index: number | null) => {
    setHoveredPointIndex((prev) => (prev === index ? prev : index));
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#12100E] select-none">
      {/* ========================================================================= */}
      {/* 1. MAIN INTERACTIVE MAP VIEWPORT (OPENLAYERS CANVAS)                      */}
      {/* ========================================================================= */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {route ? (
          <>
            <WeatherMap
              route={route}
              forecasts={forecasts}
              units={units}
              selectedPoint={selectedPoint}
              hoveredPointIndex={hoveredPointIndex}
              onPointSelect={onPointSelect}
              basemapMode={basemap}
              onBasemapChange={setBasemap}
              isVisible={isVisible}
              activeTab={activeTab}
              radarActive={radarActive}
              windVectorsActive={windVectorsActive}
              cloudsActive={cloudsActive}
              className="w-full h-full border-none rounded-none"
            />

            {/* Floating Top-Right Map HUD Controls & Model Divergence Ribbon */}
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 pointer-events-auto flex flex-col items-end gap-1.5 sm:gap-2 max-w-[calc(100vw-20px)] sm:max-w-sm">
              <MapHUDControls
                radarActive={radarActive}
                onToggleRadar={() => setRadarActive(!radarActive)}
                windVectorsActive={windVectorsActive}
                onToggleWindVectors={() => setWindVectorsActive(!windVectorsActive)}
                cloudsActive={cloudsActive}
                onToggleClouds={() => setCloudsActive(!cloudsActive)}
              />

              {/* Multi-Model Synoptic Consensus Ribbon */}
              {forecasts.length > 0 && (
                <ModelDivergenceRibbon 
                  forecasts={forecasts} 
                  onOpenComparison={onOpenComparison}
                  className="w-auto max-w-[calc(100vw-24px)] sm:max-w-sm" 
                />
              )}
            </div>

            {/* Tactical Coordinate & Track Legend Stamp (Bottom-Left of Map) */}
            <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-30 pointer-events-none font-mono text-[9px] sm:text-[10px] text-[#A89F91] bg-[#16120F]/90 backdrop-blur-md px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-[#453A2E]/80 shadow-2xl flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#E5A93C]" />
                <span className="text-[#F5F2EB] uppercase font-semibold">TRACK</span>
              </div>
              <span className="text-[#453A2E]">•</span>
              <span>{route.points.length} NODES</span>
              {forecasts.length > 0 && (
                <>
                  <span className="text-[#453A2E]">•</span>
                  <span className="text-[#82937D] font-bold">{forecasts.length} FIXES</span>
                </>
              )}
            </div>
          </>
        ) : (
          /* Zero-State Standby Screen */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#12100E] bg-[radial-gradient(#2c251f_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="h-14 w-14 rounded-2xl bg-[#E5A93C]/10 border border-[#E5A93C]/20 flex items-center justify-center text-[#E5A93C] mb-3 shadow-inner">
              <Compass className="h-7 w-7" />
            </div>

            <h3 className="text-base font-bold text-[#F5F2EB] font-mono tracking-wide">
              EXPEDITION GEOSPATIAL RADAR
            </h3>
            <p className="font-sans text-xs text-[#A89F91] max-w-md mt-1 mb-5 leading-relaxed">
              OpenLayers satellite engine initialized. Ingest a GPX file or launch the sample Swiss Alpine route to inspect topography, polyline weather gradients, and aerodynamic wind vectors.
            </p>

            {onLoadSampleAlpine && (
              <button
                type="button"
                onClick={onLoadSampleAlpine}
                className="px-4 py-2 rounded-xl bg-[#E5A93C] hover:bg-[#d4972e] text-[#12100E] font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(229,169,60,0.25)] transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>Load Alpine 45km Recon Route</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SYNCHRONIZED ELEVATION & WEATHER METRIC GRAPH DRAWER                   */}
      {/* ========================================================================= */}
      {route && (
        <div
          className={cn(
            "shrink-0 border-t border-[#453A2E] bg-[#16120F]/95 backdrop-blur-md z-20 transition-all duration-300 flex flex-col",
            isDrawerCollapsed 
              ? "h-7 sm:h-8" 
              : isDrawerExpanded 
                ? "h-[270px] sm:h-[310px]" 
                : "h-[200px] sm:h-[215px]"
          )}
        >
          {/* Collapsible Header Strip */}
          <div 
            onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
            className="h-7 shrink-0 px-3 bg-[#1C1814] hover:bg-[#251F19] border-b border-[#453A2E]/70 flex items-center justify-between cursor-pointer text-[#F5F2EB] select-none transition-colors"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase text-[#A89F91]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E5A93C]" />
              <span className="font-semibold text-[#F5F2EB]">ELEVATION PROFILE & AERODYNAMIC WIND</span>
              <span className="hidden sm:inline text-[#A89F91]/70">
                • {route.totalDistance.toFixed(1)} km
              </span>
            </div>

            <span className="text-[9px] font-mono text-[#E5A93C] uppercase font-bold tracking-wider">
              {isDrawerCollapsed ? "▲ EXPAND GRAPH" : "▼ MINIMIZE"}
            </span>
          </div>

          <div className={cn("flex-1 min-h-0 overflow-hidden", isDrawerCollapsed && "hidden")}>
            <ElevationWeatherSync
              route={route}
              forecasts={forecasts}
              units={units}
              hoveredIndex={hoveredPointIndex}
              onHoverPoint={handleElevationHover}
              onSelectPoint={(f, idx) => onPointSelect(idx, 'chart')}
              isExpanded={isDrawerExpanded}
              onToggleExpand={() => setIsDrawerExpanded(!isDrawerExpanded)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

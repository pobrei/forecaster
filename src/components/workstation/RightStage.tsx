"use client";

import React, { useState, useCallback } from 'react';
import { 
  MapPin, 
  Layers, 
  Compass, 
  Mountain, 
  Wind, 
  Eye, 
  Sparkles,
  Activity
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
}

export function RightStage({
  route,
  forecasts,
  selectedPoint,
  onPointSelect,
  units = 'metric',
  onLoadSampleAlpine,
}: RightStageProps) {
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
  const [radarActive, setRadarActive] = useState(true);
  const [windVectorsActive, setWindVectorsActive] = useState(true);
  const [cloudsActive, setCloudsActive] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const handleElevationHover = useCallback((_forecast: WeatherForecast | null, index: number | null) => {
    setHoveredPointIndex((prev) => (prev === index ? prev : index));
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-950 select-none">
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
              onPointSelect={onPointSelect}
              basemapMode={basemap}
              onBasemapChange={setBasemap}
              className="w-full h-full border-none rounded-none"
            />

            {/* Floating Top-Right Map HUD Controls */}
            <div className="absolute top-3 right-3 z-30 pointer-events-auto flex flex-col items-end gap-2 max-w-sm">
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
                <ModelDivergenceRibbon forecasts={forecasts} className="w-full" />
              )}
            </div>

            {/* Tactical Coordinate & Track Legend Stamp (Bottom-Left of Map) */}
            <div className="absolute bottom-3 left-3 z-30 pointer-events-none font-mono text-[10px] text-slate-400 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800/80 shadow-lg flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-slate-200 uppercase font-semibold">TRACK POLYLINE</span>
              </div>
              <span className="text-slate-600">•</span>
              <span>{route.points.length} COORD NODES</span>
              {forecasts.length > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-bold">{forecasts.length} WEATHER FIXES</span>
                </>
              )}
            </div>
          </>
        ) : (
          /* Zero-State Standby Screen */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
              <Compass className="h-7 w-7" />
            </div>

            <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              EXPEDITION GEOSPATIAL RADAR
            </h3>
            <p className="font-sans text-xs text-slate-400 max-w-md mt-1 mb-5 leading-relaxed">
              OpenLayers satellite engine initialized. Ingest a GPX file or launch the sample Swiss Alpine route to inspect topography, polyline weather gradients, and aerodynamic wind vectors.
            </p>

            {onLoadSampleAlpine && (
              <button
                type="button"
                onClick={onLoadSampleAlpine}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-95"
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
            "shrink-0 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-md z-20 transition-all duration-300",
            isDrawerExpanded ? "h-[290px] sm:h-[320px]" : "h-[195px] sm:h-[210px]"
          )}
        >
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
      )}
    </div>
  );
}

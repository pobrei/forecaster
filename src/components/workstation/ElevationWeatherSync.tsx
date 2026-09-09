"use client";

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Mountain, 
  Wind, 
  Thermometer, 
  CloudRain, 
  Maximize2, 
  Minimize2,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast } from '@/types';
import { formatTemperature } from '@/lib/format';
import { playTactileClick } from '@/lib/audio-fx';

export type GraphMetricMode = 'elevation' | 'temperature' | 'rain' | 'wind' | 'multi';

interface ElevationWeatherSyncProps {
  route: Route | null;
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  hoveredIndex?: number | null;
  onHoverPoint?: (forecast: WeatherForecast | null, index: number | null) => void;
  onSelectPoint?: (forecast: WeatherForecast, index: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

function calculateBearing(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const dLon = toRad(p2.lon - p1.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.round(((toDeg(Math.atan2(y, x)) + 360) % 360));
}

export function ElevationWeatherSync({
  route,
  forecasts,
  units = 'metric',
  hoveredIndex: externalHoveredIndex,
  onHoverPoint,
  onSelectPoint,
  isExpanded: externalExpanded,
  onToggleExpand,
  className,
}: ElevationWeatherSyncProps) {
  const [internalMetric, setInternalMetric] = useState<GraphMetricMode>('elevation');
  const [internalHoverIndex, setInternalHoverIndex] = useState<number | null>(null);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const isExpanded = externalExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded(!internalExpanded));

  const activeIndex = externalHoveredIndex ?? internalHoverIndex ?? (forecasts.length > 0 ? 0 : null);
  const activeForecast = activeIndex !== null && forecasts[activeIndex] ? forecasts[activeIndex] : null;

  const points = useMemo(() => route?.points || [], [route?.points]);
  const totalDist = route?.totalDistance || (points.length > 0 ? points[points.length - 1].distance : 1);

  // SVG coordinate dimensions
  const svgWidth = 840;
  const svgHeight = isExpanded ? 240 : 120;
  const padTop = 18;
  const padBottom = 22;
  const usableHeight = svgHeight - padTop - padBottom;

  // 1. Elevation Profile Calculations
  const elevations = useMemo(() => points.map((p) => p.elevation ?? 0), [points]);
  const minElev = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElev = elevations.length > 0 ? Math.max(...elevations) : 1000;
  const elevRange = Math.max(maxElev - minElev, 100);

  const elevationPathD = useMemo(() => {
    if (points.length < 2 || totalDist <= 0) return '';
    const coords = points.map((p) => {
      const x = (p.distance / totalDist) * svgWidth;
      const normalizedElev = ((p.elevation ?? minElev) - minElev) / elevRange;
      const y = padTop + (1 - normalizedElev) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M 0,${svgHeight - padBottom} L ${coords.join(' L ')} L ${svgWidth},${svgHeight - padBottom} Z`;
  }, [points, totalDist, minElev, elevRange, usableHeight, svgHeight, padBottom, padTop]);

  const elevationLineD = useMemo(() => {
    if (points.length < 2 || totalDist <= 0) return '';
    const coords = points.map((p) => {
      const x = (p.distance / totalDist) * svgWidth;
      const normalizedElev = ((p.elevation ?? minElev) - minElev) / elevRange;
      const y = padTop + (1 - normalizedElev) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [points, totalDist, minElev, elevRange, usableHeight, padTop]);

  // 2. Temperature Data Calculations (Temp & Feels Like)
  const temperatures = useMemo(() => forecasts.map((f) => f.weather.temp), [forecasts]);
  const feelsLikeTemps = useMemo(() => forecasts.map((f) => f.weather.feels_like), [forecasts]);
  const allTemps = [...temperatures, ...feelsLikeTemps];
  const minTemp = allTemps.length > 0 ? Math.floor(Math.min(...allTemps)) - 2 : 0;
  const maxTemp = allTemps.length > 0 ? Math.ceil(Math.max(...allTemps)) + 2 : 30;
  const tempRange = Math.max(maxTemp - minTemp, 5);

  const tempLineD = useMemo(() => {
    if (forecasts.length < 2 || totalDist <= 0) return '';
    const coords = forecasts.map((f) => {
      const x = (f.routePoint.distance / totalDist) * svgWidth;
      const normalized = (f.weather.temp - minTemp) / tempRange;
      const y = padTop + (1 - normalized) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [forecasts, totalDist, minTemp, tempRange, usableHeight, padTop]);

  const feelsLikeLineD = useMemo(() => {
    if (forecasts.length < 2 || totalDist <= 0) return '';
    const coords = forecasts.map((f) => {
      const x = (f.routePoint.distance / totalDist) * svgWidth;
      const normalized = (f.weather.feels_like - minTemp) / tempRange;
      const y = padTop + (1 - normalized) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [forecasts, totalDist, minTemp, tempRange, usableHeight, padTop]);

  // 0°C Freezing Isotherm level on Temp Chart
  const freezingTempY = useMemo(() => {
    if (minTemp > 0 || maxTemp < 0) return null;
    const normalized = (0 - minTemp) / tempRange;
    return padTop + (1 - normalized) * usableHeight;
  }, [minTemp, maxTemp, tempRange, usableHeight, padTop]);

  // 3. Wind Data Calculations (Speed & Gusts)
  const windSpeeds = useMemo(() => forecasts.map((f) => f.weather.wind_speed * 3.6), [forecasts]); // km/h
  const windGusts = useMemo(() => forecasts.map((f) => (f.weather.wind_gust ?? f.weather.wind_speed * 1.3) * 3.6), [forecasts]);
  const maxWindKmh = Math.max(Math.max(...windGusts, ...windSpeeds, 20), 30);

  const windLineD = useMemo(() => {
    if (forecasts.length < 2 || totalDist <= 0) return '';
    const coords = forecasts.map((f, i) => {
      const x = (f.routePoint.distance / totalDist) * svgWidth;
      const normalized = windSpeeds[i] / maxWindKmh;
      const y = padTop + (1 - normalized) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [forecasts, totalDist, windSpeeds, maxWindKmh, usableHeight, padTop]);

  const windGustAreaD = useMemo(() => {
    if (forecasts.length < 2 || totalDist <= 0) return '';
    const topCoords = forecasts.map((f, i) => {
      const x = (f.routePoint.distance / totalDist) * svgWidth;
      const normalized = windGusts[i] / maxWindKmh;
      const y = padTop + (1 - normalized) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M 0,${svgHeight - padBottom} L ${topCoords.join(' L ')} L ${svgWidth},${svgHeight - padBottom} Z`;
  }, [forecasts, totalDist, windGusts, maxWindKmh, usableHeight, svgHeight, padBottom, padTop]);

  // 4. Precipitation Data Calculations (Rain mm/h & Probability %)
  const rainProbLineD = useMemo(() => {
    if (forecasts.length < 2 || totalDist <= 0) return '';
    const coords = forecasts.map((f) => {
      const x = (f.routePoint.distance / totalDist) * svgWidth;
      const pop = f.weather.pop ?? 0;
      const y = padTop + (1 - pop) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [forecasts, totalDist, usableHeight, padTop]);

  // Active Aerodynamic Wind Analysis
  const windAnalysis = useMemo(() => {
    if (!activeForecast || points.length < 2) return null;
    const currentDist = activeForecast.routePoint.distance;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].distance - currentDist);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    const nextIdx = Math.min(closestIdx + 1, points.length - 1);
    const prevIdx = Math.max(closestIdx - 1, 0);

    const heading = calculateBearing(points[prevIdx], points[nextIdx]);
    const windSpeed = activeForecast.weather.wind_speed;
    const windDeg = activeForecast.weather.wind_deg;
    const relAngle = ((windDeg - heading + 360) % 360);
    const relAngleRad = (relAngle * Math.PI) / 180;

    const parallelSpeed = -Math.round(windSpeed * Math.cos(relAngleRad) * 10) / 10;
    const crosswindSpeed = Math.round(Math.abs(windSpeed * Math.sin(relAngleRad)) * 10) / 10;
    const isHeadwind = parallelSpeed > 0;

    return {
      heading,
      windSpeed,
      windDeg,
      relAngle,
      parallelSpeed: Math.abs(parallelSpeed),
      crosswindSpeed,
      isHeadwind,
      type: Math.abs(parallelSpeed) < 1 ? 'Crosswind' : isHeadwind ? 'Headwind' : 'Tailwind',
    };
  }, [activeForecast, points]);

  const lastHoveredIndexRef = useRef<number | null>(null);

  // Mouse scrubbing with zero-latency local coordinate calculation
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || forecasts.length === 0) return;
    
    // In 3D CSS transformed viewports, nativeEvent.offsetX provides instant hit-tested local coordinates
    // without triggering expensive synchronous getBoundingClientRect layout reflows
    const width = svgRef.current.clientWidth || 400;
    const clientX = typeof e.nativeEvent.offsetX === 'number'
      ? e.nativeEvent.offsetX
      : (e.clientX - svgRef.current.getBoundingClientRect().left);

    const ratio = Math.max(0, Math.min(1, clientX / width));
    const targetDist = ratio * totalDist;

    let closestIndex = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < forecasts.length; i++) {
      const diff = Math.abs(forecasts[i].routePoint.distance - targetDist);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    if (closestIndex === lastHoveredIndexRef.current) return;
    lastHoveredIndexRef.current = closestIndex;
    setInternalHoverIndex(closestIndex);
    if (onHoverPoint) onHoverPoint(forecasts[closestIndex], closestIndex);
  }, [forecasts, totalDist, onHoverPoint]);

  const handleMouseLeave = useCallback(() => {
    if (lastHoveredIndexRef.current === null) return;
    lastHoveredIndexRef.current = null;
    setInternalHoverIndex(null);
    if (onHoverPoint) onHoverPoint(null, null);
  }, [onHoverPoint]);

  const handleClick = () => {
    if (activeIndex !== null && forecasts[activeIndex] && onSelectPoint) {
      onSelectPoint(forecasts[activeIndex], activeIndex);
    }
  };

  if (!route) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-[#A89F91] font-mono text-xs select-none">
        <Activity className="h-4 w-4 mr-2 opacity-60 text-[#E5A93C]" />
        <span>ELEVATION & TELEMETRY STANDBY • INGEST GPX TRACK</span>
      </div>
    );
  }

  const activeCursorX = activeForecast && totalDist > 0
    ? (activeForecast.routePoint.distance / totalDist) * svgWidth
    : null;

  return (
    <div className={cn("h-full flex flex-col justify-between p-2.5 sm:p-3 select-none font-mono text-xs", className)}>
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL BAR: GRAPH METRIC TABS & EXPAND TOGGLE                     */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#453A2E]">
        {/* Metric Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#16120F] p-0.5 rounded-lg border border-[#453A2E] text-[10px]">
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              setInternalMetric('elevation');
            }}
            className={cn(
              "px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer",
              internalMetric === 'elevation'
                ? "bg-[#E5A93C]/20 text-[#E5A93C] font-bold border border-[#E5A93C]/50 shadow-xs"
                : "text-[#A89F91] hover:text-[#F5F2EB]"
            )}
          >
            <Mountain className="h-3 w-3" />
            <span>ELEVATION</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTactileClick();
              setInternalMetric('temperature');
            }}
            className={cn(
              "px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer",
              internalMetric === 'temperature'
                ? "bg-[#E5A93C] text-[#12100E] font-bold shadow-xs"
                : "text-[#A89F91] hover:text-[#F5F2EB]"
            )}
          >
            <Thermometer className="h-3 w-3" />
            <span>TEMP vs KM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTactileClick();
              setInternalMetric('rain');
            }}
            className={cn(
              "px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer",
              internalMetric === 'rain'
                ? "bg-[#82937D] text-[#12100E] font-bold shadow-xs"
                : "text-[#A89F91] hover:text-[#F5F2EB]"
            )}
          >
            <CloudRain className="h-3 w-3" />
            <span>RAIN vs KM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTactileClick();
              setInternalMetric('wind');
            }}
            className={cn(
              "px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer",
              internalMetric === 'wind'
                ? "bg-[#C4A482] text-[#12100E] font-bold shadow-xs"
                : "text-[#A89F91] hover:text-[#F5F2EB]"
            )}
          >
            <Wind className="h-3 w-3" />
            <span>WIND & GUSTS</span>
          </button>
        </div>

        {/* Right: Active Telemetry Values & Drawer Height Toggle */}
        <div className="flex items-center gap-2.5 text-[11px] tabular-nums">
          {activeForecast && (
            <div className="flex items-center gap-2">
              <span className="text-[#E5A93C] font-bold">{activeForecast.routePoint.distance.toFixed(1)} km</span>
              <span className="text-[#453A2E]">•</span>
              <span className="text-[#F5F2EB]">ALT: {Math.round(activeForecast.routePoint.elevation ?? 0)}m</span>
              <span className="text-[#453A2E]">•</span>
              <span className="text-[#E5A93C] font-bold">
                {formatTemperature(activeForecast.weather.temp, units)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#E5A93C]/15 border border-[#E5A93C]/40 text-[#E5A93C] font-bold text-[10px] uppercase">
                FEELS {formatTemperature(activeForecast.weather.feels_like, units)}
              </span>
              <span className="text-[#453A2E]">•</span>
              <span className="text-[#F5F2EB] font-semibold">
                {Math.round(activeForecast.weather.wind_speed * 3.6)} km/h
                {windAnalysis && (
                  <span className="text-[#A89F91] text-[10px] ml-1 uppercase font-normal">
                    ({windAnalysis.type})
                  </span>
                )}
              </span>
              <span className="text-[#453A2E]">•</span>
              <span className="text-[#82937D] font-semibold">
                {Math.round((activeForecast.weather.pop ?? 0) * 100)}% rain
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playTactileClick();
              toggleExpand();
            }}
            title={isExpanded ? "Collapse graph height" : "Expand graph height"}
            className="p-1 rounded bg-[#16120F] hover:bg-[#28221B] text-[#A89F91] hover:text-[#F5F2EB] border border-[#453A2E] transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC GRAPH CANVAS (SWITCHABLE BY METRIC)                             */}
      {/* ========================================================================= */}
      <div className="relative flex-1 min-h-[95px] w-full mt-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="w-full h-full cursor-crosshair overflow-visible"
        >
          <defs>
            <linearGradient id="elevRamp" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E5A93C" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#12100E" stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="tempRamp" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E5A93C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#12100E" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="windGustRamp" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C4A482" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#12100E" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="rainBarRamp" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#82937D" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#453A2E" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line x1={0} y1={padTop} x2={svgWidth} y2={padTop} stroke="#453A2E" strokeDasharray="3,3" strokeWidth="0.8" opacity="0.6" />
          <line x1={0} y1={padTop + usableHeight / 2} x2={svgWidth} y2={padTop + usableHeight / 2} stroke="#453A2E" strokeDasharray="3,3" strokeWidth="0.8" opacity="0.6" />
          <line x1={0} y1={svgHeight - padBottom} x2={svgWidth} y2={svgHeight - padBottom} stroke="#453A2E" strokeWidth="1" />

          {/* --------------------------------------------------------------------- */}
          {/* MODE A: ELEVATION PROFILE                                             */}
          {/* --------------------------------------------------------------------- */}
          {internalMetric === 'elevation' && (
            <>
              {elevationPathD && <path d={elevationPathD} fill="url(#elevRamp)" />}
              {elevationLineD && (
                <path d={elevationLineD} fill="none" stroke="#E5A93C" strokeWidth="2.2" strokeLinecap="round" />
              )}
              {/* Y-Axis Label */}
              <text x={4} y={padTop + 10} fill="#A89F91" fontSize="9" fontFamily="monospace">
                MAX: {Math.round(maxElev)}m
              </text>
              <text x={4} y={svgHeight - padBottom - 4} fill="#A89F91" fontSize="9" fontFamily="monospace">
                MIN: {Math.round(minElev)}m
              </text>
            </>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* MODE B: TEMPERATURE VS. KM                                            */}
          {/* --------------------------------------------------------------------- */}
          {internalMetric === 'temperature' && (
            <>
              {/* Freezing 0°C Line */}
              {freezingTempY !== null && (
                <g>
                  <line x1={0} y1={freezingTempY} x2={svgWidth} y2={freezingTempY} stroke="#82937D" strokeWidth="1" strokeDasharray="4,4" opacity="0.8" />
                  <text x={svgWidth - 6} y={freezingTempY - 3} fill="#82937D" fontSize="8" fontFamily="monospace" textAnchor="end">
                    0°C FREEZING LEVEL
                  </text>
                </g>
              )}

              {/* Feels Like Dashed Line */}
              {feelsLikeLineD && (
                <path d={feelsLikeLineD} fill="none" stroke="#F5F2EB" strokeWidth="1.5" strokeDasharray="4,4" opacity={0.65} />
              )}

              {/* Ambient Temp Solid Curve */}
              {tempLineD && (
                <path d={tempLineD} fill="none" stroke="#E5A93C" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {/* Legend for Temp vs Feels Like */}
              <g>
                <line x1={svgWidth - 210} y1={padTop + 6} x2={svgWidth - 190} y2={padTop + 6} stroke="#E5A93C" strokeWidth="2.5" />
                <text x={svgWidth - 185} y={padTop + 9} fill="#E5A93C" fontSize="8" fontFamily="monospace">AIR TEMP</text>
                
                <line x1={svgWidth - 120} y1={padTop + 6} x2={svgWidth - 100} y2={padTop + 6} stroke="#F5F2EB" strokeWidth="1.5" strokeDasharray="3,3" />
                <text x={svgWidth - 95} y={padTop + 9} fill="#F5F2EB" fontSize="8" fontFamily="monospace">FEELS LIKE</text>
              </g>

              {/* Y-Axis Ticks */}
              <text x={4} y={padTop + 10} fill="#E5A93C" fontSize="9" fontFamily="monospace">
                HIGH: {maxTemp}°C
              </text>
              <text x={4} y={svgHeight - padBottom - 4} fill="#82937D" fontSize="9" fontFamily="monospace">
                LOW: {minTemp}°C
              </text>

              {/* Live Cursor Air Temp vs Feels Like Tag */}
              {activeCursorX !== null && activeForecast && (
                <g>
                  <rect
                    x={Math.max(10, Math.min(activeCursorX - 60, svgWidth - 130))}
                    y={4}
                    width="120"
                    height="18"
                    rx="4"
                    fill="#16120F"
                    stroke="#E5A93C"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x={Math.max(10, Math.min(activeCursorX - 60, svgWidth - 130)) + 60}
                    y={16}
                    fill="#F5F2EB"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    AIR: {Math.round(activeForecast.weather.temp)}° | FEELS: {Math.round(activeForecast.weather.feels_like)}°
                  </text>
                </g>
              )}
            </>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* MODE C: PRECIPITATION / RAIN VS. KM                                   */}
          {/* --------------------------------------------------------------------- */}
          {internalMetric === 'rain' && (
            <>
              {/* Precipitation Volume Bars */}
              {forecasts.map((f) => {
                const rainMm = f.weather.rain?.['1h'] || (f.weather.pop ? f.weather.pop * 4 : 0);
                if (rainMm <= 0.1) return null;
                const x = (f.routePoint.distance / totalDist) * svgWidth;
                const barH = Math.min((rainMm / 10) * usableHeight, usableHeight);
                return (
                  <rect
                    key={`rain-${f.routePoint.distance}`}
                    x={x - 3}
                    y={svgHeight - padBottom - barH}
                    width={6}
                    height={barH}
                    fill="url(#rainBarRamp)"
                    rx={1.5}
                  />
                );
              })}

              {/* Rain Probability Line */}
              {rainProbLineD && (
                <path d={rainProbLineD} fill="none" stroke="#82937D" strokeWidth="2" strokeLinecap="round" />
              )}

              <text x={4} y={padTop + 10} fill="#82937D" fontSize="9" fontFamily="monospace">
                100% PROBABILITY
              </text>
              <text x={4} y={svgHeight - padBottom - 4} fill="#A89F91" fontSize="9" fontFamily="monospace">
                0% DRY
              </text>
            </>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* MODE D: WIND SPEED & PEAK GUSTS VS. KM                                */}
          {/* --------------------------------------------------------------------- */}
          {internalMetric === 'wind' && (
            <>
              {/* Gusts Shaded Area */}
              {windGustAreaD && <path d={windGustAreaD} fill="url(#windGustRamp)" />}

              {/* Sustained Wind Line */}
              {windLineD && (
                <path d={windLineD} fill="none" stroke="#C4A482" strokeWidth="2.2" strokeLinecap="round" />
              )}

              <text x={4} y={padTop + 10} fill="#E5A93C" fontSize="9" fontFamily="monospace">
                PEAK GUSTS: {Math.round(maxWindKmh)} km/h
              </text>
              <text x={4} y={svgHeight - padBottom - 4} fill="#C4A482" fontSize="9" fontFamily="monospace">
                SUSTAINED (km/h)
              </text>
            </>
          )}

          {/* Synchronized Vertical Laser Line & Pin Marker */}
          {activeCursorX !== null && (
            <g>
              <line
                x1={activeCursorX}
                y1={0}
                x2={activeCursorX}
                y2={svgHeight - padBottom}
                stroke="#E5A93C"
                strokeWidth="1.5"
                strokeDasharray="4,2"
              />
              <circle
                cx={activeCursorX}
                cy={padTop + usableHeight / 2}
                r="3.5"
                fill="#E5A93C"
                stroke="#F5F2EB"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Kilometer X-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const km = (ratio * totalDist).toFixed(0);
            const x = ratio * svgWidth;
            return (
              <text
                key={ratio}
                x={x}
                y={svgHeight - 4}
                fill="#A89F91"
                fontSize="9"
                fontFamily="monospace"
                textAnchor={ratio === 0 ? "start" : ratio === 1 ? "end" : "middle"}
              >
                {km}k
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

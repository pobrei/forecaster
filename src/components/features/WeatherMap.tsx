"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Compass, 
  Mountain,
  Navigation,
  Wind
} from 'lucide-react';
import { Route, WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatCoordinates, formatDistance } from '@/lib/format';
import { MAP_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { LineString, Point } from 'ol/geom';
import { Feature } from 'ol';
import { Style, Stroke, Circle, Fill, Text, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';

export type BasemapMode = 'satellite' | 'dark' | 'mono' | 'terrain' | 'topo';

interface WeatherMapProps {
  route?: Route;
  forecasts?: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  selectedPoint?: SelectedWeatherPoint | null;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  basemapMode?: BasemapMode;
  onBasemapChange?: (mode: BasemapMode) => void;
}

// 100% Free basemap providers (No API key, token, or auth required)
const BASEMAP_SOURCES: Record<BasemapMode, { name: string; label: string; url: string; maxZoom: number; attribution: string }> = {
  satellite: {
    name: 'Satellite',
    label: 'SATELLITE',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri, Maxar',
  },
  dark: {
    name: 'Dark Slate',
    label: 'DARK',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
    attribution: '© Esri, HERE, DeLorme, MapmyIndia',
  },
  mono: {
    name: 'Monochrome B&W',
    label: 'B&W CLEAN',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
    attribution: '© Esri, HERE, Garmin',
  },
  terrain: {
    name: 'Shaded Terrain',
    label: 'TERRAIN RELIEF',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 13,
    attribution: '© Esri, USGS',
  },
  topo: {
    name: 'Mountain Topo',
    label: 'TOPO CONTOURS',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '© OpenTopoMap',
  },
};

/**
 * Generate a clean SVG Data URL for a directional wind vector arrow
 */
function createWindVectorSvg(angleDeg: number, speedMs: number): string {
  // Arrow color based on speed (m/s)
  let color = '#10b981'; // Green: calm to gentle (< 6 m/s)
  if (speedMs >= 6 && speedMs < 12) color = '#f59e0b'; // Amber: moderate (6-12 m/s)
  else if (speedMs >= 12) color = '#ef4444'; // Red: gale / severe (> 12 m/s)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <g transform="rotate(${angleDeg} 14 14)">
        <circle cx="14" cy="14" r="11" fill="#0f172a" fill-opacity="0.75" stroke="${color}" stroke-width="1.5" />
        <path d="M14 5 L18 13 L14 11 L10 13 Z" fill="${color}" />
        <line x1="14" y1="11" x2="14" y2="21" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function WeatherMap({
  route,
  forecasts,
  units = 'metric',
  className,
  selectedPoint,
  onPointSelect,
  basemapMode: externalBasemap,
  onBasemapChange,
}: WeatherMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const baseTileLayerRef = useRef<TileLayer | null>(null);
  const routeLayerRef = useRef<VectorLayer | null>(null);
  const weatherLayerRef = useRef<VectorLayer | null>(null);
  const reticleLayerRef = useRef<VectorLayer | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);

  const [internalBasemap, setInternalBasemap] = useState<BasemapMode>('satellite');
  const [localSelectedPoint, setLocalSelectedPoint] = useState<WeatherForecast | null>(null);

  const currentBasemap = externalBasemap ?? internalBasemap;

  const handleSwitchBasemap = (mode: BasemapMode) => {
    if (onBasemapChange) {
      onBasemapChange(mode);
    } else {
      setInternalBasemap(mode);
    }
  };

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapRef.current) return;

    const baseSource = new XYZ({
      url: BASEMAP_SOURCES[currentBasemap].url,
      maxZoom: BASEMAP_SOURCES[currentBasemap].maxZoom,
      crossOrigin: 'anonymous',
    });

    const baseTile = new TileLayer({
      source: baseSource,
    });
    baseTileLayerRef.current = baseTile;

    const map = new Map({
      target: mapRef.current,
      layers: [baseTile],
      view: new View({
        center: fromLonLat(MAP_CONFIG.DEFAULT_CENTER),
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
        maxZoom: 19,
      }),
      controls: defaultControls({
        zoom: false,
        attribution: true,
        attributionOptions: {
          collapsed: true,
          collapsible: true,
        },
      }),
    });

    if (popupRef.current) {
      const overlay = new Overlay({
        element: popupRef.current,
        autoPan: { animation: { duration: 250 } },
        positioning: 'bottom-center',
        stopEvent: true,
        offset: [0, -14],
      });
      map.addOverlay(overlay);
      overlayRef.current = overlay;
    }

    mapInstanceRef.current = map;

    // Hover cursor handling with RAF throttling
    let pointerMoveRaf: number | null = null;
    map.on('pointermove', (event) => {
      if (event.dragging) return;
      if (pointerMoveRaf !== null) cancelAnimationFrame(pointerMoveRaf);
      pointerMoveRaf = requestAnimationFrame(() => {
        const target = map.getTargetElement();
        if (!target) return;
        const hit = map.hasFeatureAtPixel(event.pixel);
        target.style.cursor = hit ? 'pointer' : '';
      });
    });

    // Keep OpenLayers viewport dimensions perfectly synchronized with container
    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
    });
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      if (pointerMoveRaf !== null) cancelAnimationFrame(pointerMoveRaf);
      resizeObserver.disconnect();
      map.setTarget(undefined);
    };
  }, []);

  // 2. Update Basemap Layer when mode changes
  useEffect(() => {
    if (!baseTileLayerRef.current) return;
    const config = BASEMAP_SOURCES[currentBasemap];
    baseTileLayerRef.current.setSource(
      new XYZ({
        url: config.url,
        maxZoom: config.maxZoom,
        crossOrigin: 'anonymous',
      })
    );
  }, [currentBasemap]);

  // 3. Render Route Polyline & Meteorological Points
  useEffect(() => {
    if (!mapInstanceRef.current || !route) return;
    const map = mapInstanceRef.current;

    // Remove existing layers
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (weatherLayerRef.current) {
      map.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }

    const routeCoordinates = route.points.map((p) => fromLonLat([p.lon, p.lat]));
    const routeLine = new LineString(routeCoordinates);
    const routeFeature = new Feature({ geometry: routeLine });

    // Dual-stroke route line (ambient casing + high-contrast vector stroke)
    routeFeature.setStyle([
      new Style({
        stroke: new Stroke({
          color: 'rgba(14, 165, 233, 0.35)', // Cyan ambient glow buffer
          width: 8,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: '#38bdf8', // Crisp sky cyan
          width: 3.5,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    ]);

    // Milestones (Start, Peak/Summit, Finish)
    const milestoneFeatures: Feature[] = [];
    if (route.points.length >= 2) {
      // START Marker
      const startPt = route.points[0];
      const startFeature = new Feature({
        geometry: new Point(fromLonLat([startPt.lon, startPt.lat])),
      });
      startFeature.setStyle(
        new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#10b981' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new Text({
            text: 'START',
            font: 'bold 10px monospace',
            fill: new Fill({ color: '#10b981' }),
            stroke: new Stroke({ color: '#0f172a', width: 3 }),
            offsetY: -14,
          }),
        })
      );
      milestoneFeatures.push(startFeature);

      // PEAK / SUMMIT Marker
      let peakIdx = 0;
      let maxElev = -Infinity;
      route.points.forEach((p, i) => {
        if ((p.elevation ?? 0) > maxElev) {
          maxElev = p.elevation ?? 0;
          peakIdx = i;
        }
      });

      if (maxElev > 0 && peakIdx !== 0 && peakIdx !== route.points.length - 1) {
        const peakPt = route.points[peakIdx];
        const peakFeature = new Feature({
          geometry: new Point(fromLonLat([peakPt.lon, peakPt.lat])),
        });
        peakFeature.setStyle(
          new Style({
            image: new Circle({
              radius: 6,
              fill: new Fill({ color: '#f59e0b' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 }),
            }),
            text: new Text({
              text: `▲ SUMMIT ${Math.round(maxElev)}m`,
              font: 'bold 10px monospace',
              fill: new Fill({ color: '#f59e0b' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              offsetY: -14,
            }),
          })
        );
        milestoneFeatures.push(peakFeature);
      }

      // FINISH Marker
      const finishPt = route.points[route.points.length - 1];
      const finishFeature = new Feature({
        geometry: new Point(fromLonLat([finishPt.lon, finishPt.lat])),
      });
      finishFeature.setStyle(
        new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#06b6d4' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new Text({
            text: `FINISH ${route.totalDistance.toFixed(1)}k`,
            font: 'bold 10px monospace',
            fill: new Fill({ color: '#06b6d4' }),
            stroke: new Stroke({ color: '#0f172a', width: 3 }),
            offsetY: -14,
          }),
        })
      );
      milestoneFeatures.push(finishFeature);
    }

    const routeSource = new VectorSource({
      features: [routeFeature, ...milestoneFeatures],
    });

    const routeLayer = new VectorLayer({
      source: routeSource,
      zIndex: 10,
    });
    map.addLayer(routeLayer);
    routeLayerRef.current = routeLayer;

    // Weather Fixes & Wind Vector Layer
    if (forecasts && forecasts.length > 0) {
      const weatherFeatures: Feature[] = [];

      forecasts.forEach((forecast, index) => {
        const coord = fromLonLat([forecast.routePoint.lon, forecast.routePoint.lat]);
        const pointGeom = new Point(coord);

        // Weather Fix Station Badge Feature
        const weatherFeature = new Feature({
          geometry: pointGeom,
          forecast,
          forecastIndex: index,
        });

        const temp = forecast.weather.temp;
        let tempColor = '#10b981';
        if (temp < 0) tempColor = '#38bdf8';
        else if (temp < 10) tempColor = '#06b6d4';
        else if (temp > 22) tempColor = '#f59e0b';
        else if (temp > 30) tempColor = '#ef4444';

        weatherFeature.setStyle(
          new Style({
            image: new Circle({
              radius: 7,
              fill: new Fill({ color: tempColor }),
              stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
            }),
            text: new Text({
              text: `${Math.round(temp)}°`,
              font: 'bold 11px monospace',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              offsetY: -14,
            }),
          })
        );

        // Wind Vector Barb Feature (Icon with actual wind direction & speed)
        const windFeature = new Feature({
          geometry: pointGeom,
          forecast,
          forecastIndex: index,
          isWindBarb: true,
        });

        const windIconUrl = createWindVectorSvg(
          forecast.weather.wind_deg,
          forecast.weather.wind_speed
        );

        windFeature.setStyle(
          new Style({
            image: new Icon({
              src: windIconUrl,
              scale: 0.9,
              anchor: [0.5, 0.5],
              displacement: [0, -14],
            }),
          })
        );

        weatherFeatures.push(weatherFeature, windFeature);
      });

      const weatherSource = new VectorSource({ features: weatherFeatures });
      const weatherLayer = new VectorLayer({
        source: weatherSource,
        zIndex: 20,
      });
      map.addLayer(weatherLayer);
      weatherLayerRef.current = weatherLayer;

      // Click on weather point
      map.on('click', (event) => {
        const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f);
        if (feature && feature.get('forecast')) {
          const f = feature.get('forecast') as WeatherForecast;
          const idx = feature.get('forecastIndex') as number;
          setLocalSelectedPoint(f);
          if (overlayRef.current) overlayRef.current.setPosition(event.coordinate);
          onPointSelect?.(idx, 'map');
        } else {
          setLocalSelectedPoint(null);
          if (overlayRef.current) overlayRef.current.setPosition(undefined);
        }
      });
    }

    // Fit map to route bounds with comfortable padding
    const extent = routeSource.getExtent();
    if (extent) {
      map.getView().fit(extent, {
        padding: [60, 60, 80, 60],
        maxZoom: 16,
        duration: 400,
      });
    }
  }, [route, forecasts, onPointSelect]);

  // 4. Synchronized Reticle Beacon on Map when selectedPoint changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (reticleLayerRef.current) {
      map.removeLayer(reticleLayerRef.current);
      reticleLayerRef.current = null;
    }

    if (!selectedPoint) return;

    const forecast = selectedPoint.forecast;
    const coord = fromLonLat([forecast.routePoint.lon, forecast.routePoint.lat]);

    const reticleFeature = new Feature({
      geometry: new Point(coord),
    });

    reticleFeature.setStyle([
      // Outer Target Reticle Circle
      new Style({
        image: new Circle({
          radius: 14,
          fill: new Fill({ color: 'rgba(244, 63, 94, 0.2)' }),
          stroke: new Stroke({ color: '#f43f5e', width: 2, lineDash: [4, 4] }),
        }),
      }),
      // Inner Beacon Core
      new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: '#f43f5e' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }),
    ]);

    const reticleSource = new VectorSource({ features: [reticleFeature] });
    const reticleLayer = new VectorLayer({
      source: reticleSource,
      zIndex: 30,
    });
    map.addLayer(reticleLayer);
    reticleLayerRef.current = reticleLayer;

    // If selected from chart/timeline, pan to point smoothly
    if (selectedPoint.source !== 'map') {
      map.getView().animate({
        center: coord,
        duration: 350,
      });
      setLocalSelectedPoint(forecast);
      if (overlayRef.current) overlayRef.current.setPosition(coord);
    }
  }, [selectedPoint]);

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    const view = mapInstanceRef.current.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) view.setZoom(Math.min(zoom + 1, MAP_CONFIG.MAX_ZOOM));
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    const view = mapInstanceRef.current.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) view.setZoom(Math.max(zoom - 1, MAP_CONFIG.MIN_ZOOM));
  };

  const handleResetView = () => {
    if (!mapInstanceRef.current || !route) return;
    const map = mapInstanceRef.current;
    const coords = route.points.map((p) => fromLonLat([p.lon, p.lat]));
    const line = new LineString(coords);
    map.getView().fit(line.getExtent(), {
      padding: [60, 60, 80, 60],
      maxZoom: 16,
      duration: 400,
    });
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden select-none", className)}>
      {/* Map Canvas Mount */}
      <div ref={mapRef} className="w-full h-full bg-slate-950" />

      {/* Floating Tactical Basemap Switcher (Top Left) */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl font-mono text-[10px]">
        {(['satellite', 'dark', 'mono', 'terrain', 'topo'] as BasemapMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleSwitchBasemap(mode)}
            className={cn(
              "px-2 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer",
              currentBasemap === mode
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            {BASEMAP_SOURCES[mode].label}
          </button>
        ))}
      </div>

      {/* Floating Navigation Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        {route && (
          <button
            type="button"
            onClick={handleResetView}
            title="Recenter Route"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors cursor-pointer border-t border-slate-800/80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Interactive Popup Overlay on Waypoint Click */}
      <div
        ref={popupRef}
        className={cn(
          "rounded-xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-md p-3 shadow-2xl font-mono text-xs text-slate-200 min-w-[200px] pointer-events-auto",
          !localSelectedPoint && "hidden"
        )}
      >
        {localSelectedPoint && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[11px]">
              <span className="text-cyan-400 font-bold">
                {localSelectedPoint.routePoint.distance.toFixed(1)} km
              </span>
              <span className="text-slate-400">
                ALT: {Math.round(localSelectedPoint.routePoint.elevation ?? 0)}m
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] pt-0.5">
              <div>
                <span className="text-slate-500 block uppercase">AIR TEMP</span>
                <span className="font-bold text-slate-100 text-xs">
                  {formatTemperature(localSelectedPoint.weather.temp, units)}
                </span>
              </div>
              <div>
                <span className="text-amber-400/80 block uppercase">FEELS LIKE</span>
                <span className="font-bold text-amber-300 text-xs">
                  {formatTemperature(localSelectedPoint.weather.feels_like, units)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">WIND</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {formatWindSpeed(localSelectedPoint.weather.wind_speed, units)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 block uppercase">WIND DIR</span>
                <span className="font-bold text-slate-300">
                  {Math.round(localSelectedPoint.weather.wind_deg)}°
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">PRECIP PROB</span>
                <span className="font-bold text-cyan-300">
                  {Math.round((localSelectedPoint.weather.pop ?? 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

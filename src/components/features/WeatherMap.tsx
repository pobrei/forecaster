"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  X,
  Wind,
  Droplets,
  Gauge,
  CloudRain
} from 'lucide-react';
import { Route, WeatherForecast, SelectedWeatherPoint } from '@/types';
import { 
  formatTemperature, 
  formatWindSpeed, 
  formatPressure, 
  formatPrecipitation, 
  formatWindDirection, 
  formatTime 
} from '@/lib/format';
import { MAP_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { playTactileClick } from '@/lib/audio-fx';

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
  hoveredPointIndex?: number | null;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  basemapMode?: BasemapMode;
  onBasemapChange?: (mode: BasemapMode) => void;
  isVisible?: boolean;
  activeTab?: string;
  windVectorsActive?: boolean;
  cloudsActive?: boolean;
}

// 100% Free basemap providers (No API key, token, or auth required)
const BASEMAP_SOURCES: Record<BasemapMode, { name: string; label: string; shortLabel: string; url: string; maxZoom: number; attribution: string }> = {
  satellite: {
    name: 'Satellite',
    label: 'SATELLITE',
    shortLabel: 'SAT',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri, Maxar',
  },
  dark: {
    name: 'Dark Slate',
    label: 'DARK',
    shortLabel: 'DARK',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
    attribution: '© Esri, HERE, DeLorme, MapmyIndia',
  },
  mono: {
    name: 'Monochrome B&W',
    label: 'B&W CLEAN',
    shortLabel: 'B&W',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
    attribution: '© Esri, HERE, Garmin',
  },
  terrain: {
    name: 'Shaded Terrain',
    label: 'TERRAIN RELIEF',
    shortLabel: 'RELIEF',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 13,
    attribution: '© Esri, USGS',
  },
  topo: {
    name: 'Mountain Topo',
    label: 'TOPO CONTOURS',
    shortLabel: 'TOPO',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '© OpenTopoMap',
  },
};

/**
 * Generate a clean SVG Data URL for a directional wind vector arrow
 */
function createWindVectorSvg(angleDeg: number, speedMs: number): string {
  // Arid Field Dossier arrow color based on speed (m/s)
  let color = '#82937D'; // Sage Haze: calm to gentle (< 6 m/s)
  if (speedMs >= 6 && speedMs < 12) color = '#C4A482'; // Windblown Sand: moderate (6-12 m/s)
  else if (speedMs >= 12) color = '#E5A93C'; // Phosphor Ochre: gale / severe (> 12 m/s)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <g transform="rotate(${angleDeg} 14 14)">
        <circle cx="14" cy="14" r="11" fill="#16120F" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" />
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
  hoveredPointIndex,
  onPointSelect,
  basemapMode: externalBasemap,
  onBasemapChange,
  isVisible = true,
  activeTab,
  windVectorsActive = true,
  cloudsActive = false,
}: WeatherMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const baseTileLayerRef = useRef<TileLayer | null>(null);
  const routeLayerRef = useRef<VectorLayer | null>(null);
  const weatherLayerRef = useRef<VectorLayer | null>(null);
  const windVectorLayerRef = useRef<VectorLayer | null>(null);
  const cloudVectorLayerRef = useRef<VectorLayer | null>(null);
  const reticleLayerRef = useRef<VectorLayer | null>(null);
  const hoverReticleLayerRef = useRef<VectorLayer | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);

  const [internalBasemap, setInternalBasemap] = useState<BasemapMode>('satellite');
  const [localSelectedPoint, setLocalSelectedPoint] = useState<WeatherForecast | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const windVectorsActiveRef = useRef(windVectorsActive);
  useEffect(() => {
    windVectorsActiveRef.current = windVectorsActive;
  }, [windVectorsActive]);

  const currentBasemap = externalBasemap ?? internalBasemap;
  const initialBasemapRef = useRef(currentBasemap);

  const handleSwitchBasemap = (mode: BasemapMode) => {
    if (onBasemapChange) {
      onBasemapChange(mode);
    } else {
      setInternalBasemap(mode);
    }
  };

  /**
   * Fit map viewport to the entire route bounds with responsive padding
   */
  const fitRouteToBounds = useCallback((animate = true) => {
    if (!mapInstanceRef.current || !route || !route.points || route.points.length === 0) return;
    const map = mapInstanceRef.current;
    map.updateSize();
    const size = map.getSize();
    if (!size || size[0] <= 0 || size[1] <= 0) return;

    const coords = route.points.map((p) => fromLonLat([p.lon, p.lat]));
    if (coords.length === 0) return;
    const line = new LineString(coords);
    const extent = line.getExtent();
    if (!extent || !isFinite(extent[0]) || extent[0] >= extent[2]) return;

    const isMobile = size[0] < 640;
    // On mobile: top 52px (for top HUD bar), right 16px, bottom 36px (for bottom legend), left 16px
    // On desktop: top 65px, right 40px, bottom 45px, left 40px
    const padding = isMobile ? [52, 16, 36, 16] : [65, 40, 45, 40];

    map.getView().fit(extent, {
      padding,
      maxZoom: 15,
      duration: animate ? 400 : 0,
    });
  }, [route]);

  // Effect to re-fit route whenever route or tab visibility switches to map
  useEffect(() => {
    if (isVisible || activeTab === 'map') {
      const timer = setTimeout(() => {
        fitRouteToBounds(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, activeTab, fitRouteToBounds]);

  const fitRouteToBoundsRef = useRef(fitRouteToBounds);
  useEffect(() => {
    fitRouteToBoundsRef.current = fitRouteToBounds;
  }, [fitRouteToBounds]);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapRef.current) return;

    const baseSource = new XYZ({
      url: BASEMAP_SOURCES[initialBasemapRef.current].url,
      maxZoom: BASEMAP_SOURCES[initialBasemapRef.current].maxZoom,
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
    setMapReady(true);

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
    const resizeObserver = new ResizeObserver((entries) => {
      map.updateSize();
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
          fitRouteToBoundsRef.current(false);
        }
      }
    });
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      if (pointerMoveRaf !== null) cancelAnimationFrame(pointerMoveRaf);
      resizeObserver.disconnect();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
      setMapReady(false);
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
    if (windVectorLayerRef.current) {
      map.removeLayer(windVectorLayerRef.current);
      windVectorLayerRef.current = null;
    }

    const routeCoordinates = route.points.map((p) => fromLonLat([p.lon, p.lat]));
    const routeLine = new LineString(routeCoordinates);
    const routeFeature = new Feature({ geometry: routeLine });

    // Dual-stroke route line (ambient casing + high-contrast vector stroke)
    routeFeature.setStyle([
      new Style({
        stroke: new Stroke({
          color: 'rgba(229, 169, 60, 0.35)', // Phosphor Ochre ambient glow buffer
          width: 8,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: '#E5A93C', // Phosphor Ochre main vector
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
            fill: new Fill({ color: '#82937D' }),
            stroke: new Stroke({ color: '#F5F2EB', width: 2 }),
          }),
          text: new Text({
            text: 'START',
            font: 'bold 10px monospace',
            fill: new Fill({ color: '#82937D' }),
            stroke: new Stroke({ color: '#12100E', width: 3 }),
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
              fill: new Fill({ color: '#E5A93C' }),
              stroke: new Stroke({ color: '#F5F2EB', width: 2 }),
            }),
            text: new Text({
              text: `▲ SUMMIT ${Math.round(maxElev)}m`,
              font: 'bold 10px monospace',
              fill: new Fill({ color: '#E5A93C' }),
              stroke: new Stroke({ color: '#12100E', width: 3 }),
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
            fill: new Fill({ color: '#F5F2EB' }),
            stroke: new Stroke({ color: '#453A2E', width: 2 }),
          }),
          text: new Text({
            text: `FINISH ${route.totalDistance.toFixed(1)}k`,
            font: 'bold 10px monospace',
            fill: new Fill({ color: '#F5F2EB' }),
            stroke: new Stroke({ color: '#12100E', width: 3 }),
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
      const windFeatures: Feature[] = [];

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
        let tempColor = '#82937D'; // Sage Haze
        if (temp < 0) tempColor = '#A89F91';
        else if (temp < 10) tempColor = '#C4A482';
        else if (temp > 22) tempColor = '#E5A93C';
        else if (temp > 30) tempColor = '#D4962B';

        weatherFeature.setStyle(
          new Style({
            image: new Circle({
              radius: 7,
              fill: new Fill({ color: tempColor }),
              stroke: new Stroke({ color: '#F5F2EB', width: 1.5 }),
            }),
            text: new Text({
              text: `${Math.round(temp)}°`,
              font: 'bold 11px monospace',
              fill: new Fill({ color: '#F5F2EB' }),
              stroke: new Stroke({ color: '#12100E', width: 3 }),
              offsetY: -14,
            }),
          })
        );
        weatherFeatures.push(weatherFeature);

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
        windFeatures.push(windFeature);
      });

      const weatherSource = new VectorSource({ features: weatherFeatures });
      const weatherLayer = new VectorLayer({
        source: weatherSource,
        zIndex: 20,
      });
      map.addLayer(weatherLayer);
      weatherLayerRef.current = weatherLayer;

      const windSource = new VectorSource({ features: windFeatures });
      const windLayer = new VectorLayer({
        source: windSource,
        zIndex: 22,
        visible: windVectorsActiveRef.current,
      });
      map.addLayer(windLayer);
      windVectorLayerRef.current = windLayer;

      // Click on weather point: smooth center animation and full information popup
      map.on('click', (event) => {
        let foundForecast: WeatherForecast | null = null;
        let foundIdx: number | null = null;

        map.forEachFeatureAtPixel(
          event.pixel,
          (f) => {
            if (f && f.get('forecast')) {
              foundForecast = f.get('forecast') as WeatherForecast;
              foundIdx = f.get('forecastIndex') as number;
              return true; // Prioritize weather waypoint
            }
            return false;
          },
          { hitTolerance: 16 }
        );

        if (foundForecast && foundIdx !== null) {
          const f = foundForecast as WeatherForecast;
          const pointCoord = fromLonLat([f.routePoint.lon, f.routePoint.lat]);
          setLocalSelectedPoint(f);
          if (overlayRef.current) overlayRef.current.setPosition(pointCoord);
          map.getView().animate({
            center: pointCoord,
            duration: 400,
          });
          onPointSelect?.(foundIdx, 'map');
        } else {
          setLocalSelectedPoint(null);
          if (overlayRef.current) overlayRef.current.setPosition(undefined);
        }
      });
    }

    // Fit map to route bounds
    fitRouteToBounds(true);
  }, [route, forecasts, onPointSelect, fitRouteToBounds]);

  // 4. Dynamically toggle Wind Vector barb layer visibility
  useEffect(() => {
    if (windVectorLayerRef.current) {
      windVectorLayerRef.current.setVisible(windVectorsActive);
    }
  }, [windVectorsActive]);

  // 5. Waypoint Cloud Density Meters (No full-map cloud raster overlay)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (cloudVectorLayerRef.current) {
      map.removeLayer(cloudVectorLayerRef.current);
      cloudVectorLayerRef.current = null;
    }

    if (!cloudsActive) return;

    // Route Waypoint Cloud Density Meters
    if (forecasts && forecasts.length > 0) {
      const cloudFeatures: Feature[] = [];

      forecasts.forEach((f, index) => {
        const cloudCover = Math.round(f.weather.clouds ?? 0);
        const coord = fromLonLat([f.routePoint.lon, f.routePoint.lat]);
        const cloudFeature = new Feature({
          geometry: new Point(coord),
          forecast: f,
          forecastIndex: index,
        });

        let meterColor = '#82937D'; // clear / light clouds (<25%)
        let statusLabel = 'CLR';
        if (cloudCover >= 80) {
          meterColor = '#9E978E'; // overcast
          statusLabel = 'OVC';
        } else if (cloudCover >= 50) {
          meterColor = '#C4A482'; // broken
          statusLabel = 'BKN';
        } else if (cloudCover >= 25) {
          meterColor = '#E5A93C'; // scattered
          statusLabel = 'SCT';
        }

        cloudFeature.setStyle([
          new Style({
            image: new Circle({
              radius: 14 + Math.round((cloudCover / 100) * 8),
              fill: new Fill({ color: 'rgba(22, 18, 15, 0.35)' }),
              stroke: new Stroke({ color: meterColor, width: 1.5, lineDash: [3, 3] }),
            }),
            text: new Text({
              text: `☁ ${cloudCover}% ${statusLabel}`,
              font: 'bold 9px monospace',
              fill: new Fill({ color: '#F5F2EB' }),
              backgroundFill: new Fill({ color: 'rgba(22, 18, 15, 0.92)' }),
              backgroundStroke: new Stroke({ color: meterColor, width: 1.2 }),
              padding: [2, 5, 2, 5],
              offsetY: -30,
            }),
          }),
        ]);

        cloudFeatures.push(cloudFeature);
      });

      if (cloudFeatures.length > 0) {
        const cloudVectorLayer = new VectorLayer({
          source: new VectorSource({ features: cloudFeatures }),
          zIndex: 16,
        });
        map.addLayer(cloudVectorLayer);
        cloudVectorLayerRef.current = cloudVectorLayer;
      }
    }

    return () => {
      if (cloudVectorLayerRef.current) {
        map.removeLayer(cloudVectorLayerRef.current);
        cloudVectorLayerRef.current = null;
      }
    };
  }, [cloudsActive, forecasts, mapReady]);

  // 7. Synchronized Reticle Beacon on Map when selectedPoint changes
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
          fill: new Fill({ color: 'rgba(229, 169, 60, 0.25)' }),
          stroke: new Stroke({ color: '#E5A93C', width: 2, lineDash: [4, 4] }),
        }),
      }),
      // Inner Beacon Core
      new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: '#E5A93C' }),
          stroke: new Stroke({ color: '#F5F2EB', width: 2 }),
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

    // Synchronize local popup and view center on point selection
    setLocalSelectedPoint(forecast);
    if (overlayRef.current) overlayRef.current.setPosition(coord);
    if (selectedPoint.source !== 'map') {
      map.getView().animate({
        center: coord,
        duration: 350,
      });
    }
  }, [selectedPoint]);

  // 4a. Synchronized Hover Beacon on Map during elevation scrubbing
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (hoverReticleLayerRef.current) {
      map.removeLayer(hoverReticleLayerRef.current);
      hoverReticleLayerRef.current = null;
    }

    if (hoveredPointIndex === null || hoveredPointIndex === undefined || !forecasts || !forecasts[hoveredPointIndex]) {
      return;
    }

    const forecast = forecasts[hoveredPointIndex];
    const coord = fromLonLat([forecast.routePoint.lon, forecast.routePoint.lat]);

    const hoverFeature = new Feature({
      geometry: new Point(coord),
    });

    hoverFeature.setStyle([
      new Style({
        image: new Circle({
          radius: 11,
          fill: new Fill({ color: 'rgba(229, 169, 60, 0.3)' }),
          stroke: new Stroke({ color: '#E5A93C', width: 2, lineDash: [3, 3] }),
        }),
      }),
      new Style({
        image: new Circle({
          radius: 4,
          fill: new Fill({ color: '#F5F2EB' }),
          stroke: new Stroke({ color: '#E5A93C', width: 1.5 }),
        }),
      }),
    ]);

    const hoverSource = new VectorSource({ features: [hoverFeature] });
    const hoverLayer = new VectorLayer({
      source: hoverSource,
      zIndex: 35,
    });
    map.addLayer(hoverLayer);
    hoverReticleLayerRef.current = hoverLayer;
  }, [hoveredPointIndex, forecasts]);

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
    playTactileClick();
    fitRouteToBounds(true);
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden select-none bg-[#12100E]", className)}>
      {/* Map Canvas Mount */}
      <div ref={mapRef} className="w-full h-full bg-[#12100E]" />

      {/* Floating Tactical Basemap Switcher (Top Left) */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-xl bg-[#16120F]/90 backdrop-blur-md border border-[#453A2E]/80 shadow-2xl font-mono text-[9px] sm:text-[10px] max-w-[calc(100vw-145px)] sm:max-w-none overflow-x-auto no-scrollbar">
        {(['satellite', 'dark', 'mono', 'terrain', 'topo'] as BasemapMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleSwitchBasemap(mode)}
            className={cn(
              "px-1.5 sm:px-2 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
              currentBasemap === mode
                ? "bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/60 font-bold shadow-xs"
                : "text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#251F19]"
            )}
          >
            <span className="hidden sm:inline">{BASEMAP_SOURCES[mode].label}</span>
            <span className="sm:hidden">{BASEMAP_SOURCES[mode].shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Floating Navigation Controls (Middle Right / Non-Colliding) */}
      <div className="absolute top-20 sm:top-24 right-2.5 sm:right-3 z-30 flex flex-col gap-1 p-1 rounded-xl bg-[#16120F]/90 backdrop-blur-md border border-[#453A2E]/80 shadow-2xl">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#251F19] transition-colors cursor-pointer"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#251F19] transition-colors cursor-pointer"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        {route && (
          <button
            type="button"
            onClick={handleResetView}
            title="Recenter Route"
            className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#E5A93C] hover:bg-[#251F19] transition-colors cursor-pointer border-t border-[#453A2E]/80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Interactive Comprehensive Tactical Dossier Overlay on Waypoint Click */}
      <div
        ref={popupRef}
        className={cn(
          "rounded-2xl border border-[#453A2E] bg-[#16120F]/95 backdrop-blur-xl p-3.5 sm:p-4 shadow-2xl font-mono text-xs text-[#F5F2EB] w-[300px] sm:w-[340px] max-w-[calc(100vw-32px)] pointer-events-auto select-text",
          !localSelectedPoint && "hidden"
        )}
      >
        {localSelectedPoint && (
          <div className="space-y-2.5">
            {/* Header: Distance, Elevation, Coordinates & Dismiss */}
            <div className="flex items-start justify-between border-b border-[#453A2E]/80 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#E5A93C] font-bold text-[11px]">
                    {localSelectedPoint.routePoint.distance.toFixed(1)} KM
                  </span>
                  <span className="text-[#F5F2EB] text-[11px] font-semibold">
                    ALT {Math.round(localSelectedPoint.routePoint.elevation ?? 0)}m
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-[#A89F91]">
                  <span>GPS: {localSelectedPoint.routePoint.lat.toFixed(4)}°, {localSelectedPoint.routePoint.lon.toFixed(4)}°</span>
                  {localSelectedPoint.routePoint.estimatedTime && (
                    <>
                      <span>•</span>
                      <span>ETA {formatTime(localSelectedPoint.routePoint.estimatedTime)}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocalSelectedPoint(null);
                  if (overlayRef.current) overlayRef.current.setPosition(undefined);
                }}
                title="Close Waypoint Inspector"
                className="p-1 rounded-lg text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer -mr-1 -mt-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Condition Banner */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#251F19]/60 border border-[#453A2E]/50 text-[11px]">
              <span className="text-[#E5A93C] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span>{localSelectedPoint.weather.weather?.[0]?.description || 'METEOROLOGICAL FIX'}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#F5F2EB] font-bold text-sm">
                  {formatTemperature(localSelectedPoint.weather.temp, units)}
                </span>
                <span className="text-[#A89F91] text-[10px]">
                  (FEELS {formatTemperature(localSelectedPoint.weather.feels_like, units)})
                </span>
              </div>
            </div>

            {/* Tactical Weather Matrix (4-Card Primary Grid) */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {/* Wind & Gusts */}
              <div className="p-2 rounded-xl bg-[#1C1713] border border-[#453A2E]/60 space-y-1">
                <div className="flex items-center justify-between text-[#A89F91] text-[9px] uppercase">
                  <span className="flex items-center gap-1"><Wind className="h-3 w-3 text-[#82937D]" /> WIND</span>
                  <span className="text-[#82937D] font-bold">
                    {formatWindDirection(localSelectedPoint.weather.wind_deg)} ({Math.round(localSelectedPoint.weather.wind_deg)}°)
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-[#F5F2EB] text-xs">
                    {formatWindSpeed(localSelectedPoint.weather.wind_speed, units)}
                  </span>
                  {localSelectedPoint.weather.wind_gust && (
                    <span className="text-[#E5A93C] text-[9px]">
                      GUST {formatWindSpeed(localSelectedPoint.weather.wind_gust, units)}
                    </span>
                  )}
                </div>
              </div>

              {/* Precipitation */}
              <div className="p-2 rounded-xl bg-[#1C1713] border border-[#453A2E]/60 space-y-1">
                <div className="flex items-center justify-between text-[#A89F91] text-[9px] uppercase">
                  <span className="flex items-center gap-1"><CloudRain className="h-3 w-3 text-[#E5A93C]" /> PRECIP</span>
                  <span className="font-bold text-[#E5A93C]">
                    {Math.round((localSelectedPoint.weather.pop ?? 0) * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-[10px]">
                  <span className="text-[#F5F2EB]">
                    {localSelectedPoint.weather.rain?.['1h'] 
                      ? `${formatPrecipitation(localSelectedPoint.weather.rain['1h'], units)}/h` 
                      : (localSelectedPoint.weather.snow?.['1h'] 
                        ? `${formatPrecipitation(localSelectedPoint.weather.snow['1h'], units)}/h snow` 
                        : '0.0 mm/h')}
                  </span>
                </div>
              </div>

              {/* Cloud Density & Barometric Pressure */}
              <div className="p-2 rounded-xl bg-[#1C1713] border border-[#453A2E]/60 space-y-1">
                <div className="flex items-center justify-between text-[#A89F91] text-[9px] uppercase">
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3 text-[#C4A482]" /> PRESSURE</span>
                </div>
                <div className="flex items-baseline justify-between text-[10px]">
                  <span className="font-bold text-[#F5F2EB]">
                    {formatPressure(localSelectedPoint.weather.pressure, units)}
                  </span>
                  <span className="text-[#C4A482] text-[9px]">
                    ☁ {Math.round(localSelectedPoint.weather.clouds ?? 0)}%
                  </span>
                </div>
              </div>

              {/* Humidity, Dew Point & UV */}
              <div className="p-2 rounded-xl bg-[#1C1713] border border-[#453A2E]/60 space-y-1">
                <div className="flex items-center justify-between text-[#A89F91] text-[9px] uppercase">
                  <span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-[#82937D]" /> HUMIDITY</span>
                  <span className="font-bold text-[#F5F2EB]">{Math.round(localSelectedPoint.weather.humidity ?? 0)}%</span>
                </div>
                <div className="flex items-baseline justify-between text-[9px] text-[#A89F91]">
                  <span>DEW: {formatTemperature(localSelectedPoint.weather.dew_point ?? localSelectedPoint.weather.temp, units)}</span>
                  {localSelectedPoint.weather.uvi !== undefined && (
                    <span className="text-[#E5A93C]">UV {Math.round(localSelectedPoint.weather.uvi)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts if present */}
            {localSelectedPoint.alerts && localSelectedPoint.alerts.length > 0 && (
              <div className="p-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 text-[10px] space-y-0.5">
                <span className="text-[#EF4444] font-bold block uppercase">
                  ⚠ {localSelectedPoint.alerts[0].title}
                </span>
                <span className="text-[#F5F2EB]/90 block text-[9px]">
                  {localSelectedPoint.alerts[0].description}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tactical Active Overlay Status Indicator (Bottom-Right) */}
      {(cloudsActive || !windVectorsActive) && (
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-30 pointer-events-none flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] bg-[#16120F]/90 backdrop-blur-md px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-[#453A2E]/80 shadow-2xl">
          {cloudsActive && (
            <span className="flex items-center gap-1.5 text-[#C4A482] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C4A482]" />
              <span>CLOUDS ON</span>
            </span>
          )}
          {cloudsActive && !windVectorsActive && <span className="text-[#453A2E]">•</span>}
          {!windVectorsActive && (
            <span className="flex items-center gap-1.5 text-[#A89F91]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A89F91]" />
              <span>VECTORS OFF</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

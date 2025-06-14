"use client";

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Route, WeatherForecast, SelectedWeatherPoint } from '@/types';
import { formatTemperature, formatWindSpeed, formatCoordinates, formatWindDirection, getWindDirectionRotation, formatDistance } from '@/lib/format';
import { MAP_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { LineString, Point } from 'ol/geom';
import { Feature } from 'ol';
import { Style, Stroke, Circle, Fill, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';

interface WeatherMapProps {
  route?: Route;
  forecasts?: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  selectedPoint?: SelectedWeatherPoint | null;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
}

export function WeatherMap({
  route,
  forecasts,
  units = 'metric',
  className,
  selectedPoint,
  onPointSelect
}: WeatherMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const routeLayerRef = useRef<VectorLayer | null>(null);
  const weatherLayerRef = useRef<VectorLayer | null>(null);
  const [localSelectedPoint, setLocalSelectedPoint] = useState<WeatherForecast | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Create map instance
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat(MAP_CONFIG.DEFAULT_CENTER),
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
      }),
      controls: defaultControls({
        zoom: false,
        attribution: true,
        attributionOptions: {
          collapsed: true,
          collapsible: true,
        }
      }),
    });

    // Create popup overlay
    if (popupRef.current) {
      const overlay = new Overlay({
        element: popupRef.current,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
      });
      map.addOverlay(overlay);
      overlayRef.current = overlay;
    }

    mapInstanceRef.current = map;

    // Handle map clicks
    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature && feature.get('forecast')) {
        const forecast = feature.get('forecast') as WeatherForecast;
        const forecastIndex = feature.get('forecastIndex') as number;
        setLocalSelectedPoint(forecast);
        onPointSelect?.(forecastIndex, 'map');
        if (overlayRef.current) {
          overlayRef.current.setPosition(event.coordinate);
        }
      } else {
        setLocalSelectedPoint(null);
        if (overlayRef.current) {
          overlayRef.current.setPosition(undefined);
        }
      }
    });

    // Change cursor on hover
    map.on('pointermove', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [onPointSelect]);

  useEffect(() => {
    if (!mapInstanceRef.current || !route) return;

    const map = mapInstanceRef.current;
    
    // Remove existing route and weather layers if they exist
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (weatherLayerRef.current) {
      map.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }

    // Create route line
    const routeCoordinates = route.points.map(point => fromLonLat([point.lon, point.lat]));
    const routeLine = new LineString(routeCoordinates);
    
    const routeFeature = new Feature({
      geometry: routeLine,
    });

    routeFeature.setStyle(new Style({
      stroke: new Stroke({
        color: '#3b82f6',
        width: 3,
      }),
    }));

    const routeSource = new VectorSource({
      features: [routeFeature],
    });

    const routeLayer = new VectorLayer({
      source: routeSource,
    });

    map.addLayer(routeLayer);
    routeLayerRef.current = routeLayer;

    // Add weather points if forecasts are available
    if (forecasts && forecasts.length > 0) {
      const weatherFeatures: Feature[] = [];

      forecasts.forEach((forecast, index) => {
        const point = new Point(fromLonLat([forecast.routePoint.lon, forecast.routePoint.lat]));

        // Main weather point feature
        const weatherFeature = new Feature({
          geometry: point,
          forecast: forecast,
          forecastIndex: index,
        });

        // Color based on temperature
        const temp = forecast.weather.temp;
        let color = '#10b981'; // Default green
        if (temp < 0) color = '#3b82f6'; // Blue for cold
        else if (temp < 10) color = '#06b6d4'; // Cyan for cool
        else if (temp > 25) color = '#f59e0b'; // Orange for warm
        else if (temp > 35) color = '#ef4444'; // Red for hot

        // Add alert indicator
        const hasAlerts = forecast.alerts && forecast.alerts.length > 0;
        const strokeColor = hasAlerts ? '#ef4444' : color;
        const strokeWidth = hasAlerts ? 3 : 2;

        weatherFeature.setStyle(new Style({
          image: new Circle({
            radius: 8,
            fill: new Fill({
              color: color,
            }),
            stroke: new Stroke({
              color: strokeColor,
              width: strokeWidth,
            }),
          }),
          text: new Text({
            text: `${Math.round(temp)}°`,
            font: '12px sans-serif',
            fill: new Fill({
              color: '#ffffff',
            }),
            stroke: new Stroke({
              color: '#000000',
              width: 2,
            }),
            offsetY: -20,
          }),
        }));

        // Wind direction arrow feature - using simple character that won't render as emoji
        const windFeature = new Feature({
          geometry: point,
          forecast: forecast,
          forecastIndex: index,
          isWindArrow: true,
        });

        // Use a pointy arrow character that shows clear direction
        const rotation = getWindDirectionRotation(forecast.weather.wind_deg);
        windFeature.setStyle(new Style({
          text: new Text({
            text: '^', // Simple caret character that shows clear direction
            font: 'bold 16px sans-serif',
            fill: new Fill({
              color: '#1f2937',
            }),
            stroke: new Stroke({
              color: '#ffffff',
              width: 2,
            }),
            offsetX: 15,
            offsetY: 5,
            rotation: (rotation * Math.PI) / 180, // Convert degrees to radians
          }),
        }));

        weatherFeatures.push(weatherFeature, windFeature);
      });

      const weatherSource = new VectorSource({
        features: weatherFeatures,
      });

      const weatherLayer = new VectorLayer({
        source: weatherSource,
      });

      map.addLayer(weatherLayer);
      weatherLayerRef.current = weatherLayer;

      // Add click handler for weather points
      map.on('click', (event) => {
        const features = map.getFeaturesAtPixel(event.pixel);
        if (features && features.length > 0) {
          // Find the first weather feature (prioritize main weather points over wind arrows)
          const weatherFeature = features.find(f => f.get('forecast') && !f.get('isWindArrow')) || features[0];
          if (weatherFeature && weatherFeature.get('forecast')) {
            const forecast = weatherFeature.get('forecast') as WeatherForecast;
            const index = weatherFeature.get('forecastIndex') as number;

            setLocalSelectedPoint(forecast);
            if (overlayRef.current) {
              overlayRef.current.setPosition(event.coordinate);
            }

            if (onPointSelect) {
              onPointSelect(index, 'map');
            }
          }
        } else {
          // Clicked on empty area, hide popup
          setLocalSelectedPoint(null);
          if (overlayRef.current) {
            overlayRef.current.setPosition(undefined);
          }
        }
      });
    }

    // Fit map to route
    const extent = routeSource.getExtent();
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: 16,
    });
  }, [route, forecasts]);

  // Handle external point selection (from timeline or charts)
  useEffect(() => {
    if (selectedPoint && selectedPoint.source !== 'map' && mapInstanceRef.current && overlayRef.current) {
      const forecast = selectedPoint.forecast;
      const coordinate = fromLonLat([forecast.routePoint.lon, forecast.routePoint.lat]);

      // Center map on selected point without changing zoom too much
      const currentZoom = mapInstanceRef.current.getView().getZoom() || 12;
      mapInstanceRef.current.getView().animate({
        center: coordinate,
        duration: 500,
        zoom: Math.max(currentZoom, 10) // Don't zoom in too much
      });

      // Update popup
      setLocalSelectedPoint(forecast);
      overlayRef.current.setPosition(coordinate);
    }
  }, [selectedPoint]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const view = mapInstanceRef.current.getView();
      const zoom = view.getZoom();
      if (zoom !== undefined) {
        view.setZoom(Math.min(zoom + 1, MAP_CONFIG.MAX_ZOOM));
      }
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const view = mapInstanceRef.current.getView();
      const zoom = view.getZoom();
      if (zoom !== undefined) {
        view.setZoom(Math.max(zoom - 1, MAP_CONFIG.MIN_ZOOM));
      }
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current && route) {
      const map = mapInstanceRef.current;
      const routeCoordinates = route.points.map(point => fromLonLat([point.lon, point.lat]));
      const routeLine = new LineString(routeCoordinates);
      const extent = routeLine.getExtent();
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 16,
        duration: 500,
      });
    }
  };

  const getWeatherIcon = (weather: { weather: Array<{ main: string }> }) => {
    const main = weather.weather[0]?.main.toLowerCase();
    switch (main) {
      case 'clear': return '☀️';
      case 'clouds': return '☁️';
      case 'rain': return '🌧️';
      case 'snow': return '❄️';
      case 'thunderstorm': return '⛈️';
      case 'drizzle': return '🌦️';
      case 'mist':
      case 'fog': return '🌫️';
      default: return '🌤️';
    }
  };

  return (
    <Card className={className} id="weather-map">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Interactive Map
        </CardTitle>
        <CardDescription>
          {route
            ? `Route visualization with ${forecasts?.length || 0} weather points`
            : 'Upload a GPX file to see your route on the map'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Map Container */}
          <div
            ref={mapRef}
            className="w-full h-96 rounded-lg border bg-muted"
            style={{ minHeight: '400px' }}
          />

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            {route && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetView}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Legend */}
          {forecasts && forecasts.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs">
              <div className="font-semibold mb-2">Weather Points</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Cold (&lt; 0°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span>Cool (0-10°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Mild (10-25°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Warm (25-35°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Hot (&gt; 35°C)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-transparent"></div>
                  <span>Weather Alert</span>
                </div>
                <div className="flex items-center gap-2 border-t pt-1 mt-1">
                  <div className="inline-block w-4 h-4 relative">
                    {/* CSS arrow pointing down - more pointy design */}
                    <div className="w-0.5 h-2.5 bg-current absolute left-1/2 top-1 transform -translate-x-1/2" />
                    <div
                      className="absolute top-0 left-1/2 transform -translate-x-1/2"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderBottom: '6px solid currentColor',
                      }}
                    />
                  </div>
                  <span>Wind direction</span>
                </div>
              </div>
            </div>
          )}

          {/* Popup */}
          <div
            ref={popupRef}
            className={cn(
              "absolute bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl p-4 text-sm pointer-events-none z-50 transition-all duration-200",
              "before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2",
              "before:border-l-[8px] before:border-r-[8px] before:border-t-[8px]",
              "before:border-l-transparent before:border-r-transparent before:border-t-background/95",
              "before:filter before:drop-shadow-sm",
              localSelectedPoint ? "block opacity-100 scale-100" : "hidden opacity-0 scale-95"
            )}
            style={{ transform: 'translate(-50%, -100%)', marginTop: '-12px' }}
          >
            {localSelectedPoint && (
              <div className="space-y-3 min-w-52">
                {/* Header with weather icon and condition */}
                <div className="flex items-center gap-3 pb-2 border-b border-border/30">
                  <span className="text-2xl">{getWeatherIcon(localSelectedPoint.weather)}</span>
                  <div>
                    <div className="font-semibold text-foreground capitalize">
                      {localSelectedPoint.weather.weather[0]?.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistance(localSelectedPoint.routePoint.distance, units)} from start
                    </div>
                  </div>
                </div>

                {/* Weather data grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-muted-foreground font-medium">Temperature</div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatTemperature(localSelectedPoint.weather.temp, units)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Feels {formatTemperature(localSelectedPoint.weather.feels_like, units)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground font-medium">Wind</div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatWindSpeed(localSelectedPoint.weather.wind_speed, units)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <div
                        className="inline-block w-4 h-4 relative"
                        style={{
                          transform: `rotate(${getWindDirectionRotation(localSelectedPoint.weather.wind_deg)}deg)`,
                        }}
                      >
                        {/* CSS arrow - more pointy design */}
                        <div className="w-0.5 h-2.5 bg-current absolute left-1/2 top-1 transform -translate-x-1/2" />
                        <div
                          className="absolute top-0 left-1/2 transform -translate-x-1/2"
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: '4px solid transparent',
                            borderRight: '4px solid transparent',
                            borderBottom: '6px solid currentColor',
                          }}
                        />
                      </div>
                      <span>{formatWindDirection(localSelectedPoint.weather.wind_deg)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground font-medium">Humidity</div>
                    <div className="text-sm font-semibold text-foreground">
                      {localSelectedPoint.weather.humidity}%
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-muted-foreground font-medium">Pressure</div>
                    <div className="text-sm font-semibold text-foreground">
                      {localSelectedPoint.weather.pressure} hPa
                    </div>
                  </div>
                </div>

                {/* Weather alerts */}
                {localSelectedPoint.alerts && localSelectedPoint.alerts.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2">
                    <div className="text-red-700 dark:text-red-400 font-medium text-xs flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{localSelectedPoint.alerts.length} Weather Alert{localSelectedPoint.alerts.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}

                {/* Coordinates footer */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border/30 font-mono">
                  {formatCoordinates(localSelectedPoint.routePoint.lat, localSelectedPoint.routePoint.lon)}
                </div>
              </div>
            )}
          </div>

          {/* No Route Message */}
          {!route && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No route loaded</p>
                <p className="text-sm">Upload a GPX file to see your route</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

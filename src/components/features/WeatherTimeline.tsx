"use client";

import { useRef, useEffect } from 'react';
import { Clock, Wind, Droplets, Thermometer } from 'lucide-react';
import { WeatherForecast, SelectedWeatherPoint } from '@/types';
import { 
  formatTemperature, 
  formatWindSpeed, 
  formatTime, 
  formatDistance,
  calculateBearing,
  getRelativeWind,
} from '@/lib/format';
import { cn } from '@/lib/utils';

interface WeatherTimelineProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
  onPointSelect?: (forecastIndex: number, source: 'timeline' | 'chart' | 'map') => void;
  selectedPoint?: SelectedWeatherPoint | null;
}

export function WeatherTimeline({
  forecasts,
  units = 'metric',
  className,
  onPointSelect,
  selectedPoint
}: WeatherTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to show some items
    if (scrollRef.current && forecasts.length > 0) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [forecasts]);

  if (!forecasts || forecasts.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-6 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)}>
        <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#F5F2EB]">
          <Clock className="h-4 w-4 text-[#E5A93C]" />
          <span>WEATHER TIMELINE</span>
        </div>
        <p className="text-[#A89F91] text-xs mb-6">
          Timeline view of atmospheric conditions along expedition track
        </p>
        <div className="flex items-center justify-center h-28 text-[#A89F91] border border-dashed border-[#453A2E] rounded-xl">
          <div className="text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 opacity-40 text-[#E5A93C]" />
            <p className="text-xs">NO SYNTHESIZED TIMELINE FIXES</p>
            <p className="text-[10px] text-[#A89F91]/70">Arm route and generate forecast to inspect intervals</p>
          </div>
        </div>
      </div>
    );
  }

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

  const getTemperatureColor = (temp: number) => {
    if (temp < 0) return 'text-[#82937D]';
    if (temp < 10) return 'text-[#A89F91]';
    if (temp > 25) return 'text-[#E5A93C]';
    if (temp > 35) return 'text-[#ff7b54]';
    return 'text-[#F5F2EB]';
  };

  const totalAlerts = forecasts.reduce((sum, forecast) => sum + (forecast.alerts?.length || 0), 0);

  return (
    <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-5 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)}>
      <div className="flex items-center justify-between mb-4 border-b border-[#453A2E]/70 pb-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm tracking-wider text-[#F5F2EB]">
            <Clock className="h-4 w-4 text-[#E5A93C]" />
            <span>EXPEDITION TIMELINE</span>
            {totalAlerts > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#E5A93C]/20 border border-[#E5A93C]/50 text-[#E5A93C] text-[10px] font-bold">
                {totalAlerts} ALERT{totalAlerts > 1 ? 'S' : ''}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A89F91] mt-1">
            Horizontal chronologic scroll along {formatDistance(forecasts[forecasts.length - 1]?.routePoint.distance || 0, units)} route
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar"
      >
        {forecasts.map((forecast, index) => {
          const hasAlerts = forecast.alerts && forecast.alerts.length > 0;
          const isSelected = selectedPoint?.forecastIndex === index;

          const prevPt = forecasts[Math.max(0, index - 1)].routePoint;
          const nextPt = forecasts[Math.min(forecasts.length - 1, index + 1)].routePoint;
          const heading = calculateBearing(prevPt, nextPt);
          const relWind = getRelativeWind(heading, forecast.weather.wind_speed, forecast.weather.wind_deg);

          return (
            <div
              key={index}
              className={cn(
                "shrink-0 w-48 p-3 rounded-xl border transition-all cursor-pointer bg-[#1C1814] hover:bg-[#251F19]",
                isSelected
                  ? "border-[#E5A93C] ring-2 ring-[#E5A93C]/40 shadow-[0_0_15px_rgba(229,169,60,0.2)]"
                  : hasAlerts
                  ? "border-[#E5A93C]/60"
                  : "border-[#453A2E]"
              )}
              onClick={() => onPointSelect?.(index, 'timeline')}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#453A2E]/60 text-[11px]">
                <span className="font-bold text-[#E5A93C]">
                  {formatDistance(forecast.routePoint.distance, units)}
                </span>
                {forecast.routePoint.estimatedTime && (
                  <span className="text-[#A89F91] text-[10px]">
                    {formatTime(forecast.routePoint.estimatedTime)}
                  </span>
                )}
              </div>

              {/* Weather Icon and Condition */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xl">{getWeatherIcon(forecast.weather)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#F5F2EB] capitalize truncate">
                    {forecast.weather.weather[0]?.description}
                  </div>
                </div>
              </div>

              {/* Temperature */}
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-[#A89F91]" />
                  <span className={cn("font-bold", getTemperatureColor(forecast.weather.temp))}>
                    {formatTemperature(forecast.weather.temp, units)}
                  </span>
                </div>
                <span className="text-[10px] text-[#E5A93C]/90 font-mono">
                  FEELS {formatTemperature(forecast.weather.feels_like, units)}
                </span>
              </div>

              {/* Wind */}
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-[#82937D]" />
                  <span className="text-[#82937D] font-bold">
                    {formatWindSpeed(forecast.weather.wind_speed, units)}
                  </span>
                </div>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                  relWind.type === 'Headwind' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                  relWind.type === 'Tailwind' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  "bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/30"
                )}>
                  {relWind.type}
                </span>
              </div>

              {/* Precipitation */}
              {(forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) && (
                <div className="flex items-center gap-1.5 mb-1.5 text-xs text-[#82937D]">
                  <Droplets className="h-3.5 w-3.5" />
                  <span>
                    {forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']}mm/h
                  </span>
                </div>
              )}

              {/* Atmospheric Details */}
              <div className="grid grid-cols-2 gap-1 text-[10px] text-[#A89F91] pt-1.5 border-t border-[#453A2E]/60">
                <div>
                  <span className="block text-[9px] uppercase text-[#A89F91]/70">HUMID</span>
                  <span className="text-[#F5F2EB] font-bold">{forecast.weather.humidity}%</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase text-[#A89F91]/70">CLOUD</span>
                  <span className="text-[#F5F2EB] font-bold">{forecast.weather.clouds}%</span>
                </div>
              </div>

              {/* Elevation */}
              {forecast.routePoint.elevation !== undefined && (
                <div className="text-[10px] text-[#A89F91] mt-1.5 pt-1.5 border-t border-[#453A2E]/60 flex justify-between">
                  <span className="text-[9px] uppercase text-[#A89F91]/70">ALTITUDE</span>
                  <span className="text-[#F5F2EB] font-mono">{Math.round(forecast.routePoint.elevation)}m</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Hint */}
      {forecasts.length > 3 && (
        <div className="text-[10px] text-[#A89F91] text-center mt-2">
          ← HORIZONTALLY SCROLL THROUGH {forecasts.length} TRACK WAYPOINTS →
        </div>
      )}
    </div>
  );
}

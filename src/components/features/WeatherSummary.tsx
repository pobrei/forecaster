"use client";

import React from 'react';
import {
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  AlertTriangle,
  Eye,
  BarChart3
} from 'lucide-react';
import { WeatherForecast, WeatherSummaryStats } from '@/types';
import { 
  formatTemperature, 
  formatWindSpeed, 
  formatPrecipitation, 
  formatPressure,
  formatPercentage,
  formatDistance,
  calculateBearing,
  getRelativeWind,
} from '@/lib/format';
import { cn } from '@/lib/utils';

interface WeatherSummaryProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
}

function calculateWeatherStats(forecasts: WeatherForecast[]): WeatherSummaryStats {
  if (forecasts.length === 0) {
    return {
      temperature: { min: 0, max: 0, avg: 0, range: 0 },
      wind: { min: 0, max: 0, avg: 0 },
      precipitation: { total: 0, maxHourly: 0, rainyPoints: 0, totalPoints: 0 },
      atmospheric: {
        humidity: { min: 0, max: 0, avg: 0 },
        pressure: { min: 0, max: 0, avg: 0 },
        visibility: { min: 0, max: 0, avg: 0 }
      },
      alerts: { total: 0, bySeverity: {}, byType: {} }
    };
  }

  const temps = forecasts.map(f => f.weather.temp);
  const winds = forecasts.map(f => f.weather.wind_speed);
  const humidities = forecasts.map(f => f.weather.humidity);
  const pressures = forecasts.map(f => f.weather.pressure);
  const visibilities = forecasts.map(f => f.weather.visibility || 10000);
  const precipitations = forecasts.map(f => 
    (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0)
  );

  const allAlerts = forecasts.flatMap(f => f.alerts || []);
  const alertsBySeverity: Record<string, number> = {};
  const alertsByType: Record<string, number> = {};

  allAlerts.forEach(alert => {
    alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
  });

  return {
    temperature: {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((sum, t) => sum + t, 0) / temps.length,
      range: Math.max(...temps) - Math.min(...temps)
    },
    wind: {
      min: Math.min(...winds),
      max: Math.max(...winds),
      avg: winds.reduce((sum, w) => sum + w, 0) / winds.length,
      maxGust: Math.max(...forecasts.map(f => f.weather.wind_gust || 0))
    },
    precipitation: {
      total: precipitations.reduce((sum, p) => sum + p, 0),
      maxHourly: Math.max(...precipitations),
      rainyPoints: precipitations.filter(p => p > 0).length,
      totalPoints: forecasts.length
    },
    atmospheric: {
      humidity: {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((sum, h) => sum + h, 0) / humidities.length
      },
      pressure: {
        min: Math.min(...pressures),
        max: Math.max(...pressures),
        avg: pressures.reduce((sum, p) => sum + p, 0) / pressures.length
      },
      visibility: {
        min: Math.min(...visibilities),
        max: Math.max(...visibilities),
        avg: visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length
      }
    },
    alerts: {
      total: allAlerts.length,
      bySeverity: alertsBySeverity,
      byType: alertsByType
    }
  };
}


export function WeatherSummary({ forecasts, units = 'metric', className }: WeatherSummaryProps) {
  const windProfile = React.useMemo(() => {
    if (!forecasts || forecasts.length < 2) return null;
    let headwindCount = 0;
    let tailwindCount = 0;

    forecasts.forEach((f, idx) => {
      const prev = forecasts[Math.max(0, idx - 1)].routePoint;
      const next = forecasts[Math.min(forecasts.length - 1, idx + 1)].routePoint;
      const heading = calculateBearing(prev, next);
      const rel = getRelativeWind(heading, f.weather.wind_speed, f.weather.wind_deg);
      if (rel.type === 'Headwind') headwindCount++;
      else if (rel.type === 'Tailwind') tailwindCount++;
    });

    const total = forecasts.length;
    const headwindPct = Math.round((headwindCount / total) * 100);
    const tailwindPct = Math.round((tailwindCount / total) * 100);
    const crosswindPct = Math.max(0, 100 - headwindPct - tailwindPct);

    return {
      headwindPct,
      tailwindPct,
      crosswindPct,
    };
  }, [forecasts]);

  if (!forecasts || forecasts.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-6 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)}>
        <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#F5F2EB]">
          <BarChart3 className="h-4 w-4 text-[#E5A93C]" />
          <span>EXPEDITION WEATHER SUMMARY</span>
        </div>
        <p className="text-[#A89F91] text-xs mb-6">
          Atmospheric synthesis will appear here after generating forecasts
        </p>
        <div className="flex items-center justify-center h-28 text-[#A89F91] border border-dashed border-[#453A2E] rounded-xl">
          <div className="text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 opacity-40 text-[#E5A93C]" />
            <p className="text-xs">NO SUMMARY TELEMETRY AVAILABLE</p>
            <p className="text-[10px] text-[#A89F91]/70">Arm route and generate forecast</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateWeatherStats(forecasts);
  const routeDistance = forecasts[forecasts.length - 1]?.routePoint.distance || 0;

  return (
    <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-5 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)}>
      <div className="flex items-center justify-between mb-4 border-b border-[#453A2E]/70 pb-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm tracking-wider text-[#F5F2EB]">
            <BarChart3 className="h-4 w-4 text-[#E5A93C]" />
            <span>EXPEDITION WEATHER SYNTHESIS</span>
          </div>
          <p className="text-[11px] text-[#A89F91] mt-1">
            Aggregated metrics along your {formatDistance(routeDistance, units)} route
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperature Summary */}
        <div className="p-3.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/70 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E5A93C] uppercase">
            <Thermometer className="h-4 w-4" />
            Temperature
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Range:</span>
              <span className="font-bold text-[#F5F2EB]">
                {formatTemperature(stats.temperature.min, units)} - {formatTemperature(stats.temperature.max, units)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Average:</span>
              <span className="font-bold text-[#E5A93C]">
                {formatTemperature(stats.temperature.avg, units)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Variation:</span>
              <span className="font-bold text-[#82937D]">
                {stats.temperature.range.toFixed(1)}°
              </span>
            </div>
          </div>
        </div>

        {/* Wind Summary */}
        <div className="p-3.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/70 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#82937D] uppercase">
            <Wind className="h-4 w-4" />
            Wind Profile
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Range:</span>
              <span className="font-bold text-[#F5F2EB]">
                {formatWindSpeed(stats.wind.min, units)} - {formatWindSpeed(stats.wind.max, units)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Average:</span>
              <span className="font-bold text-[#82937D]">
                {formatWindSpeed(stats.wind.avg, units)}
              </span>
            </div>
            {stats.wind.maxGust && stats.wind.maxGust > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#A89F91]">Max Gust:</span>
                <span className="font-bold text-[#E5A93C]">
                  {formatWindSpeed(stats.wind.maxGust, units)}
                </span>
              </div>
            )}
            {windProfile && (
              <div className="flex items-center justify-between pt-1 border-t border-[#453A2E]/50 text-[10px]">
                <span className="text-[#A89F91]">Regime:</span>
                <span className="font-semibold text-[#F5F2EB] flex items-center gap-1.5">
                  <span className="text-rose-400">{windProfile.headwindPct}% Head</span>
                  <span className="text-[#453A2E]">•</span>
                  <span className="text-emerald-400">{windProfile.tailwindPct}% Tail</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Precipitation Summary */}
        <div className="p-3.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/70 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#82937D] uppercase">
            <Droplets className="h-4 w-4" />
            Precipitation
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Total:</span>
              <span className="font-bold text-[#82937D]">
                {formatPrecipitation(stats.precipitation.total, units)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Max/hour:</span>
              <span className="font-bold text-[#E5A93C]">
                {formatPrecipitation(stats.precipitation.maxHourly, units)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A89F91]">Rainy points:</span>
              <span className="font-bold text-[#F5F2EB]">
                {stats.precipitation.rainyPoints}/{stats.precipitation.totalPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts Summary */}
        <div className="p-3.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/70 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E5A93C] uppercase">
            <AlertTriangle className="h-4 w-4" />
            Expedition Alerts
          </div>
          {stats.alerts.total > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#A89F91]">Total:</span>
                <span className="font-bold text-[#E5A93C]">{stats.alerts.total}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats.alerts.bySeverity).map(([severity, count]) => (
                  <span 
                    key={severity} 
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5A93C]/20 border border-[#E5A93C]/50 text-[#E5A93C] font-bold"
                  >
                    {severity}: {count}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#82937D] py-2 flex items-center gap-1.5">
              <span>✓ All track segments nominal</span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#453A2E]/70 text-xs">
        <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-[#A89F91] uppercase mb-0.5">
            <Gauge className="h-3 w-3 text-[#A89F91]" />
            Humidity Range
          </div>
          <div className="font-bold text-[#F5F2EB]">
            {formatPercentage(stats.atmospheric.humidity.min)} - {formatPercentage(stats.atmospheric.humidity.max)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-[#A89F91] uppercase mb-0.5">
            <Gauge className="h-3 w-3 text-[#E5A93C]" />
            Pressure Range
          </div>
          <div className="font-bold text-[#E5A93C]">
            {formatPressure(stats.atmospheric.pressure.min, units)} - {formatPressure(stats.atmospheric.pressure.max, units)}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#1C1814] border border-[#453A2E]/60 text-center col-span-2 md:col-span-1">
          <div className="flex items-center justify-center gap-1 text-[10px] text-[#A89F91] uppercase mb-0.5">
            <Eye className="h-3 w-3 text-[#82937D]" />
            Visibility Range
          </div>
          <div className="font-bold text-[#82937D]">
            {(stats.atmospheric.visibility.min / 1000).toFixed(1)}km - {(stats.atmospheric.visibility.max / 1000).toFixed(1)}km
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, ChevronUp, Thermometer, Droplets, Wind, Gauge, Cloud,
  AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MultiSourceWeatherForecast,
  SourcedWeatherData,
  WeatherProviderId,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';
import { formatTemperature, formatWindSpeed, formatPercentage } from '@/lib/format';

interface WeatherComparisonViewProps {
  forecast: MultiSourceWeatherForecast;
  units?: 'metric' | 'imperial';
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

function SourceDataRow({
  source,
  units,
  isPrimary,
}: {
  source: SourcedWeatherData;
  units: 'metric' | 'imperial';
  isPrimary: boolean;
}) {
  const config = WEATHER_PROVIDERS[source.source];
  
  return (
    <div
      className={cn(
        "grid grid-cols-6 gap-3 py-2 px-3 rounded-lg text-sm",
        isPrimary ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="font-medium truncate">{config.name}</span>
        {isPrimary && <Badge variant="outline" className="text-xs">Primary</Badge>}
      </div>
      <div className="flex items-center gap-1">
        <Thermometer className="h-3 w-3 text-red-500" />
        <span>{formatTemperature(source.temp, units)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Droplets className="h-3 w-3 text-blue-500" />
        <span>{formatPercentage(source.humidity)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Wind className="h-3 w-3 text-green-500" />
        <span>{formatWindSpeed(source.wind_speed, units)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Gauge className="h-3 w-3 text-amber-500" />
        <span>{source.pressure.toFixed(0)} hPa</span>
      </div>
      <div className="flex items-center gap-1">
        <Cloud className="h-3 w-3 text-gray-500" />
        <span>{source.weather[0]?.main || 'N/A'}</span>
      </div>
    </div>
  );
}

function AgreementIndicator({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIcon = () => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 50) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  return (
    <div className={cn("flex items-center gap-1", getColor())}>
      {getIcon()}
      <span className="text-sm font-medium">{score.toFixed(0)}% agreement</span>
    </div>
  );
}

export function WeatherComparisonView({
  forecast,
  units = 'metric',
  expanded: controlledExpanded,
  onToggle,
  className,
}: WeatherComparisonViewProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const handleToggle = onToggle ?? (() => setInternalExpanded(!internalExpanded));

  const { multiSourceData, primaryWeather, sourceComparison, routePoint } = forecast;
  const sources = multiSourceData.sources;

  if (sources.length < 2) {
    return null; // Don't show comparison for single source
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <Card className={cn("", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  Multi-Source Comparison at {routePoint.distance.toFixed(1)} km
                </CardTitle>
                <CardDescription className="text-xs">
                  {sources.length} sources • Temperature range: 
                  {sourceComparison && ` ${sourceComparison.tempRange.diff.toFixed(1)}°C`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {sourceComparison && (
                  <AgreementIndicator score={sourceComparison.agreementScore} />
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {/* Column Headers */}
            <div className="grid grid-cols-6 gap-3 text-xs text-muted-foreground font-medium px-3">
              <span>Source</span>
              <span>Temp</span>
              <span>Humidity</span>
              <span>Wind</span>
              <span>Pressure</span>
              <span>Condition</span>
            </div>

            {/* Source Data Rows */}
            {sources.map((source) => (
              <SourceDataRow
                key={source.source}
                source={source}
                units={units}
                isPrimary={source.source === primaryWeather.source}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default WeatherComparisonView;

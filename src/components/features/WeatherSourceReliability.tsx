"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, CheckCircle, AlertTriangle, XCircle, Clock, Zap, Signal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ProviderStatusInfo,
  WeatherProviderId,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';

interface WeatherSourceReliabilityProps {
  statuses: Map<WeatherProviderId, ProviderStatusInfo>;
  className?: string;
  compact?: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'available': return 'text-green-500 bg-green-500/10';
    case 'degraded': return 'text-yellow-500 bg-yellow-500/10';
    case 'unavailable': return 'text-red-500 bg-red-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'available': return <CheckCircle className="h-4 w-4" />;
    case 'degraded': return <AlertTriangle className="h-4 w-4" />;
    case 'unavailable': return <XCircle className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}

function getResponseTimeQuality(ms: number): { label: string; color: string } {
  if (ms < 200) return { label: 'Excellent', color: 'text-green-500' };
  if (ms < 500) return { label: 'Good', color: 'text-blue-500' };
  if (ms < 1000) return { label: 'Fair', color: 'text-yellow-500' };
  return { label: 'Slow', color: 'text-red-500' };
}

function ProviderStatusCard({
  providerId,
  status,
  compact,
}: {
  providerId: WeatherProviderId;
  status: ProviderStatusInfo;
  compact: boolean;
}) {
  const config = WEATHER_PROVIDERS[providerId];
  const responseQuality = status.responseTimeMs 
    ? getResponseTimeQuality(status.responseTimeMs) 
    : null;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border",
          getStatusColor(status.status)
        )}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-medium">{config.name}</span>
        {getStatusIcon(status.status)}
        {status.responseTimeMs && (
          <span className="text-xs text-muted-foreground">
            {status.responseTimeMs}ms
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="font-medium">{config.name}</span>
        </div>
        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs", getStatusColor(status.status))}>
          {getStatusIcon(status.status)}
          <span className="capitalize">{status.status}</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Response Time */}
        {status.responseTimeMs !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3 w-3" />
                Response Time
              </div>
              <span className={responseQuality?.color}>
                {status.responseTimeMs}ms ({responseQuality?.label})
              </span>
            </div>
            <Progress 
              value={Math.max(0, 100 - (status.responseTimeMs / 10))} 
              className="h-1.5" 
            />
          </div>
        )}

        {/* Success Rate */}
        {status.successRate !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Signal className="h-3 w-3" />
                Success Rate
              </div>
              <span>{status.successRate}%</span>
            </div>
            <Progress value={status.successRate} className="h-1.5" />
          </div>
        )}

        {/* Last Checked */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
        </div>

        {/* Error Message */}
        {status.errorMessage && (
          <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
            {status.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeatherSourceReliability({
  statuses,
  className,
  compact = false,
}: WeatherSourceReliabilityProps) {
  const statusArray = Array.from(statuses.entries());
  
  if (statusArray.length === 0) {
    return null;
  }

  const availableCount = statusArray.filter(([, s]) => s.status === 'available').length;
  const totalCount = statusArray.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Service Status
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time availability of weather data providers
            </CardDescription>
          </div>
          <Badge variant={availableCount === totalCount ? 'default' : 'secondary'}>
            {availableCount}/{totalCount} Available
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          compact ? "flex flex-wrap gap-2" : "grid gap-3",
          !compact && statusArray.length > 1 && "md:grid-cols-2"
        )}>
          {statusArray.map(([id, status]) => (
            <ProviderStatusCard
              key={id}
              providerId={id}
              status={status}
              compact={compact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherSourceReliability;

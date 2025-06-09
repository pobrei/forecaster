'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Wind, 
  Thermometer,
  BarChart3,
  Upload,
  Download
} from 'lucide-react';

interface EnhancedLoadingProps {
  message?: string;
  submessage?: string;
  progress?: number;
  type?: 'weather' | 'upload' | 'download' | 'analysis' | 'general';
  className?: string;
}

const loadingConfigs = {
  weather: {
    icon: Cloud,
    defaultMessage: 'Fetching weather data',
    defaultSubmessage: 'Analyzing atmospheric conditions...',
    color: 'text-blue-500'
  },
  upload: {
    icon: Upload,
    defaultMessage: 'Processing GPX file',
    defaultSubmessage: 'Parsing route data...',
    color: 'text-green-500'
  },
  download: {
    icon: Download,
    defaultMessage: 'Preparing download',
    defaultSubmessage: 'Generating export file...',
    color: 'text-purple-500'
  },
  analysis: {
    icon: BarChart3,
    defaultMessage: 'Analyzing data',
    defaultSubmessage: 'Processing weather patterns...',
    color: 'text-orange-500'
  },
  general: {
    icon: Sun,
    defaultMessage: 'Loading',
    defaultSubmessage: 'Please wait...',
    color: 'text-primary'
  }
};

export function EnhancedLoading({
  message,
  submessage,
  progress,
  type = 'general',
  className
}: EnhancedLoadingProps) {
  const config = loadingConfigs[type];
  const IconComponent = config.icon;
  
  return (
    <div className={cn(
      "flex flex-col items-center gap-4 py-8 animate-fade-in",
      className
    )}>
      {/* Animated Icon */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <IconComponent className={cn(
          "absolute inset-0 m-auto h-6 w-6 animate-pulse",
          config.color
        )} />
      </div>

      {/* Loading Text */}
      <div className="text-center space-y-1">
        <p className="font-medium text-foreground">
          {message || config.defaultMessage}
        </p>
        <p className="text-sm text-muted-foreground">
          {submessage || config.defaultSubmessage}
        </p>
      </div>

      {/* Progress Bar */}
      {typeof progress === 'number' && (
        <div className="w-full max-w-xs space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingSkeletonProps {
  type?: 'card' | 'chart' | 'list' | 'table';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  type = 'card',
  count = 1,
  className
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted animate-shimmer" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-muted rounded animate-shimmer" />
                <div className="h-4 w-1/2 bg-muted rounded animate-shimmer" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-shimmer" />
              <div className="h-4 w-5/6 bg-muted rounded animate-shimmer" />
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className="space-y-4">
            <div className="h-6 w-1/3 bg-muted rounded animate-shimmer" />
            <div className="h-64 w-full bg-muted rounded animate-shimmer" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-shimmer" />
              ))}
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-muted animate-shimmer" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-3/4 bg-muted rounded animate-shimmer" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'table':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 bg-muted rounded animate-shimmer" />
              ))}
            </div>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-4 bg-muted rounded animate-shimmer" />
                ))}
              </div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn("animate-fade-in", className)}>
      {renderSkeleton()}
    </div>
  );
}

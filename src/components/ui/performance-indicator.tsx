"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TrendingUp
} from 'lucide-react';

interface PerformanceIndicatorProps {
  isProcessing: boolean;
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  currentStepIndex?: number;
  estimatedTimeRemaining?: number;
  processingSpeed?: number;
  className?: string;
}

export function PerformanceIndicator({
  isProcessing,
  progress,
  currentStep,
  totalSteps,
  currentStepIndex,
  estimatedTimeRemaining,
  processingSpeed,
  className
}: PerformanceIndicatorProps) {
  if (!isProcessing && progress === 0) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressColor = (): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getStatusIcon = () => {
    if (progress >= 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-orange-500" />;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {progress >= 100 ? 'Complete' : isProcessing ? 'Processing' : 'Ready'}
              </span>
            </div>
            <Badge variant={progress >= 100 ? 'default' : 'secondary'}>
              {Math.round(progress)}%
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="h-2"
            />
            
            {/* Current step indicator */}
            {currentStep && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{currentStep}</span>
                {totalSteps && currentStepIndex !== undefined && (
                  <span>{currentStepIndex + 1} of {totalSteps}</span>
                )}
              </div>
            )}
          </div>

          {/* Performance metrics */}
          {(estimatedTimeRemaining || processingSpeed) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(estimatedTimeRemaining)} remaining</span>
                </div>
              )}
              
              {processingSpeed && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{processingSpeed.toFixed(1)} pts/sec</span>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Optimized processing</span>
                </div>
              )}
            </div>
          )}

          {/* Tips for better performance */}
          {isProcessing && progress < 50 && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Tip: Smaller GPX files and shorter routes process faster. 
              Large routes are automatically optimized for better performance.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for tracking processing performance
export function useProcessingPerformance() {
  const [metrics, setMetrics] = React.useState({
    startTime: 0,
    processedItems: 0,
    totalItems: 0,
    currentStep: '',
    estimatedTimeRemaining: 0,
    processingSpeed: 0
  });

  const startProcessing = (totalItems: number, initialStep: string = 'Starting...') => {
    setMetrics({
      startTime: Date.now(),
      processedItems: 0,
      totalItems,
      currentStep: initialStep,
      estimatedTimeRemaining: 0,
      processingSpeed: 0
    });
  };

  const updateProgress = (processedItems: number, currentStep?: string) => {
    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000; // seconds
    const speed = processedItems / elapsed;
    const remaining = metrics.totalItems - processedItems;
    const estimatedTimeRemaining = remaining / speed;

    setMetrics(prev => ({
      ...prev,
      processedItems,
      currentStep: currentStep || prev.currentStep,
      processingSpeed: speed,
      estimatedTimeRemaining: isFinite(estimatedTimeRemaining) ? estimatedTimeRemaining : 0
    }));
  };

  const getProgress = () => {
    if (metrics.totalItems === 0) return 0;
    return (metrics.processedItems / metrics.totalItems) * 100;
  };

  return {
    metrics,
    startProcessing,
    updateProgress,
    getProgress,
    isComplete: metrics.processedItems >= metrics.totalItems && metrics.totalItems > 0
  };
}

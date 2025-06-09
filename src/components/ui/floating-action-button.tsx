'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, Download, Share, Calendar, Bell } from 'lucide-react';

interface FloatingActionButtonProps {
  onUpload?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onSchedule?: () => void;
  onAlert?: () => void;
  hasData?: boolean;
  className?: string;
}

export function FloatingActionButton({
  onUpload,
  onDownload,
  onShare,
  onSchedule,
  onAlert,
  hasData = false,
  className
}: FloatingActionButtonProps) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex flex-col gap-3",
      className
    )}>
      {/* Primary Upload Button - Always visible */}
      <Button
        onClick={onUpload}
        className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 touch-target animate-bounce-gentle"
        size="icon"
      >
        <Upload className="h-6 w-6" />
        <span className="sr-only">Upload GPX file</span>
      </Button>

      {/* Secondary Actions - Only show when data is available */}
      {hasData && (
        <div className="flex flex-col gap-2 animate-fade-in">
          {onDownload && (
            <Button
              onClick={onDownload}
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-md hover:shadow-lg transition-all duration-300 touch-target"
              size="icon"
            >
              <Download className="h-5 w-5" />
              <span className="sr-only">Download data</span>
            </Button>
          )}

          {onShare && (
            <Button
              onClick={onShare}
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-md hover:shadow-lg transition-all duration-300 touch-target"
              size="icon"
            >
              <Share className="h-5 w-5" />
              <span className="sr-only">Share route</span>
            </Button>
          )}

          {onSchedule && (
            <Button
              onClick={onSchedule}
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-md hover:shadow-lg transition-all duration-300 touch-target"
              size="icon"
            >
              <Calendar className="h-5 w-5" />
              <span className="sr-only">Schedule activity</span>
            </Button>
          )}

          {onAlert && (
            <Button
              onClick={onAlert}
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-md hover:shadow-lg transition-all duration-300 touch-target"
              size="icon"
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Set weather alerts</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

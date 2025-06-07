"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileUpload as OriginalFileUpload } from './FileUpload';
import { IOSSafariFileUpload } from './IOSSafariFileUpload';
import { Route } from '@/types';

interface FileUploadProps {
  onRouteUploaded: (route: Route) => void;
  isLoading?: boolean;
  className?: string;
}

// Detect iOS Safari
const isIOSSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
  return isIOS && isSafari;
};

// Client-only wrapper to prevent hydration mismatch
export function FileUpload({ onRouteUploaded, isLoading = false, className }: FileUploadProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsIOSDevice(isIOSSafari());
  }, []);

  // Show static skeleton during SSR and initial client render
  if (!isMounted) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload GPX File
          </CardTitle>
          <CardDescription>
            Upload your GPX file to get started with weather analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-muted-foreground/25">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your GPX file here, or click to browse
            </p>
            <Button variant="outline" disabled>
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supports GPX files up to 5 MB
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render the appropriate component based on device
  if (isIOSDevice) {
    return <IOSSafariFileUpload onRouteUploaded={onRouteUploaded} isLoading={isLoading} className={className} />;
  }

  return <OriginalFileUpload onRouteUploaded={onRouteUploaded} isLoading={isLoading} className={className} />;
}

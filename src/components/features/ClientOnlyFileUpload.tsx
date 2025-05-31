"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileUpload as OriginalFileUpload } from './FileUpload';

interface FileUploadProps {
  onRouteUploaded: (route: any) => void;
  isLoading?: boolean;
  className?: string;
}

// Client-only wrapper to prevent hydration mismatch
export function FileUpload({ onRouteUploaded, isLoading = false, className }: FileUploadProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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

  // Render the actual component only on client
  return <OriginalFileUpload onRouteUploaded={onRouteUploaded} isLoading={isLoading} className={className} />;
}

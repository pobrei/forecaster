"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, APIResponse, UploadResponse } from '@/types';
import { GPX_CONSTRAINTS } from '@/lib/constants';
import { toast } from 'sonner';

interface IOSSafariFileUploadProps {
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

export function IOSSafariFileUpload({ onRouteUploaded, isLoading = false, className }: IOSSafariFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isIOSDevice] = useState(isIOSSafari);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = useCallback((file: File): string | null => {
    console.log('iOS Safari file validation:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      isIOSDevice
    });

    // Check file size
    if (file.size > GPX_CONSTRAINTS.MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(GPX_CONSTRAINTS.MAX_FILE_SIZE)}`;
    }

    // Check if file is empty
    if (file.size === 0) {
      return 'File appears to be empty. Please select a valid GPX file.';
    }

    // Very lenient file extension check for iOS Safari
    const fileName = file.name.toLowerCase().trim();
    if (!fileName.endsWith('.gpx')) {
      return 'Please select a file with .gpx extension';
    }

    // For iOS Safari, we're very lenient with MIME types since they're often missing or incorrect
    if (isIOSDevice) {
      console.log('iOS Safari detected - using lenient validation');
      return null; // Skip MIME type validation on iOS Safari
    }

    // Standard MIME type validation for other browsers
    const validMimeTypes = GPX_CONSTRAINTS.MIME_TYPES;
    if (file.type && !validMimeTypes.includes(file.type as any)) {
      return 'Invalid file type. Please select a GPX file.';
    }

    return null;
  }, [isIOSDevice]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected on iOS Safari:', file);

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      toast.error(error);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    toast.success('File selected successfully');
  }, [validateFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.append('gpx', selectedFile);

      console.log('Uploading file from iOS Safari...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: APIResponse<UploadResponse> = await response.json();
      console.log('Upload result:', result);

      if (result.success && result.data) {
        setUploadStatus('success');
        toast.success(result.data.message);
        onRouteUploaded(result.data.route);
      } else {
        setUploadStatus('error');
        const errorMsg = result.error || 'Upload failed';
        console.error('Upload failed:', errorMsg);
        toast.error(errorMsg);
        setValidationError(errorMsg);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMsg);
      setValidationError(errorMsg);
    }
  }, [selectedFile, onRouteUploaded]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload GPX File
          {isIOSDevice && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">iOS Safari</span>
          )}
        </CardTitle>
        <CardDescription>
          Upload your GPX file to get started with weather analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* iOS Safari specific instructions */}
        {isIOSDevice && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>iOS Safari detected:</strong> File upload has been optimized for your device. 
              If you experience issues, try using the Files app to select your GPX file.
            </AlertDescription>
          </Alert>
        )}

        {/* File selection */}
        {!selectedFile ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-muted-foreground/25 hover:border-muted-foreground/50">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {isIOSDevice 
                  ? 'Tap the button below to select your GPX file'
                  : 'Click the button below to select your GPX file'
                }
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                onChange={handleFileInput}
                className="hidden"
                disabled={isLoading}
                aria-label="Choose GPX file to upload"
              />
              <Button
                variant="outline"
                onClick={handleFileSelect}
                disabled={isLoading}
                className="touch-manipulation"
                size="lg"
              >
                {isIOSDevice ? 'Select GPX File' : 'Choose File'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Supports GPX files up to {formatFileSize(GPX_CONSTRAINTS.MAX_FILE_SIZE)}
            </p>
          </div>
        ) : (
          /* File selected - show upload interface */
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                    {selectedFile.type && ` • ${selectedFile.type}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isLoading || uploadStatus === 'uploading'}
                className="flex-1"
                size="lg"
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload & Analyze'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading || uploadStatus === 'uploading'}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Validation error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Upload status */}
        {uploadStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              GPX file uploaded successfully! You can now generate weather forecasts.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

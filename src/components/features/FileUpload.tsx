"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, APIResponse, UploadResponse } from '@/types';
import { formatFileSize } from '@/lib/format';
import { GPX_CONSTRAINTS } from '@/lib/constants';
import { toast } from 'sonner';

interface FileUploadProps {
  onRouteUploaded: (route: Route) => void;
  isLoading?: boolean;
  className?: string;
}

export function FileUpload({ onRouteUploaded, isLoading = false, className }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|windows phone|opera mini|iemobile/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || isTouchDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const validateFile = (file: File): string | null => {
    console.log('Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      isMobile
    });

    // Check file size
    if (file.size > GPX_CONSTRAINTS.MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(GPX_CONSTRAINTS.MAX_FILE_SIZE)}`;
    }

    // More flexible file extension check for mobile
    const fileName = file.name.toLowerCase();
    const hasGpxExtension = fileName.endsWith('.gpx');
    const hasValidMimeType = file.type === 'application/gpx+xml' ||
                            file.type === 'text/xml' ||
                            file.type === 'application/xml' ||
                            file.type === '';

    // On mobile, be more lenient with file validation
    if (isMobile) {
      // Accept if it has .gpx extension OR if it's an XML-like file
      if (!hasGpxExtension && !hasValidMimeType && !fileName.includes('gpx')) {
        return 'Please select a valid GPX file';
      }
    } else {
      // Desktop validation - stricter
      if (!hasGpxExtension) {
        return 'Please select a valid GPX file';
      }
    }

    return null;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    console.log('handleFiles called with:', files);

    if (!files || files.length === 0) {
      console.log('No files provided');
      return;
    }

    const file = files[0];
    console.log('Processing file:', file);

    const error = validateFile(file);

    if (error) {
      console.error('File validation error:', error);
      toast.error(error);
      return;
    }

    console.log('File validated successfully, setting selected file');
    setSelectedFile(file);
    setUploadStatus('idle');

    // Show success message for mobile users
    if (isMobile) {
      toast.success(`File "${file.name}" selected successfully!`);
    }
  }, [isMobile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input change event:', e.target.files);
    handleFiles(e.target.files);
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  // Mobile-specific file selection handler
  const handleMobileFileSelect = useCallback(() => {
    console.log('Mobile file select triggered');
    if (fileInputRef.current) {
      // For mobile, we need to ensure the input is properly triggered
      fileInputRef.current.click();
    }
  }, []);

  const uploadFile = async () => {
    if (!selectedFile) return;

    console.log('Starting upload for file:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      isMobile
    });

    setUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('gpx', selectedFile);

      console.log('Sending upload request...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
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
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      const errorMsg = isMobile
        ? 'Upload failed. Please check your internet connection and try again.'
        : 'Network error. Please try again.';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      default:
        return 'border-muted-foreground/25';
    }
  };

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
        {!selectedFile ? (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              isLoading && 'pointer-events-none opacity-50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your GPX file here, or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={isMobile ? "*/*" : ".gpx,application/gpx+xml,text/xml,application/xml"}
              onChange={handleFileInput}
              className="hidden"
              disabled={isLoading}
              aria-label="Choose GPX file to upload"
            />
            <Button
              variant="outline"
              onClick={isMobile ? handleMobileFileSelect : () => fileInputRef.current?.click()}
              disabled={isLoading}
              className={cn(isMobile && "touch-manipulation")}
            >
              {isMobile && <Smartphone className="h-4 w-4 mr-2" />}
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supports GPX files up to 5 MB
              {isMobile && (
                <span className="block mt-1 text-blue-600 dark:text-blue-400">
                  📱 On mobile: Select any file, we'll validate it's a GPX file
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={cn('border rounded-lg p-4 flex items-center gap-3', getStatusColor())}>
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploadStatus === 'idle' && (
              <div className="flex gap-2">
                <Button
                  onClick={uploadFile}
                  disabled={uploading || isLoading}
                  className="flex-1"
                >
                  {uploading ? 'Uploading...' : 'Upload & Process'}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFile}
                  disabled={uploading || isLoading}
                >
                  Cancel
                </Button>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="text-center">
                <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                  File uploaded successfully!
                </p>
                <Button variant="outline" onClick={clearFile} size="sm">
                  Upload Another File
                </Button>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex gap-2">
                <Button
                  onClick={uploadFile}
                  disabled={uploading || isLoading}
                  className="flex-1"
                >
                  Retry Upload
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFile}
                  disabled={uploading || isLoading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

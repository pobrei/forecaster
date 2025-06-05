"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';

export default function DebugPage() {
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get device info on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeviceInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        touchSupport: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      });
    }
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    addLog(`File input change event triggered`);
    addLog(`Files: ${files ? files.length : 0}`);
    
    if (files && files.length > 0) {
      const file = files[0];
      addLog(`File selected: ${file.name}`);
      addLog(`File size: ${file.size} bytes`);
      addLog(`File type: ${file.type}`);
      addLog(`Last modified: ${new Date(file.lastModified).toISOString()}`);
      
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        lastModifiedDate: new Date(file.lastModified).toISOString()
      });

      // Try to read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        addLog(`File content length: ${content.length}`);
        addLog(`Content starts with: ${content.substring(0, 100)}...`);
      };
      reader.onerror = (error) => {
        addLog(`File read error: ${error}`);
      };
      reader.readAsText(file);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setFileInfo(null);
  };

  const testUpload = async () => {
    if (!fileInfo) {
      addLog('No file selected for upload test');
      return;
    }

    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      addLog('No file in input for upload');
      return;
    }

    const file = fileInput.files[0];
    addLog(`Starting upload test for: ${file.name}`);

    try {
      const formData = new FormData();
      formData.append('gpx', file);

      addLog('Sending request to /api/upload...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      addLog(`Response status: ${response.status}`);
      addLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      const result = await response.json();
      addLog(`Response body: ${JSON.stringify(result, null, 2)}`);

    } catch (error) {
      addLog(`Upload error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Mobile File Upload Debug</CardTitle>
          <CardDescription>
            Debug page for testing file upload functionality on mobile devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Info */}
          <div>
            <h3 className="font-semibold mb-2">Device Information</h3>
            {deviceInfo ? (
              <div className="text-sm space-y-1">
                <div>User Agent: {deviceInfo.userAgent}</div>
                <div>Platform: {deviceInfo.platform}</div>
                <div>Touch Support: {deviceInfo.touchSupport ? 'Yes' : 'No'}</div>
                <div>Max Touch Points: {deviceInfo.maxTouchPoints}</div>
                <div>Screen: {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
                <div>Viewport: {deviceInfo.viewportWidth}x{deviceInfo.viewportHeight}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading device information...</div>
            )}
          </div>

          {/* File Input Test */}
          <div>
            <h3 className="font-semibold mb-2">File Input Test</h3>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                aria-label="Select file for debugging"
              />
              
              {fileInfo && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                  <h4 className="font-medium mb-2">Selected File Info:</h4>
                  <pre className="text-xs">{JSON.stringify(fileInfo, null, 2)}</pre>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={testUpload} disabled={!fileInfo}>
                  Test Upload
                </Button>
                <Button variant="outline" onClick={clearLogs}>
                  Clear Logs
                </Button>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div>
            <h3 className="font-semibold mb-2">Debug Logs</h3>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div>No logs yet. Select a file to start debugging.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

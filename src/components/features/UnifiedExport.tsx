"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  Globe,
  Map,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Route, WeatherForecast, AppSettings } from '@/types';
import { 
  generateTextPDFReport, 
  generateHTMLReport, 
  generateCSVReport, 
  generateGPXWithWeather,
  downloadBlob, 
  generateExportFilename 
} from '@/lib/pdf-generator';
import { formatTemperature, formatWindSpeed, formatDistance } from '@/lib/format';
import { toast } from 'sonner';

interface UnifiedExportProps {
  route: Route;
  forecasts: WeatherForecast[];
  settings: AppSettings;
  className?: string;
}

interface ExportOptions {
  includeCharts: boolean;
  includeMap: boolean;
  includeWeatherDetails: boolean;
  includeAlerts: boolean;
  includeStatistics: boolean;
}

export function UnifiedExport({ route, forecasts, settings, className }: UnifiedExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCharts: true,
    includeMap: true,
    includeWeatherDetails: true,
    includeAlerts: true,
    includeStatistics: true,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExportOptionChange = (key: keyof ExportOptions, value: boolean) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 20, 90));
      }, 100);

      const pdfBlob = generateTextPDFReport(route, forecasts, settings);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      const filename = generateExportFilename(route, 'pdf');
      downloadBlob(pdfBlob, filename);

      toast.success('PDF report generated successfully!');
      setTimeout(() => setExportProgress(0), 2000);

    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF report');
      setExportProgress(0);
    } finally {
      setIsExporting(false);
    }
  };

  // HTML Export
  const handleExportHTML = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const htmlBlob = generateHTMLReport(route, forecasts, settings);
      const filename = generateExportFilename(route, 'html');
      downloadBlob(htmlBlob, filename);
      toast.success('HTML report exported successfully!');
    } catch (error) {
      console.error('HTML export error:', error);
      toast.error('Failed to export HTML report');
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const csvBlob = generateCSVReport(route, forecasts, settings);
      const filename = generateExportFilename(route, 'csv');
      downloadBlob(csvBlob, filename);
      toast.success('CSV data exported successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV data');
    }
  };

  // JSON Export
  const handleExportJSON = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const exportData = {
        route,
        forecasts,
        settings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const filename = generateExportFilename(route, 'json');
      downloadBlob(jsonBlob, filename);
      toast.success('JSON data exported successfully!');
    } catch (error) {
      console.error('JSON export error:', error);
      toast.error('Failed to export JSON data');
    }
  };

  // GPX Export
  const handleExportGPX = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const gpxBlob = generateGPXWithWeather(route, forecasts, settings);
      const filename = generateExportFilename(route, 'gpx');
      downloadBlob(gpxBlob, filename);
      toast.success('GPX file with weather data exported successfully!');
    } catch (error) {
      console.error('GPX export error:', error);
      toast.error('Failed to export GPX file');
    }
  };

  // PNG Export with comprehensive chart capture
  const handleExportPNG = async () => {
    if (!canvasRef.current || !forecasts.length) {
      toast.error('Unable to generate export image');
      return;
    }

    setIsExporting(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas size for high-quality export
      const width = 1200;
      const height = 1600;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Header
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Weather Forecast Report', width / 2, 50);

      // Route information
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`Route: ${route.name}`, width / 2, 80);
      ctx.fillText(`Distance: ${formatDistance(route.totalDistance)} | Points: ${forecasts.length}`, width / 2, 105);
      ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, width / 2, 130);

      // Weather summary
      const temps = forecasts.map(f => f.weather.temp);
      const winds = forecasts.map(f => f.weather.wind_speed);

      const stats = {
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
        avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
        maxWind: Math.max(...winds),
        avgWind: winds.reduce((a, b) => a + b, 0) / winds.length,
      };

      let yPos = 170;
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Weather Summary', 50, yPos);

      yPos += 40;
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#374151';

      const summaryItems = [
        `Temperature: ${formatTemperature(stats.minTemp, settings.units)} to ${formatTemperature(stats.maxTemp, settings.units)}`,
        `Wind Speed: Max ${formatWindSpeed(stats.maxWind, settings.units)} (avg: ${formatWindSpeed(stats.avgWind, settings.units)})`,
        `Weather Service: Open-Meteo`,
        `Forecast Interval: ${settings.forecastInterval} minutes`
      ];

      summaryItems.forEach(item => {
        ctx.fillText(item, 50, yPos);
        yPos += 25;
      });

      // Try to capture charts
      const chartElements = document.querySelectorAll('canvas');
      yPos += 50;

      if (chartElements.length > 0) {
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.fillText('Weather Charts', 50, yPos);
        yPos += 40;

        for (let i = 0; i < Math.min(chartElements.length, 3); i++) {
          const chartCanvas = chartElements[i] as HTMLCanvasElement;
          if (chartCanvas && chartCanvas.width > 0 && chartCanvas.height > 0) {
            try {
              const chartWidth = 500;
              const chartHeight = 200;
              const chartX = (width - chartWidth) / 2;
              
              ctx.drawImage(chartCanvas, chartX, yPos, chartWidth, chartHeight);
              yPos += chartHeight + 20;
            } catch (error) {
              console.warn('Could not capture chart:', error);
            }
          }
        }
      }

      // Footer
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generated by Forecaster - Weather Planning Application', width / 2, height - 30);

      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `weather-forecast-${route.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success('Weather forecast image exported successfully!');
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('Failed to export weather forecast image');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Weather Data
        </CardTitle>
        <CardDescription>
          Export your weather forecast in multiple formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleExportHTML}
                disabled={isExporting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Globe className="h-4 w-4" />
                Export HTML Report
              </Button>

              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2"
                variant="default"
              >
                <FileText className="h-4 w-4" />
                {isExporting ? 'Generating...' : 'Export PDF Report'}
              </Button>

              <Button
                onClick={handleExportPNG}
                disabled={isExporting}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Image className="h-4 w-4" />
                Export PNG Image
              </Button>

              <Button
                onClick={handleExportGPX}
                disabled={isExporting}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Map className="h-4 w-4" />
                Export GPX File
              </Button>
            </div>

            {isExporting && exportProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating export...
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="flex items-center gap-2"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV Data
              </Button>

              <Button
                onClick={handleExportJSON}
                disabled={isExporting}
                className="flex items-center gap-2"
                variant="outline"
              >
                <FileCode className="h-4 w-4" />
                Export JSON Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-charts"
                  checked={exportOptions.includeCharts}
                  onCheckedChange={(checked) => handleExportOptionChange('includeCharts', checked)}
                />
                <Label htmlFor="include-charts">Include Charts</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-map"
                  checked={exportOptions.includeMap}
                  onCheckedChange={(checked) => handleExportOptionChange('includeMap', checked)}
                />
                <Label htmlFor="include-map">Include Map</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-details"
                  checked={exportOptions.includeWeatherDetails}
                  onCheckedChange={(checked) => handleExportOptionChange('includeWeatherDetails', checked)}
                />
                <Label htmlFor="include-details">Include Weather Details</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-alerts"
                  checked={exportOptions.includeAlerts}
                  onCheckedChange={(checked) => handleExportOptionChange('includeAlerts', checked)}
                />
                <Label htmlFor="include-alerts">Include Weather Alerts</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-statistics"
                  checked={exportOptions.includeStatistics}
                  onCheckedChange={(checked) => handleExportOptionChange('includeStatistics', checked)}
                />
                <Label htmlFor="include-statistics">Include Statistics</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Hidden canvas for PNG generation */}
        <canvas
          ref={canvasRef}
          className="hidden"
          aria-hidden="true"
        />

        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="font-medium">Available Formats:</span>
          </div>
          <ul className="space-y-1 ml-6">
            <li>• <strong>HTML:</strong> Interactive web report (recommended)</li>
            <li>• <strong>PDF:</strong> Printable document</li>
            <li>• <strong>PNG:</strong> High-quality image with charts</li>
            <li>• <strong>CSV:</strong> Spreadsheet data</li>
            <li>• <strong>JSON:</strong> Raw data for developers</li>
            <li>• <strong>GPX:</strong> GPS file with weather data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

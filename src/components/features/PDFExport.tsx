"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { Route, WeatherForecast, AppSettings, ExportOptions } from '@/types';
import { generatePDFReport, downloadBlob, generateExportFilename } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface PDFExportProps {
  route: Route;
  forecasts: WeatherForecast[];
  settings: AppSettings;
  className?: string;
}

export function PDFExport({ route, forecasts, settings, className }: PDFExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMap: true,
    includeCharts: true,
    includeWeatherDetails: true,
    includeAlerts: true,
    format: 'pdf'
  });

  const handleExportOptionChange = (key: keyof ExportOptions, value: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportPDF = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Generate PDF
      const pdfBlob = await generatePDFReport(route, forecasts, settings, exportOptions);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the PDF
      const filename = generateExportFilename(route, 'pdf');
      downloadBlob(pdfBlob, filename);

      toast.success('PDF report generated successfully!');
      
      // Reset progress after a short delay
      setTimeout(() => {
        setExportProgress(0);
      }, 2000);

    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF report. Please try again.');
      setExportProgress(0);
    } finally {
      setIsExporting(false);
    }
  };

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

      toast.success('Data exported as JSON successfully!');
    } catch (error) {
      console.error('JSON export error:', error);
      toast.error('Failed to export data as JSON. Please try again.');
    }
  };

  const getEstimatedFileSize = () => {
    let size = 'Small (~100KB)';
    let factors = 0;
    
    if (exportOptions.includeMap) factors++;
    if (exportOptions.includeCharts) factors++;
    if (exportOptions.includeWeatherDetails && forecasts.length > 10) factors++;
    
    if (factors >= 3) size = 'Large (~2-5MB)';
    else if (factors >= 2) size = 'Medium (~500KB-2MB)';
    
    return size;
  };

  const totalAlerts = forecasts.reduce((sum, forecast) => 
    sum + (forecast.alerts?.length || 0), 0
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export Report
        </CardTitle>
        <CardDescription>
          Generate and download comprehensive weather reports for your route
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <Label className="text-sm font-medium">Export Options</Label>
          </div>
          
          <div className="grid grid-cols-1 gap-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-map" className="text-sm">
                Include Map Visualization
              </Label>
              <Switch
                id="include-map"
                checked={exportOptions.includeMap}
                onCheckedChange={(checked) => handleExportOptionChange('includeMap', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-charts" className="text-sm">
                Include Weather Charts
              </Label>
              <Switch
                id="include-charts"
                checked={exportOptions.includeCharts}
                onCheckedChange={(checked) => handleExportOptionChange('includeCharts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-details" className="text-sm">
                Include Detailed Weather Data
              </Label>
              <Switch
                id="include-details"
                checked={exportOptions.includeWeatherDetails}
                onCheckedChange={(checked) => handleExportOptionChange('includeWeatherDetails', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-alerts" className="text-sm">
                Include Weather Alerts
                {totalAlerts > 0 && (
                  <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                    ({totalAlerts} alerts)
                  </span>
                )}
              </Label>
              <Switch
                id="include-alerts"
                checked={exportOptions.includeAlerts}
                onCheckedChange={(checked) => handleExportOptionChange('includeAlerts', checked)}
              />
            </div>
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Route: {route.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Forecast Points: {forecasts.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Estimated Size: {getEstimatedFileSize()}</span>
          </div>
          {totalAlerts > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span>Weather Alerts: {totalAlerts}</span>
            </div>
          )}
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Generating PDF...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        {/* Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Generating PDF...' : 'Export as PDF'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportJSON}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export as JSON
          </Button>
        </div>

        {/* Export Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>PDF:</strong> Comprehensive report with charts and maps (if enabled)</p>
          <p><strong>JSON:</strong> Raw data for importing into other applications</p>
          <p><strong>Tip:</strong> Disable map and charts for faster generation and smaller file size</p>
        </div>
      </CardContent>
    </Card>
  );
}

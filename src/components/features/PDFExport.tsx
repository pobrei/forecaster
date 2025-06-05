"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, Settings, CheckCircle, AlertCircle, FileSpreadsheet, Globe, FileCode } from 'lucide-react';
import { Route, WeatherForecast, AppSettings, ExportOptions } from '@/types';
import { generatePDFReport, downloadBlob, generateExportFilename, generateCSVReport, generateHTMLReport, generateTextPDFReport, generateGPXWithWeather } from '@/lib/pdf-generator';
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

  const handleExportCSV = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const csvBlob = generateCSVReport(route, forecasts, settings);
      const filename = generateExportFilename(route, 'csv');
      downloadBlob(csvBlob, filename);
      toast.success('Data exported as CSV successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export data as CSV. Please try again.');
    }
  };

  const handleExportHTML = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const htmlBlob = generateHTMLReport(route, forecasts, settings);
      const filename = generateExportFilename(route, 'html');
      downloadBlob(htmlBlob, filename);
      toast.success('HTML report generated successfully! You can open it in your browser and print to PDF.');
    } catch (error) {
      console.error('HTML export error:', error);
      toast.error('Failed to export HTML report. Please try again.');
    }
  };

  const handleExportTextPDF = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 20;
        });
      }, 100);

      const pdfBlob = generateTextPDFReport(route, forecasts, settings);

      clearInterval(progressInterval);
      setExportProgress(100);

      const filename = generateExportFilename(route, 'pdf');
      downloadBlob(pdfBlob, filename);

      toast.success('Text-based PDF report generated successfully!');

      setTimeout(() => {
        setExportProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Text PDF export error:', error);
      toast.error('Failed to generate text PDF report. Please try again.');
      setExportProgress(0);
    } finally {
      setIsExporting(false);
    }
  };

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
      toast.error('Failed to export GPX file. Please try again.');
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
          <Download className="h-5 w-5" />
          Export Weather Report
        </CardTitle>
        <CardDescription>
          Choose from multiple export formats: HTML (recommended), PDF, CSV, JSON, or GPX
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={handleExportHTML}
              disabled={isExporting}
              className="flex items-center gap-2"
              variant="default"
            >
              <Globe className="h-4 w-4" />
              Export as HTML Report
            </Button>

            <Button
              onClick={handleExportTextPDF}
              disabled={isExporting}
              className="flex items-center gap-2"
              variant="default"
            >
              <FileText className="h-4 w-4" />
              {isExporting ? 'Generating PDF...' : 'Export as Text PDF'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export as CSV
            </Button>

            <Button
              variant="outline"
              onClick={handleExportJSON}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <FileCode className="h-4 w-4" />
              Export as JSON
            </Button>

            <Button
              variant="outline"
              onClick={handleExportGPX}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export as GPX
            </Button>
          </div>

          <div className="pt-2 border-t">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 w-full"
              variant="secondary"
            >
              <FileText className="h-4 w-4" />
              {isExporting ? 'Generating PDF...' : 'Export as PDF (with images - may fail)'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              ⚠️ This option may fail due to browser compatibility issues
            </p>
          </div>
        </div>

        {/* Export Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>HTML Report:</strong> 📄 Best option! Opens in browser, can be printed to PDF (Ctrl+P)</p>
          <p><strong>Text PDF:</strong> 📋 Reliable PDF without images, includes all weather data</p>
          <p><strong>CSV:</strong> 📊 Spreadsheet format for data analysis in Excel/Google Sheets</p>
          <p><strong>JSON:</strong> 💾 Raw data for importing into other applications</p>
          <p><strong>GPX:</strong> 🗺️ GPS file with embedded weather data for GPS devices</p>
        </div>
      </CardContent>
    </Card>
  );
}

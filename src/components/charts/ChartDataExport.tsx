"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  Image, 
  FileText,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { WeatherForecast } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation, formatPressure } from '@/lib/format';
import { toast } from 'sonner';

interface ChartDataExportProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  chartRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

type ExportFormat = 'csv' | 'json' | 'png' | 'svg' | 'txt';

interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeMetadata: boolean;
  includeStatistics: boolean;
  dateFormat: 'iso' | 'readable';
  precision: number;
}

export function ChartDataExport({ 
  forecasts, 
  units = 'metric', 
  chartRef,
  className 
}: ChartDataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHeaders: true,
    includeMetadata: true,
    includeStatistics: false,
    dateFormat: 'readable',
    precision: 2
  });

  const exportFormats = [
    { 
      value: 'csv', 
      label: 'CSV Spreadsheet', 
      icon: FileSpreadsheet, 
      description: 'Excel-compatible data file',
      extension: '.csv'
    },
    { 
      value: 'json', 
      label: 'JSON Data', 
      icon: FileCode, 
      description: 'Structured data format',
      extension: '.json'
    },
    { 
      value: 'png', 
      label: 'PNG Image', 
      icon: Image, 
      description: 'High-quality chart image',
      extension: '.png'
    },
    { 
      value: 'txt', 
      label: 'Text Report', 
      icon: FileText, 
      description: 'Human-readable summary',
      extension: '.txt'
    }
  ];

  const generateCSVData = (): string => {
    const headers = [
      'Distance (km)',
      'Latitude',
      'Longitude',
      `Temperature (${units === 'metric' ? '°C' : '°F'})`,
      `Feels Like (${units === 'metric' ? '°C' : '°F'})`,
      `Wind Speed (${units === 'metric' ? 'm/s' : 'mph'})`,
      'Wind Direction (°)',
      'Wind Direction',
      `Precipitation (${units === 'metric' ? 'mm' : 'in'})`,
      'Humidity (%)',
      'Pressure (hPa)',
      'Cloud Cover (%)',
      'Weather Description',
      'Visibility (km)',
      'UV Index'
    ];

    const rows = forecasts.map(forecast => [
      forecast.routePoint.distance.toFixed(exportOptions.precision),
      forecast.routePoint.lat.toFixed(6),
      forecast.routePoint.lon.toFixed(6),
      forecast.weather.temp.toFixed(exportOptions.precision),
      forecast.weather.feels_like.toFixed(exportOptions.precision),
      forecast.weather.wind_speed.toFixed(exportOptions.precision),
      forecast.weather.wind_deg?.toString() || '0',
      forecast.weather.wind_deg ? `${Math.round(forecast.weather.wind_deg)}°` : 'N/A',
      ((forecast.weather.rain?.['1h'] || 0) + (forecast.weather.snow?.['1h'] || 0)).toFixed(exportOptions.precision),
      forecast.weather.humidity.toString(),
      forecast.weather.pressure.toString(),
      forecast.weather.clouds?.toString() || '0',
      `${forecast.weather.temp.toFixed(1)}°C conditions`,
      forecast.weather.visibility ? (forecast.weather.visibility / 1000).toFixed(1) : 'N/A',
      forecast.weather.uvi?.toFixed(1) || 'N/A'
    ]);

    let csvContent = '';
    
    if (exportOptions.includeHeaders) {
      csvContent += headers.join(',') + '\n';
    }
    
    csvContent += rows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    if (exportOptions.includeMetadata) {
      csvContent += '\n\n# Metadata\n';
      csvContent += `# Exported: ${new Date().toISOString()}\n`;
      csvContent += `# Total Points: ${forecasts.length}\n`;
      csvContent += `# Units: ${units}\n`;
      csvContent += `# Route Distance: ${forecasts[forecasts.length - 1]?.routePoint.distance.toFixed(1)} km\n`;
    }

    return csvContent;
  };

  const generateJSONData = (): string => {
    const data = {
      metadata: exportOptions.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        totalPoints: forecasts.length,
        units,
        routeDistance: forecasts[forecasts.length - 1]?.routePoint.distance || 0,
        version: '1.0.0'
      } : undefined,
      statistics: exportOptions.includeStatistics ? {
        temperature: {
          min: Math.min(...forecasts.map(f => f.weather.temp)),
          max: Math.max(...forecasts.map(f => f.weather.temp)),
          avg: forecasts.reduce((sum, f) => sum + f.weather.temp, 0) / forecasts.length
        },
        wind: {
          max: Math.max(...forecasts.map(f => f.weather.wind_speed)),
          avg: forecasts.reduce((sum, f) => sum + f.weather.wind_speed, 0) / forecasts.length
        },
        precipitation: {
          total: forecasts.reduce((sum, f) => 
            sum + (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0), 0
          )
        }
      } : undefined,
      data: forecasts.map(forecast => ({
        distance: Number(forecast.routePoint.distance.toFixed(exportOptions.precision)),
        location: {
          lat: Number(forecast.routePoint.lat.toFixed(6)),
          lon: Number(forecast.routePoint.lon.toFixed(6))
        },
        weather: {
          temperature: Number(forecast.weather.temp.toFixed(exportOptions.precision)),
          feelsLike: Number(forecast.weather.feels_like.toFixed(exportOptions.precision)),
          windSpeed: Number(forecast.weather.wind_speed.toFixed(exportOptions.precision)),
          windDirection: forecast.weather.wind_deg || 0,
          precipitation: Number(((forecast.weather.rain?.['1h'] || 0) + (forecast.weather.snow?.['1h'] || 0)).toFixed(exportOptions.precision)),
          humidity: forecast.weather.humidity,
          pressure: forecast.weather.pressure,
          cloudCover: forecast.weather.clouds || 0,
          description: `${forecast.weather.temp.toFixed(1)}°C conditions`,
          visibility: forecast.weather.visibility ? Number((forecast.weather.visibility / 1000).toFixed(1)) : null,
          uvIndex: forecast.weather.uvi ? Number(forecast.weather.uvi.toFixed(1)) : null
        }
      }))
    };

    return JSON.stringify(data, null, 2);
  };

  const generateTextReport = (): string => {
    let report = '# Weather Forecast Report\n\n';
    
    if (exportOptions.includeMetadata) {
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += `Total Data Points: ${forecasts.length}\n`;
      report += `Route Distance: ${forecasts[forecasts.length - 1]?.routePoint.distance.toFixed(1)} km\n`;
      report += `Units: ${units === 'metric' ? 'Metric' : 'Imperial'}\n\n`;
    }

    if (exportOptions.includeStatistics) {
      const tempMin = Math.min(...forecasts.map(f => f.weather.temp));
      const tempMax = Math.max(...forecasts.map(f => f.weather.temp));
      const tempAvg = forecasts.reduce((sum, f) => sum + f.weather.temp, 0) / forecasts.length;
      const windMax = Math.max(...forecasts.map(f => f.weather.wind_speed));
      const precipTotal = forecasts.reduce((sum, f) => 
        sum + (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0), 0
      );

      report += '## Summary Statistics\n\n';
      report += `Temperature Range: ${formatTemperature(tempMin, units)} to ${formatTemperature(tempMax, units)}\n`;
      report += `Average Temperature: ${formatTemperature(tempAvg, units)}\n`;
      report += `Maximum Wind Speed: ${formatWindSpeed(windMax, units)}\n`;
      report += `Total Precipitation: ${formatPrecipitation(precipTotal, units)}\n\n`;
    }

    report += '## Detailed Forecast\n\n';
    
    forecasts.forEach((forecast, index) => {
      report += `### Point ${index + 1} - ${forecast.routePoint.distance.toFixed(1)}km\n`;
      report += `Location: ${forecast.routePoint.lat.toFixed(4)}, ${forecast.routePoint.lon.toFixed(4)}\n`;
      report += `Temperature: ${formatTemperature(forecast.weather.temp, units)} (feels like ${formatTemperature(forecast.weather.feels_like, units)})\n`;
      report += `Wind: ${formatWindSpeed(forecast.weather.wind_speed, units)} from ${forecast.weather.wind_deg || 0}°\n`;
      report += `Humidity: ${forecast.weather.humidity}%\n`;
      report += `Pressure: ${formatPressure(forecast.weather.pressure)}\n`;
      report += `Conditions: ${forecast.weather.temp.toFixed(1)}°C, ${forecast.weather.humidity}% humidity\n\n`;
    });

    return report;
  };

  const exportChartAsImage = async (): Promise<void> => {
    if (!chartRef?.current) {
      toast.error('Chart reference not available');
      return;
    }

    try {
      // Use html2canvas to capture the chart
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `weather-chart-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success('Chart exported as PNG image!');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Image export error:', error);
      toast.error('Failed to export chart as image');
    }
  };

  const handleExport = async () => {
    if (!forecasts || forecasts.length === 0) {
      toast.error('No data available for export');
      return;
    }

    setIsExporting(true);

    try {
      let content: string;
      let mimeType: string;
      let filename: string;

      switch (exportOptions.format) {
        case 'csv':
          content = generateCSVData();
          mimeType = 'text/csv';
          filename = `weather-data-${Date.now()}.csv`;
          break;
        case 'json':
          content = generateJSONData();
          mimeType = 'application/json';
          filename = `weather-data-${Date.now()}.json`;
          break;
        case 'txt':
          content = generateTextReport();
          mimeType = 'text/plain';
          filename = `weather-report-${Date.now()}.txt`;
          break;
        case 'png':
          await exportChartAsImage();
          return;
        default:
          throw new Error('Unsupported export format');
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Data exported as ${exportOptions.format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormat = exportFormats.find(f => f.value === exportOptions.format);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Professional Data Export
          <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
            PRO
          </Badge>
        </CardTitle>
        <CardDescription>
          Export chart data in various formats for analysis and reporting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Export Format</label>
          <Select 
            value={exportOptions.format} 
            onValueChange={(value: ExportFormat) => 
              setExportOptions(prev => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  <div className="flex items-center gap-2">
                    <format.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{format.label}</div>
                      <div className="text-xs text-muted-foreground">{format.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export Options */}
        {(exportOptions.format === 'csv' || exportOptions.format === 'json' || exportOptions.format === 'txt') && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-sm">Export Options</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm">Include Headers</label>
                <Switch
                  checked={exportOptions.includeHeaders}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeHeaders: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">Include Metadata</label>
                <Switch
                  checked={exportOptions.includeMetadata}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeMetadata: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">Include Statistics</label>
                <Switch
                  checked={exportOptions.includeStatistics}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeStatistics: checked }))
                  }
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm">Decimal Precision</label>
                <Select 
                  value={exportOptions.precision.toString()} 
                  onValueChange={(value) => 
                    setExportOptions(prev => ({ ...prev, precision: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 decimal place</SelectItem>
                    <SelectItem value="2">2 decimal places</SelectItem>
                    <SelectItem value="3">3 decimal places</SelectItem>
                    <SelectItem value="4">4 decimal places</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Export Preview */}
        <div className="p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {selectedFormat && <selectedFormat.icon className="h-4 w-4" />}
            <span className="font-medium text-sm">Export Preview</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Format: {selectedFormat?.label}</div>
            <div>Data Points: {forecasts.length}</div>
            <div>Estimated Size: {exportOptions.format === 'png' ? '~500KB' : `~${Math.round(forecasts.length * 0.2)}KB`}</div>
            <div>Filename: weather-data-{Date.now()}{selectedFormat?.extension}</div>
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting || !forecasts.length}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedFormat?.label}
            </>
          )}
        </Button>

        {/* Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {forecasts.length > 0 ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              Ready to export {forecasts.length} data points
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 text-orange-500" />
              No data available for export
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

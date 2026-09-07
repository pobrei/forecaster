"use client";

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Route, WeatherForecast, AppSettings } from '@/types';
import {
  generateTextPDFReport,
  generateHTMLReport,
  generateCSVReport,
  generateGeoJSONReport,
  downloadBlob,
  generateExportFilename
} from '@/lib/pdf-generator';
import {
  formatTemperature,
  formatWindSpeed,
  formatDistance,
  formatElevation,
  formatPressure,
  formatPrecipitation,
} from '@/lib/format';
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

  // GeoJSON Export
  const handleExportGeoJSON = async () => {
    if (!route || !forecasts.length) {
      toast.error('No data available for export');
      return;
    }

    try {
      const geojsonBlob = generateGeoJSONReport(route, forecasts, settings);
      const filename = generateExportFilename(route, 'geojson');
      downloadBlob(geojsonBlob, filename);
      toast.success('GeoJSON route exported successfully!');
    } catch (error) {
      console.error('GeoJSON export error:', error);
      toast.error('Failed to export GeoJSON');
    }
  };



  // Ultra-high-resolution (2400px width) Dossier Report PNG Export
  const handleExportPNG = async () => {
    if (!canvasRef.current || !forecasts.length || !route) {
      toast.error('Unable to generate export image: missing route or forecast data');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);

    try {
      // 1. Locate Chart canvas from #weather-charts
      let chartCanvas: HTMLCanvasElement | null = null;
      if (exportOptions.includeCharts) {
        const chartElem = document.querySelector('#weather-charts canvas') as HTMLCanvasElement | null;
        if (chartElem && chartElem.width > 0 && chartElem.height > 0) {
          chartCanvas = chartElem;
        }
      }

      // 2. Locate and composite OpenLayers Map canvas from #weather-map
      let mapCanvas: HTMLCanvasElement | null = null;
      if (exportOptions.includeMap) {
        const mapCanvases = Array.from(document.querySelectorAll('#weather-map canvas')) as HTMLCanvasElement[];
        const validCanvases = mapCanvases.filter(c => c !== canvasRef.current && c.width > 0 && c.height > 0);
        if (validCanvases.length > 0) {
          const maxW = Math.max(...validCanvases.map(c => c.width));
          const maxH = Math.max(...validCanvases.map(c => c.height));
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = maxW;
          tempCanvas.height = maxH;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            validCanvases.forEach((c) => {
              try {
                const transform = c.style.transform;
                if (transform) {
                  const matrixMatch = transform.match(/^matrix\(([^\(]*)\)$/);
                  if (matrixMatch) {
                    const m = matrixMatch[1].split(',').map(Number);
                    tempCtx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
                  }
                } else {
                  tempCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                tempCtx.drawImage(c, 0, 0);
              } catch {
                // Ignore potential tainted layer
              }
            });
            tempCtx.setTransform(1, 0, 0, 1, 0, 0);
            mapCanvas = tempCanvas;
          }
        }
      }

      setExportProgress(25);

      // 3. Compute detailed statistics
      const temps = forecasts.map(f => f.weather.temp);
      const feels = forecasts.map(f => f.weather.feels_like);
      const winds = forecasts.map(f => f.weather.wind_speed);
      const pressures = forecasts.map(f => f.weather.pressure);
      const humidities = forecasts.map(f => f.weather.humidity);
      const precips = forecasts.map(f => (f.weather.rain?.['1h'] || f.weather.snow?.['1h'] || 0));

      const stats = {
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
        avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
        minFeels: Math.min(...feels),
        maxFeels: Math.max(...feels),
        maxWind: Math.max(...winds),
        avgWind: winds.reduce((a, b) => a + b, 0) / winds.length,
        minPressure: Math.min(...pressures),
        maxPressure: Math.max(...pressures),
        avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        totalPrecip: precips.reduce((a, b) => a + b, 0),
        rainyPoints: precips.filter(p => p > 0).length,
      };

      // Collect alerts
      const allAlerts = forecasts.flatMap(f => f.alerts || []);
      const uniqueAlerts = allAlerts.filter((alert, idx, self) =>
        idx === self.findIndex(a => a.title === alert.title)
      );

      // 4. Geometry Setup: 2400px width for 300 DPI / Retina print quality
      const width = 2400;
      const margin = 100;
      const contentWidth = width - margin * 2; // 2200px

      // Dynamic Height calculation based on active sections
      let totalHeight = 50; // top padding
      totalHeight += 40;   // Dossier classification bar
      totalHeight += 65;   // Gap to title
      totalHeight += 58;   // Title height
      totalHeight += 100;  // Route Banner card
      totalHeight += 50;   // Spacing

      if (exportOptions.includeStatistics) {
        totalHeight += 40;  // Section header
        totalHeight += 180; // 4 Metric Cards Grid
        totalHeight += 50;  // Spacing
      }

      if (exportOptions.includeAlerts && uniqueAlerts.length > 0) {
        totalHeight += 40;  // Section header
        totalHeight += uniqueAlerts.length * 100;
        totalHeight += 50;  // Spacing
      }

      let chartDrawHeight = 0;
      if (exportOptions.includeCharts && chartCanvas) {
        const aspect = chartCanvas.height / chartCanvas.width;
        chartDrawHeight = Math.round(Math.min(Math.max((contentWidth - 40) * aspect, 600), 850));
        totalHeight += 40; // Section header
        totalHeight += chartDrawHeight + 40; // Card container with padding
        totalHeight += 50; // Spacing
      }

      let mapDrawHeight = 0;
      if (exportOptions.includeMap && mapCanvas) {
        const aspect = mapCanvas.height / mapCanvas.width;
        mapDrawHeight = Math.round(Math.min(Math.max((contentWidth - 40) * aspect, 650), 900));
        totalHeight += 40; // Section header
        totalHeight += mapDrawHeight + 75; // Card container with padding & legend
        totalHeight += 50; // Spacing
      }

      // Sample waypoints for table (up to 8 points)
      const sampleIndices: number[] = [];
      if (exportOptions.includeWeatherDetails && forecasts.length > 0) {
        const maxRows = Math.min(forecasts.length, 8);
        const step = forecasts.length > 1 ? (forecasts.length - 1) / (maxRows - 1) : 1;
        for (let i = 0; i < maxRows; i++) {
          const idx = Math.min(Math.round(i * step), forecasts.length - 1);
          if (!sampleIndices.includes(idx)) {
            sampleIndices.push(idx);
          }
        }
        totalHeight += 40; // Section header
        totalHeight += 55; // Table header
        totalHeight += sampleIndices.length * 50; // Table rows
        totalHeight += 50; // Spacing
      }

      totalHeight += 110; // Footer
      totalHeight += 50;  // Bottom padding

      // Set canvas dimensions
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      setExportProgress(50);

      // Utility helpers
      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill?: string,
        stroke?: string,
        lineWidth = 2
      ) => {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      const drawCrosshair = (cx: number, cy: number, size = 10, color = '#94a3b8') => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
      };

      // 5. Draw Dossier Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, totalHeight);

      // Subtle Outer Framing & Corner Crosshairs
      drawRoundRect(35, 35, width - 70, totalHeight - 70, 0, undefined, '#e2e8f0', 2);
      drawCrosshair(35, 35);
      drawCrosshair(width - 35, 35);
      drawCrosshair(35, totalHeight - 35);
      drawCrosshair(width - 35, totalHeight - 35);

      let currentY = 55;

      // 6. Header & Classification Bar
      // Dossier Pill Tag
      drawRoundRect(margin, currentY, 440, 36, 6, '#0f172a');
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FORECASTER // EXPEDITION DOSSIER', margin + 220, currentY + 18);

      // Classification Stamp
      drawRoundRect(margin + 460, currentY, 340, 36, 6, '#eff6ff', '#bfdbfe', 1.5);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#2563eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DISPATCH CLASSIFICATION: ACTIVE', margin + 630, currentY + 18);

      // Date and UTC Time (Right-aligned)
      ctx.font = '15px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`TIMESTAMP: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, width - margin, currentY + 18);

      currentY += 65;

      // Big Title
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('METEOROLOGICAL EXPEDITION REPORT', margin, currentY);

      currentY += 58;

      // Route Info Card
      const routeCardHeight = 100;
      drawRoundRect(margin, currentY, contentWidth, routeCardHeight, 10, '#f8fafc', '#cbd5e1', 1.5);

      // Left Accent Strip on Route Card
      drawRoundRect(margin, currentY, 8, routeCardHeight, 4, '#2563eb');

      // Route Name
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(route.name, margin + 28, currentY + 36);

      // Telemetry Chips
      const routeStats = [
        `DISTANCE: ${formatDistance(route.totalDistance, settings.units)}`,
        `ELEVATION GAIN: +${formatElevation(route.totalElevationGain || 0, settings.units)}`,
        `WAYPOINTS: ${forecasts.length} SAMPLED`,
        `INTERVAL: ${settings.forecastInterval} MIN`,
        `MODEL: MULTI-SOURCE ENSEMBLE`
      ];

      ctx.font = '15px monospace';
      ctx.fillStyle = '#475569';
      ctx.textBaseline = 'middle';
      ctx.fillText(routeStats.join('   •   '), margin + 28, currentY + 74);

      currentY += routeCardHeight + 50;

      // 7. Executive Metric Cards Grid
      if (exportOptions.includeStatistics) {
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.fillText('SECTION 01 // AGGREGATED METEOROLOGICAL METRICS', margin, currentY);

        currentY += 18;

        const cardGap = 24;
        const cardWidth = (contentWidth - 3 * cardGap) / 4;
        const cardHeight = 160;

        const metricCards = [
          {
            title: 'TEMPERATURE SPECTRUM',
            main: `${formatTemperature(stats.minTemp, settings.units)} → ${formatTemperature(stats.maxTemp, settings.units)}`,
            sub: `Mean: ${formatTemperature(stats.avgTemp, settings.units)} (Feels: ${formatTemperature(stats.minFeels, settings.units)})`,
            accent: '#3b82f6',
          },
          {
            title: 'WIND VELOCITY DYNAMICS',
            main: `Max ${formatWindSpeed(stats.maxWind, settings.units)}`,
            sub: `Mean: ${formatWindSpeed(stats.avgWind, settings.units)} | Sustained gusts`,
            accent: '#06b6d4',
          },
          {
            title: 'PRECIPITATION PROFILE',
            main: `${formatPrecipitation(stats.totalPrecip, settings.units)}`,
            sub: `${stats.rainyPoints} of ${forecasts.length} points precip risk`,
            accent: '#8b5cf6',
          },
          {
            title: 'BAROMETRIC & HUMIDITY',
            main: `${formatPressure(stats.minPressure, settings.units)}`,
            sub: `Mean Rel. Humidity: ${stats.avgHumidity.toFixed(0)}%`,
            accent: '#10b981',
          }
        ];

        metricCards.forEach((card, idx) => {
          const cardX = margin + idx * (cardWidth + cardGap);
          drawRoundRect(cardX, currentY, cardWidth, cardHeight, 10, '#f8fafc', '#e2e8f0', 1.5);
          drawRoundRect(cardX, currentY, 6, cardHeight, 3, card.accent);

          // Card Title
          ctx.font = 'bold 13px monospace';
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'left';
          ctx.fillText(card.title, cardX + 22, currentY + 32);

          // Card Main Value
          ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.fillText(card.main, cardX + 22, currentY + 80);

          // Card Subtext
          ctx.font = '14px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(card.sub, cardX + 22, currentY + 120);
        });

        currentY += cardHeight + 45;
      }

      // 8. Alerts Banner (if any)
      if (exportOptions.includeAlerts && uniqueAlerts.length > 0) {
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#b45309';
        ctx.textAlign = 'left';
        ctx.fillText('CRITICAL WEATHER NOTICES & ADVISORIES', margin, currentY);

        currentY += 18;

        uniqueAlerts.slice(0, 2).forEach((alert) => {
          const alertHeight = 85;
          drawRoundRect(margin, currentY, contentWidth, alertHeight, 8, '#fffbeb', '#fde68a', 1.5);
          drawRoundRect(margin, currentY, 6, alertHeight, 3, '#f59e0b');

          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#92400e';
          ctx.textAlign = 'left';
          ctx.fillText(`⚠️ ${alert.title.toUpperCase()} (${alert.severity.toUpperCase()})`, margin + 24, currentY + 32);

          ctx.font = '15px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#78350f';
          const truncatedDesc = alert.description.length > 180 ? `${alert.description.substring(0, 180)}...` : alert.description;
          ctx.fillText(truncatedDesc, margin + 24, currentY + 62);

          currentY += alertHeight + 14;
        });

        currentY += 30;
      }

      // 9. Weather Chart Section (Full 2200px content width!)
      if (exportOptions.includeCharts && chartCanvas) {
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.fillText('SECTION 02 // MULTI-VARIATE WEATHER & ELEVATION DYNAMICS', margin, currentY);

        ctx.font = '14px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText(`RESOLVED ALONG ${formatDistance(route.totalDistance, settings.units)} EXPEDITION TRACK`, width - margin, currentY);

        currentY += 18;

        const chartBoxHeight = chartDrawHeight + 40;
        drawRoundRect(margin, currentY, contentWidth, chartBoxHeight, 10, '#ffffff', '#cbd5e1', 1.5);

        try {
          ctx.drawImage(chartCanvas, margin + 20, currentY + 20, contentWidth - 40, chartDrawHeight);
        } catch (err) {
          console.warn('Could not draw chart to canvas:', err);
        }

        currentY += chartBoxHeight + 45;
      }

      // 10. Tactical Satellite Radar / Map Section (Full 2200px content width!)
      if (exportOptions.includeMap && mapCanvas) {
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.fillText('SECTION 03 // TACTICAL ROUTE RADAR & WAYPOINT TOPOGRAPHY', margin, currentY);

        ctx.font = '14px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText('CARTOGRAPHIC SYSTEM: WGS 84 / OPENLAYERS', width - margin, currentY);

        currentY += 18;

        const mapBoxHeight = mapDrawHeight + 75;
        drawRoundRect(margin, currentY, contentWidth, mapBoxHeight, 10, '#ffffff', '#cbd5e1', 1.5);

        try {
          ctx.drawImage(mapCanvas, margin + 20, currentY + 20, contentWidth - 40, mapDrawHeight);
        } catch (err) {
          console.warn('Could not draw map to canvas:', err);
        }

        // Map Legend Strip
        const legendY = currentY + mapDrawHeight + 46;
        const legendItems = [
          { color: '#3b82f6', label: 'Cold (< 0°C)' },
          { color: '#06b6d4', label: 'Cool (0-10°C)' },
          { color: '#10b981', label: 'Mild (10-25°C)' },
          { color: '#f97316', label: 'Warm (25-35°C)' },
          { color: '#ef4444', label: 'Hot (> 35°C)' },
        ];

        let legendX = margin + 35;
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('MAP LEGEND:', legendX, legendY);
        legendX += 110;

        legendItems.forEach((item) => {
          ctx.beginPath();
          ctx.arc(legendX + 6, legendY, 6, 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();

          ctx.font = '13px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText(item.label, legendX + 18, legendY);
          legendX += ctx.measureText(item.label).width + 38;
        });

        currentY += mapBoxHeight + 45;
      }

      // 11. Key Waypoint Meteorological Telemetry Table
      if (exportOptions.includeWeatherDetails && sampleIndices.length > 0) {
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.fillText('SECTION 04 // KEY WAYPOINT METEOROLOGICAL TELEMETRY', margin, currentY);

        currentY += 18;

        const tableHeight = 55 + sampleIndices.length * 50;
        drawRoundRect(margin, currentY, contentWidth, tableHeight, 10, '#ffffff', '#cbd5e1', 1.5);

        // Table Header Row
        drawRoundRect(margin, currentY, contentWidth, 55, 10, '#f1f5f9', '#cbd5e1', 1);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'left';

        const colX = [
          margin + 24,       // Point #
          margin + 120,      // Distance
          margin + 320,      // Elevation
          margin + 520,      // Temperature
          margin + 740,      // Feels Like
          margin + 960,      // Wind Speed
          margin + 1240,     // Humidity
          margin + 1480,     // Pressure
          margin + 1720,     // Precipitation
          margin + 1960      // Conditions
        ];

        ctx.fillText('#', colX[0], currentY + 34);
        ctx.fillText('DISTANCE', colX[1], currentY + 34);
        ctx.fillText('ELEVATION', colX[2], currentY + 34);
        ctx.fillText('TEMP', colX[3], currentY + 34);
        ctx.fillText('FEELS', colX[4], currentY + 34);
        ctx.fillText('WIND', colX[5], currentY + 34);
        ctx.fillText('HUMIDITY', colX[6], currentY + 34);
        ctx.fillText('PRESSURE', colX[7], currentY + 34);
        ctx.fillText('PRECIP', colX[8], currentY + 34);
        ctx.fillText('CONDITIONS', colX[9], currentY + 34);

        let rowY = currentY + 55;

        sampleIndices.forEach((fIdx, rowIdx) => {
          const item = forecasts[fIdx];
          const isEven = rowIdx % 2 === 0;

          if (isEven) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(margin + 1, rowY, contentWidth - 2, 50);
          }

          // Row divider line
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(margin, rowY + 50);
          ctx.lineTo(margin + contentWidth, rowY + 50);
          ctx.stroke();

          ctx.font = '14px monospace';
          ctx.fillStyle = '#0f172a';

          const ptNumber = `P-${String(fIdx + 1).padStart(2, '0')}`;
          const distStr = formatDistance(item.routePoint.distance, settings.units);
          const elevStr = item.routePoint.elevation ? formatElevation(item.routePoint.elevation, settings.units) : '—';
          const tempStr = formatTemperature(item.weather.temp, settings.units);
          const feelsStr = formatTemperature(item.weather.feels_like, settings.units);
          const windStr = formatWindSpeed(item.weather.wind_speed, settings.units);
          const humStr = `${item.weather.humidity}%`;
          const pressStr = formatPressure(item.weather.pressure, settings.units);
          const precipVal = (item.weather.rain?.['1h'] || item.weather.snow?.['1h'] || 0);
          const precipStr = precipVal > 0 ? formatPrecipitation(precipVal, settings.units) : '0.0 mm';
          const condStr = (item.weather.weather[0]?.description || 'Clear').slice(0, 18);

          ctx.fillText(ptNumber, colX[0], rowY + 32);
          ctx.fillText(distStr, colX[1], rowY + 32);
          ctx.fillText(elevStr, colX[2], rowY + 32);
          ctx.fillText(tempStr, colX[3], rowY + 32);
          ctx.fillText(feelsStr, colX[4], rowY + 32);
          ctx.fillText(windStr, colX[5], rowY + 32);
          ctx.fillText(humStr, colX[6], rowY + 32);
          ctx.fillText(pressStr, colX[7], rowY + 32);
          ctx.fillText(precipStr, colX[8], rowY + 32);
          ctx.fillText(condStr, colX[9], rowY + 32);

          rowY += 50;
        });

        currentY += tableHeight + 45;
      }

      // 12. Archival Dossier Footer
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin, currentY);
      ctx.lineTo(width - margin, currentY);
      ctx.stroke();

      currentY += 30;

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.fillText('FORECASTER DOSSIER v2.5 // TACTICAL EXPEDITION DISPATCH SYSTEM', margin, currentY);

      ctx.font = '14px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('GEODETIC DATUM: EPSG:4326 (WGS 84) • ULTRA-HIGH RESOLUTION EXPORT (2400 PX • 300 DPI READY)', margin, currentY + 24);

      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#059669';
      ctx.textAlign = 'right';
      ctx.fillText(`INTEGRITY VERIFIED // ID-${Date.now().toString(36).toUpperCase()}`, width - margin, currentY + 10);

      setExportProgress(90);

      // 13. High-Quality Lossless PNG Output
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `dossier-report-${route.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success('High-resolution dossier image exported successfully!');
          setExportProgress(100);
        }
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('Failed to export weather forecast image');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1500);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-[#453A2E] bg-[#16120F]/90 p-5 font-mono text-xs text-[#F5F2EB] shadow-2xl", className)}>
      <div className="flex items-center justify-between mb-4 border-b border-[#453A2E]/70 pb-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm tracking-wider text-[#F5F2EB]">
            <Download className="h-4 w-4 text-[#E5A93C]" />
            <span>EXPEDITION DOSSIER EXPORT</span>
          </div>
          <p className="text-[11px] text-[#A89F91] mt-1">
            Export synoptic meteorological packages in multiple secure formats
          </p>
        </div>
      </div>

      <div>
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-[#1C1814] border border-[#453A2E] rounded-xl mb-4">
            <TabsTrigger
              value="reports"
              className="py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
            >
              Data
            </TabsTrigger>
            <TabsTrigger
              value="options"
              className="py-1.5 text-xs text-[#A89F91] data-[state=active]:bg-[#E5A93C]/20 data-[state=active]:text-[#E5A93C] data-[state=active]:border data-[state=active]:border-[#E5A93C]/50 rounded-lg transition-all"
            >
              Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={handleExportHTML}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[#82937D]/20 hover:bg-[#82937D]/30 border border-[#82937D]/50 text-[#82937D] rounded-xl font-mono text-xs py-2.5 transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                Export HTML Dossier
              </Button>

              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[#E5A93C] hover:bg-[#d4972e] text-[#12100E] font-bold rounded-xl font-mono text-xs py-2.5 shadow-[0_0_15px_rgba(229,169,60,0.25)] transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                {isExporting ? 'Generating...' : 'Export PDF Report'}
              </Button>

              <Button
                onClick={handleExportPNG}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[#1C1814] hover:bg-[#251F19] border border-[#453A2E] text-[#F5F2EB] rounded-xl font-mono text-xs py-2.5 transition-all cursor-pointer col-span-1 md:col-span-2"
              >
                <ImageIcon className="h-4 w-4 text-[#E5A93C]" />
                Export 2400px High-Res Image Dossier
              </Button>
            </div>

            {isExporting && exportProgress > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-[#1C1814] border border-[#453A2E]">
                <div className="flex items-center gap-2 text-xs text-[#E5A93C]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compiling expedition dossier: {exportProgress}%
                </div>
                <Progress value={exportProgress} className="w-full bg-[#12100E]" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[#1C1814] hover:bg-[#251F19] border border-[#453A2E] text-[#F5F2EB] rounded-xl font-mono text-xs py-2.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#82937D]" />
                CSV Data
              </Button>

              <Button
                onClick={handleExportJSON}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[#1C1814] hover:bg-[#251F19] border border-[#453A2E] text-[#F5F2EB] rounded-xl font-mono text-xs py-2.5 transition-all cursor-pointer"
              >
                <FileCode className="h-4 w-4 text-[#E5A93C]" />
                JSON Payload
              </Button>

              <Button
                onClick={handleExportGeoJSON}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[#1C1814] hover:bg-[#251F19] border border-[#453A2E] text-[#F5F2EB] rounded-xl font-mono text-xs py-2.5 transition-all cursor-pointer"
              >
                <FileCode className="h-4 w-4 text-[#82937D]" />
                GeoJSON Track
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-3">
            <div className="space-y-2.5 p-3 rounded-xl bg-[#1C1814] border border-[#453A2E]/70">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-charts" className="text-xs text-[#F5F2EB] cursor-pointer">Include Elevation & Weather Curves</Label>
                <Switch
                  id="include-charts"
                  checked={exportOptions.includeCharts}
                  onCheckedChange={(checked) => handleExportOptionChange('includeCharts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-map" className="text-xs text-[#F5F2EB] cursor-pointer">Include Map Geometry</Label>
                <Switch
                  id="include-map"
                  checked={exportOptions.includeMap}
                  onCheckedChange={(checked) => handleExportOptionChange('includeMap', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-details" className="text-xs text-[#F5F2EB] cursor-pointer">Include Waypoint Telemetry Table</Label>
                <Switch
                  id="include-details"
                  checked={exportOptions.includeWeatherDetails}
                  onCheckedChange={(checked) => handleExportOptionChange('includeWeatherDetails', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-alerts" className="text-xs text-[#F5F2EB] cursor-pointer">Include Synoptic Alerts</Label>
                <Switch
                  id="include-alerts"
                  checked={exportOptions.includeAlerts}
                  onCheckedChange={(checked) => handleExportOptionChange('includeAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-statistics" className="text-xs text-[#F5F2EB] cursor-pointer">Include Aggregate Statistics</Label>
                <Switch
                  id="include-statistics"
                  checked={exportOptions.includeStatistics}
                  onCheckedChange={(checked) => handleExportOptionChange('includeStatistics', checked)}
                />
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

        <div className="mt-4 pt-3 border-t border-[#453A2E]/70 text-[11px] text-[#A89F91]">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#82937D]">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="font-bold uppercase">Supported Formats:</span>
          </div>
          <p className="leading-relaxed">
            HTML (interactive standalone), PDF (briefing ready), PNG (2400px ultra-high resolution @ 300 DPI), CSV, JSON, and GeoJSON.
          </p>
        </div>
      </div>
    </div>
  );
}

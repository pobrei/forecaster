import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Route, WeatherForecast, AppSettings, ExportOptions } from '@/types';
import { formatTemperature, formatWindSpeed, formatDistance, formatDateTime, formatPrecipitation } from './format';
import { EXPORT_CONFIG } from './constants';

/**
 * Generate PDF report from route and weather data
 */
export async function generatePDFReport(
  route: Route,
  forecasts: WeatherForecast[],
  settings: AppSettings,
  options: ExportOptions = {
    includeMap: true,
    includeCharts: true,
    includeWeatherDetails: true,
    includeAlerts: true,
    format: 'pdf'
  }
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: EXPORT_CONFIG.PDF.ORIENTATION,
    unit: 'mm',
    format: EXPORT_CONFIG.PDF.FORMAT,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = EXPORT_CONFIG.PDF.MARGIN;
  let currentY = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }
  };

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (fontSize * 0.35); // Approximate line height
  };

  try {
    // Title Page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Weather Forecast Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text(route.name, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    pdf.setFontSize(12);
    pdf.text(`Generated on ${formatDateTime(new Date())}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    // Route Summary
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Route Summary', margin, currentY);
    currentY += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Total Distance:', `${formatDistance(route.totalDistance, settings.units)}`],
      ['Route Points:', `${route.points.length}`],
      ['Forecast Points:', `${forecasts.length}`],
      ['Start Time:', formatDateTime(settings.startTime)],
      ['Average Speed:', `${settings.averageSpeed} km/h`],
      ['Forecast Interval:', `${settings.forecastInterval} km`],
    ];

    if (route.totalElevationGain) {
      summaryData.push(['Elevation Gain:', `${Math.round(route.totalElevationGain)}m`]);
    }

    if (route.estimatedDuration) {
      const hours = Math.floor(route.estimatedDuration);
      const minutes = Math.round((route.estimatedDuration - hours) * 60);
      summaryData.push(['Estimated Duration:', `${hours}h ${minutes}m`]);
    }

    summaryData.forEach(([label, value]) => {
      pdf.text(label, margin, currentY);
      pdf.text(value, margin + 60, currentY);
      currentY += 6;
    });

    currentY += 10;

    // Weather Summary
    if (forecasts.length > 0) {
      checkPageBreak(40);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Weather Summary', margin, currentY);
      currentY += 10;

      const temps = forecasts.map(f => f.weather.temp);
      const winds = forecasts.map(f => f.weather.wind_speed);
      const totalAlerts = forecasts.reduce((sum, f) => sum + (f.alerts?.length || 0), 0);

      const weatherSummary = [
        ['Temperature Range:', `${formatTemperature(Math.min(...temps), settings.units)} to ${formatTemperature(Math.max(...temps), settings.units)}`],
        ['Average Temperature:', formatTemperature(temps.reduce((a, b) => a + b, 0) / temps.length, settings.units)],
        ['Wind Speed Range:', `${formatWindSpeed(Math.min(...winds), settings.units)} to ${formatWindSpeed(Math.max(...winds), settings.units)}`],
        ['Weather Alerts:', `${totalAlerts}`],
      ];

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      weatherSummary.forEach(([label, value]) => {
        pdf.text(label, margin, currentY);
        pdf.text(value, margin + 60, currentY);
        currentY += 6;
      });

      currentY += 15;
    }

    // Weather Alerts Section
    if (options.includeAlerts && forecasts.some(f => f.alerts && f.alerts.length > 0)) {
      checkPageBreak(50);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Weather Alerts', margin, currentY);
      currentY += 10;

      forecasts.forEach((forecast) => {
        if (forecast.alerts && forecast.alerts.length > 0) {
          checkPageBreak(30);
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${formatDistance(forecast.routePoint.distance, settings.units)}:`, margin, currentY);
          currentY += 6;

          forecast.alerts.forEach(alert => {
            pdf.setFont('helvetica', 'normal');
            const alertText = `• ${alert.title}: ${alert.description}`;
            const textHeight = addText(alertText, margin + 5, currentY, pageWidth - margin * 2 - 5, 10);
            currentY += textHeight + 2;
          });
          
          currentY += 5;
        }
      });
    }

    // Detailed Weather Data
    if (options.includeWeatherDetails) {
      checkPageBreak(50);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Weather Forecast', margin, currentY);
      currentY += 10;

      forecasts.forEach((forecast) => {
        checkPageBreak(25);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${formatDistance(forecast.routePoint.distance, settings.units)}`, margin, currentY);
        
        if (forecast.routePoint.estimatedTime) {
          pdf.setFont('helvetica', 'normal');
          pdf.text(`(${formatDateTime(forecast.routePoint.estimatedTime)})`, margin + 30, currentY);
        }
        
        currentY += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        const weatherDetails = [
          `Temperature: ${formatTemperature(forecast.weather.temp, settings.units)} (feels like ${formatTemperature(forecast.weather.feels_like, settings.units)})`,
          `Condition: ${forecast.weather.weather[0]?.description || 'Unknown'}`,
          `Wind: ${formatWindSpeed(forecast.weather.wind_speed, settings.units)}`,
          `Humidity: ${forecast.weather.humidity}%`,
          `Pressure: ${forecast.weather.pressure} hPa`,
        ];

        if (forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) {
          const precip = forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h'] || 0;
          weatherDetails.push(`Precipitation: ${formatPrecipitation(precip, settings.units)}/h`);
        }

        weatherDetails.forEach(detail => {
          pdf.text(detail, margin + 5, currentY);
          currentY += 4;
        });

        currentY += 3;
      });
    }

    // Footer
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Generated by Forecaster - Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF report');
  }
}

/**
 * Capture element as image for PDF inclusion
 */
export async function captureElementAsImage(
  elementId: string,
  options: {
    width?: number;
    height?: number;
    scale?: number;
  } = {}
): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with ID "${elementId}" not found`);
      return null;
    }

    const canvas = await html2canvas(element, {
      scale: options.scale || EXPORT_CONFIG.IMAGE.SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: options.width,
      height: options.height,
    });

    return canvas.toDataURL('image/png', EXPORT_CONFIG.IMAGE.QUALITY);
  } catch (error) {
    console.error('Error capturing element as image:', error);
    return null;
  }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename for export
 */
export function generateExportFilename(route: Route, format: 'pdf' | 'json' = 'pdf'): string {
  const sanitizedName = route.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `forecaster_${sanitizedName}_${timestamp}.${format}`;
}

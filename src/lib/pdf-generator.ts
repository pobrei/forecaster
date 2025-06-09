import jsPDF from 'jspdf';
import { Route, WeatherForecast, AppSettings, ExportOptions } from '@/types';
import { formatTemperature, formatWindSpeed, formatDistance, formatDateTime, formatPrecipitation, formatWindDirection, getWindDirectionArrow } from './format';
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

    return pdf.output('blob');
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF report');
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
 * Generate CSV report from route and weather data
 */
export function generateCSVReport(
  route: Route,
  forecasts: WeatherForecast[],
  settings: AppSettings
): Blob {
  const headers = [
    'Distance (km)',
    'Latitude',
    'Longitude',
    'Estimated Time',
    'Temperature (°C)',
    'Weather Condition',
    'Wind Speed (km/h)',
    'Humidity (%)',
    'Pressure (hPa)',
    'Precipitation (mm/h)',
    'Alerts'
  ];

  const rows = forecasts.map(forecast => [
    forecast.routePoint.distance.toFixed(2),
    forecast.routePoint.lat.toFixed(6),
    forecast.routePoint.lon.toFixed(6),
    forecast.routePoint.estimatedTime ? formatDateTime(forecast.routePoint.estimatedTime) : '',
    forecast.weather.temp.toFixed(1),
    forecast.weather.weather[0]?.description || '',
    forecast.weather.wind_speed.toFixed(1),
    forecast.weather.humidity.toString(),
    forecast.weather.pressure.toString(),
    ((forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) || 0).toFixed(1),
    forecast.alerts?.map(alert => alert.title).join('; ') || ''
  ]);

  const csvContent = [
    `# Weather Forecast Report for ${route.name}`,
    `# Generated on ${formatDateTime(new Date())}`,
    `# Route Distance: ${formatDistance(route.totalDistance, settings.units)}`,
    `# Total Points: ${forecasts.length}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate HTML report from route and weather data
 */
export function generateHTMLReport(
  route: Route,
  forecasts: WeatherForecast[],
  settings: AppSettings
): Blob {
  const totalAlerts = forecasts.reduce((sum, f) => sum + (f.alerts?.length || 0), 0);
  const temps = forecasts.map(f => f.weather.temp);
  const winds = forecasts.map(f => f.weather.wind_speed);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Forecast Report - ${route.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
        .header h1 { color: #3b82f6; margin: 0; }
        .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .forecast-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .forecast-table th, .forecast-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .forecast-table th { background: #f3f4f6; font-weight: 600; color: #374151; }
        .forecast-table tr:hover { background: #f9fafb; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 10px 0; }
        .alert-title { font-weight: 600; color: #dc2626; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Weather Forecast Report</h1>
        <h2>${route.name}</h2>
        <p>Generated on ${formatDateTime(new Date())}</p>
    </div>

    <div class="summary">
        <h3>Route Summary</h3>
        <p><strong>Total Distance:</strong> ${formatDistance(route.totalDistance, settings.units)}</p>
        <p><strong>Forecast Points:</strong> ${forecasts.length}</p>
        <p><strong>Temperature Range:</strong> ${formatTemperature(Math.min(...temps), settings.units)} to ${formatTemperature(Math.max(...temps), settings.units)}</p>
        <p><strong>Weather Alerts:</strong> ${totalAlerts} alerts</p>
    </div>

    <div class="footer" style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 0.9em;">
        <p>Generated by Forecaster - Weather Planning Application</p>
    </div>
</body>
</html>`;

  return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
}

/**
 * Generate filename for export
 */
export function generateExportFilename(route: Route, format: 'pdf' | 'json' | 'csv' | 'html' = 'pdf'): string {
  const sanitizedName = route.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `forecaster_${sanitizedName}_${timestamp}.${format}`;
}

/**
 * Generate text-based PDF without image capture
 */
export function generateTextPDFReport(
  route: Route,
  forecasts: WeatherForecast[],
  settings: AppSettings
): Blob {
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

  const routeInfo = [
    ['Total Distance:', formatDistance(route.totalDistance, settings.units)],
    ['Total Points:', route.points.length.toString()],
    ['Forecast Points:', forecasts.length.toString()],
    ['Start Time:', formatDateTime(settings.startTime)],
    ['Average Speed:', `${settings.averageSpeed} km/h`],
  ];

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');

  routeInfo.forEach(([label, value]) => {
    pdf.text(label, margin, currentY);
    pdf.text(value, margin + 60, currentY);
    currentY += 6;
  });

  currentY += 15;

  // Weather Summary
  if (forecasts.length > 0) {
    checkPageBreak(50);

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

  // Detailed Weather Data
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
      `Wind: ${formatWindSpeed(forecast.weather.wind_speed, settings.units)}${forecast.weather.wind_deg ? ` ${getWindDirectionArrow(forecast.weather.wind_deg)} ${formatWindDirection(forecast.weather.wind_deg)} (${forecast.weather.wind_deg}°)` : ''}`,
      `Humidity: ${forecast.weather.humidity}%`,
      `Pressure: ${forecast.weather.pressure} hPa`,
    ];

    if (forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) {
      const precip = forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h'] || 0;
      weatherDetails.push(`Precipitation: ${formatPrecipitation(precip, settings.units)}/h`);
    }

    if (forecast.alerts && forecast.alerts.length > 0) {
      weatherDetails.push(`⚠️ ALERTS: ${forecast.alerts.map(a => a.title).join(', ')}`);
    }

    weatherDetails.forEach(detail => {
      pdf.text(detail, margin + 5, currentY);
      currentY += 4;
    });

    currentY += 3;
  });

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

  return new Blob([pdf.output('blob')], { type: 'application/pdf' });
}
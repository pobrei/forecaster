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

    // Note about visual elements
    if (options.includeMap || options.includeCharts) {
      checkPageBreak(30);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Visual Elements Note', margin, currentY);
      currentY += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('For maps and charts, please use the HTML export option which can be printed to PDF.', margin, currentY);
      currentY += 6;
      pdf.text('This text-based PDF focuses on weather data and route information.', margin, currentY);
      currentY += 15;
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

// Removed problematic html2canvas image capture function
// Use HTML export for visual elements instead

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
    'Feels Like (°C)',
    'Weather Condition',
    'Wind Speed (km/h)',
    'Wind Direction (°)',
    'Wind Direction (Cardinal)',
    'Wind Direction (Arrow)',
    'Humidity (%)',
    'Pressure (hPa)',
    'Precipitation (mm/h)',
    'Visibility (km)',
    'UV Index',
    'Alerts'
  ];

  const rows = forecasts.map(forecast => [
    forecast.routePoint.distance.toFixed(2),
    forecast.routePoint.lat.toFixed(6),
    forecast.routePoint.lon.toFixed(6),
    forecast.routePoint.estimatedTime ? formatDateTime(forecast.routePoint.estimatedTime) : '',
    forecast.weather.temp.toFixed(1),
    forecast.weather.feels_like.toFixed(1),
    forecast.weather.weather[0]?.description || '',
    forecast.weather.wind_speed.toFixed(1),
    forecast.weather.wind_deg?.toString() || '',
    forecast.weather.wind_deg ? formatWindDirection(forecast.weather.wind_deg) : '',
    forecast.weather.wind_deg ? getWindDirectionArrow(forecast.weather.wind_deg) : '',
    forecast.weather.humidity.toString(),
    forecast.weather.pressure.toString(),
    ((forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) || 0).toFixed(1),
    (forecast.weather.visibility / 1000).toFixed(1),
    forecast.weather.uvi?.toFixed(1) || '',
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
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .summary-item strong { color: #1e40af; }
        .forecast-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .forecast-table th, .forecast-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .forecast-table th { background: #f3f4f6; font-weight: 600; color: #374151; }
        .forecast-table tr:hover { background: #f9fafb; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 10px 0; }
        .alert-title { font-weight: 600; color: #dc2626; }
        .weather-icon { font-size: 1.2em; }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
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
        <div class="summary-grid">
            <div class="summary-item">
                <strong>Total Distance:</strong><br>
                ${formatDistance(route.totalDistance, settings.units)}
            </div>
            <div class="summary-item">
                <strong>Forecast Points:</strong><br>
                ${forecasts.length}
            </div>
            <div class="summary-item">
                <strong>Temperature Range:</strong><br>
                ${formatTemperature(Math.min(...temps), settings.units)} to ${formatTemperature(Math.max(...temps), settings.units)}
            </div>
            <div class="summary-item">
                <strong>Wind Speed Range:</strong><br>
                ${formatWindSpeed(Math.min(...winds), settings.units)} to ${formatWindSpeed(Math.max(...winds), settings.units)}
            </div>
            <div class="summary-item">
                <strong>Weather Alerts:</strong><br>
                ${totalAlerts} alerts
            </div>
        </div>
    </div>

    ${totalAlerts > 0 ? `
    <div class="alerts-section">
        <h3>Weather Alerts</h3>
        ${forecasts.filter(f => f.alerts && f.alerts.length > 0).map(forecast =>
          forecast.alerts!.map(alert => `
            <div class="alert">
                <div class="alert-title">${alert.title}</div>
                <div>${alert.description}</div>
                <small>At ${formatDistance(forecast.routePoint.distance, settings.units)}</small>
            </div>
          `).join('')
        ).join('')}
    </div>
    ` : ''}

    <div class="forecast-section">
        <h3>Detailed Weather Forecast</h3>
        <table class="forecast-table">
            <thead>
                <tr>
                    <th>Distance</th>
                    <th>Time</th>
                    <th>Weather</th>
                    <th>Temperature</th>
                    <th>Wind Speed</th>
                    <th>Wind Direction</th>
                    <th>Humidity</th>
                    <th>Precipitation</th>
                </tr>
            </thead>
            <tbody>
                ${forecasts.map(forecast => `
                    <tr>
                        <td>${formatDistance(forecast.routePoint.distance, settings.units)}</td>
                        <td>${forecast.routePoint.estimatedTime ? formatDateTime(forecast.routePoint.estimatedTime) : '-'}</td>
                        <td>
                            <span class="weather-icon">${getWeatherIcon(forecast.weather)}</span>
                            ${forecast.weather.weather[0]?.description || 'Unknown'}
                        </td>
                        <td>${formatTemperature(forecast.weather.temp, settings.units)}</td>
                        <td>${formatWindSpeed(forecast.weather.wind_speed, settings.units)}</td>
                        <td>
                            ${forecast.weather.wind_deg ? `${getWindDirectionArrow(forecast.weather.wind_deg)} ${formatWindDirection(forecast.weather.wind_deg)} (${forecast.weather.wind_deg}°)` : 'N/A'}
                        </td>
                        <td>${forecast.weather.humidity}%</td>
                        <td>${formatPrecipitation((forecast.weather.rain?.['1h'] || forecast.weather.snow?.['1h']) || 0, settings.units)}/h</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer" style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 0.9em;">
        <p>Generated by Forecaster - Weather Planning Application</p>
        <p class="no-print">You can print this page to PDF using your browser's print function (Ctrl+P or Cmd+P)</p>
    </div>
</body>
</html>`;

  return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
}

// Helper function to get weather icon
function getWeatherIcon(weather: any): string {
  const condition = weather.weather[0]?.main?.toLowerCase() || '';
  const iconMap: { [key: string]: string } = {
    'clear': '☀️',
    'clouds': '☁️',
    'rain': '🌧️',
    'drizzle': '🌦️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'mist': '🌫️',
    'fog': '🌫️',
    'haze': '🌫️'
  };
  return iconMap[condition] || '🌤️';
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

/**
 * Generate GPX file with weather data embedded
 */
export function generateGPXWithWeather(
  route: Route,
  forecasts: WeatherForecast[],
  settings: AppSettings
): Blob {
  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Forecaster Weather Planning" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${route.name} - Weather Forecast</name>
    <desc>Route with embedded weather forecast data</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${route.name}</name>
    <desc>Generated by Forecaster on ${formatDateTime(new Date())}</desc>
    <trkseg>
      ${forecasts.map(forecast => `
      <trkpt lat="${forecast.routePoint.lat}" lon="${forecast.routePoint.lon}">
        <ele>${forecast.routePoint.elevation || 0}</ele>
        ${forecast.routePoint.estimatedTime ? `<time>${forecast.routePoint.estimatedTime.toISOString()}</time>` : ''}
        <extensions>
          <weather>
            <temperature>${forecast.weather.temp}</temperature>
            <feels_like>${forecast.weather.feels_like}</feels_like>
            <condition>${forecast.weather.weather[0]?.description || 'Unknown'}</condition>
            <wind_speed>${forecast.weather.wind_speed}</wind_speed>
            <wind_direction_degrees>${forecast.weather.wind_deg || 0}</wind_direction_degrees>
            <wind_direction_cardinal>${forecast.weather.wind_deg ? formatWindDirection(forecast.weather.wind_deg) : 'N/A'}</wind_direction_cardinal>
            <wind_direction_arrow>${forecast.weather.wind_deg ? getWindDirectionArrow(forecast.weather.wind_deg) : ''}</wind_direction_arrow>
            <humidity>${forecast.weather.humidity}</humidity>
            <pressure>${forecast.weather.pressure}</pressure>
            <visibility>${forecast.weather.visibility}</visibility>
            ${forecast.weather.rain?.['1h'] ? `<rain>${forecast.weather.rain['1h']}</rain>` : ''}
            ${forecast.weather.snow?.['1h'] ? `<snow>${forecast.weather.snow['1h']}</snow>` : ''}
            ${forecast.alerts && forecast.alerts.length > 0 ? `<alerts>${forecast.alerts.map(a => a.title).join(', ')}</alerts>` : ''}
          </weather>
        </extensions>
      </trkpt>`).join('')}
    </trkseg>
  </trk>
</gpx>`;

  return new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8;' });
}

/**
 * Generate filename for export
 */
export function generateExportFilename(route: Route, format: 'pdf' | 'json' | 'csv' | 'html' | 'gpx' = 'pdf'): string {
  const sanitizedName = route.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `forecaster_${sanitizedName}_${timestamp}.${format}`;
}

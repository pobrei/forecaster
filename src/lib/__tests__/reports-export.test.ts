import {
  generateHTMLReport,
  generateCSVReport,
  generateGeoJSONReport,
  generateTextPDFReport,
  generateExportFilename
} from '../pdf-generator';
import { Route, WeatherForecast, AppSettings } from '@/types';

describe('Reports and Export Generators', () => {
  const mockRoute: Route = {
    id: 'test-route-export',
    name: 'Coastal Tour',
    points: [
      { lat: 43.7, lon: 7.2, elevation: 10, distance: 0 },
      { lat: 43.8, lon: 7.3, elevation: 50, distance: 12 },
      { lat: 43.9, lon: 7.4, elevation: 100, distance: 25 }
    ],
    totalDistance: 25,
    totalElevationGain: 90,
    estimatedDuration: 1.25
  };

  const mockSettings: AppSettings = {
    startTime: new Date('2026-08-21T08:00:00Z'),
    averageSpeed: 20,
    forecastInterval: 10,
    units: 'metric',
    timezone: 'UTC'
  };

  const mockForecasts: WeatherForecast[] = [
    {
      routePoint: { lat: 43.7, lon: 7.2, elevation: 10, distance: 0, estimatedTime: new Date('2026-08-21T08:00:00Z') },
      weather: {
        lat: 43.7,
        lon: 7.2,
        dt: 1724227200,
        temp: 24.5,
        feels_like: 25.0,
        pressure: 1014,
        humidity: 55,
        dew_point: 15.0,
        uvi: 7,
        clouds: 5,
        visibility: 10000,
        wind_speed: 5.0,
        wind_deg: 180,
        weather: [{ id: 800, main: 'Clear', description: 'Sunny', icon: '01d' }],
        rain: { '1h': 0 }
      },
      alerts: []
    },
    {
      routePoint: { lat: 43.9, lon: 7.4, elevation: 100, distance: 25, estimatedTime: new Date('2026-08-21T09:15:00Z') },
      weather: {
        lat: 43.9,
        lon: 7.4,
        dt: 1724231700,
        temp: 22.0,
        feels_like: 22.0,
        pressure: 1013,
        humidity: 60,
        dew_point: 14.0,
        uvi: 6,
        clouds: 40,
        visibility: 10000,
        wind_speed: 8.5,
        wind_deg: 220,
        weather: [{ id: 500, main: 'Rain', description: 'Light Rain', icon: '10d' }],
        rain: { '1h': 1.2 }
      },
      alerts: [
        {
          type: 'wind',
          severity: 'medium',
          title: 'Strong gusts expected',
          description: 'Wind gusts exceeding 30 km/h on coastal ridge'
        }
      ]
    }
  ];

  test('generateHTMLReport creates rich HTML document with forecast table', async () => {
    const blob = generateHTMLReport(mockRoute, mockForecasts, mockSettings);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/html');

    const html = await blob.text();
    expect(html).toContain('Coastal Tour');
    expect(html).toContain('Forecaster Weather Report');
    expect(html).toContain('Detailed Route Forecast');
    expect(html).toContain('forecast-table');
    expect(html).toContain('25°C');
    expect(html).toContain('Strong gusts expected');
  });

  test('generateCSVReport creates valid CSV with headers and data rows', async () => {
    const blob = generateCSVReport(mockRoute, mockForecasts, mockSettings);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/csv');

    const csv = await blob.text();
    expect(csv).toContain('Distance (km),Latitude,Longitude');
    expect(csv).toContain('24.5');
    expect(csv).toContain('Strong gusts expected');
  });

  test('generateGeoJSONReport creates valid GeoJSON FeatureCollection', async () => {
    const blob = generateGeoJSONReport(mockRoute, mockForecasts, mockSettings);
    expect(blob).toBeInstanceOf(Blob);

    const text = await blob.text();
    const geojson = JSON.parse(text);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(3); // 1 LineString + 2 Points
    expect(geojson.features[0].geometry.type).toBe('LineString');
    expect(geojson.features[1].geometry.type).toBe('Point');
    expect(geojson.features[1].properties.temperatureC).toBe(24.5);
    expect(geojson.features[2].properties.precipitationMmh).toBe(1.2);
  });

  test('generateTextPDFReport creates valid PDF blob', () => {
    const blob = generateTextPDFReport(mockRoute, mockForecasts, mockSettings);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  test('generateExportFilename sanitizes route name and adds timestamp', () => {
    const filename = generateExportFilename(mockRoute, 'geojson');
    expect(filename).toMatch(/^forecaster_Coastal_Tour_\d{4}-\d{2}-\d{2}\.geojson$/);
  });
});

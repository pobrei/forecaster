import { getCachedRoute, setCachedRoute, getCachedWeatherData, setCachedWeatherData, isMongoConfigured } from '../mongodb';
import { getCachedForecast, setCachedForecast, getForecastCacheStats } from '../forecast-cache';
import { Route, AppSettings, WeatherForecast } from '@/types';

describe('Environment and In-Memory Cache Fallbacks', () => {
  test('isMongoConfigured returns boolean without throwing', () => {
    const isConfigured = isMongoConfigured();
    expect(typeof isConfigured).toBe('boolean');
  });

  test('Route in-memory cache stores and retrieves routes', async () => {
    const testHash = 'test_hash_12345';
    const mockRoute: Route = {
      id: 'route-test-1',
      name: 'Test Scenic Route',
      points: [
        { lat: 45.0, lon: 9.0, distance: 0 },
        { lat: 45.1, lon: 9.1, distance: 15 }
      ],
      totalDistance: 15,
      totalElevationGain: 120,
      estimatedDuration: 1.0
    };

    await setCachedRoute({
      hash: testHash,
      route: mockRoute,
      createdAt: new Date(),
      lastAccessed: new Date()
    });

    const cached = await getCachedRoute(testHash);
    expect(cached).not.toBeNull();
    expect(cached?.route.name).toBe('Test Scenic Route');
    expect(cached?.route.points.length).toBe(2);
  });

  test('Weather in-memory cache stores and retrieves point weather', async () => {
    const lat = 46.5;
    const lon = 11.2;

    await setCachedWeatherData({
      lat,
      lon,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      data: {
        lat,
        lon,
        dt: Math.floor(Date.now() / 1000),
        temp: 18.5,
        feels_like: 18.0,
        pressure: 1013,
        humidity: 60,
        dew_point: 10.5,
        uvi: 5,
        clouds: 20,
        visibility: 10000,
        wind_speed: 4.2,
        wind_deg: 180,
        weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }]
      }
    });

    const cached = await getCachedWeatherData(lat, lon);
    expect(cached).not.toBeNull();
    expect(cached?.data.temp).toBe(18.5);
  });

  test('Forecast in-memory cache stores and retrieves full forecasts', async () => {
    const mockRoute: Route = {
      id: 'route-forecast-test',
      name: 'Mountain Pass',
      points: [
        { lat: 46.0, lon: 10.0, distance: 0 },
        { lat: 46.2, lon: 10.2, distance: 25 }
      ],
      totalDistance: 25,
      totalElevationGain: 850,
      estimatedDuration: 2.0
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
        routePoint: { lat: 46.0, lon: 10.0, distance: 0, estimatedTime: new Date('2026-08-21T08:00:00Z') },
        weather: {
          lat: 46.0,
          lon: 10.0,
          dt: 1724227200,
          temp: 14.0,
          feels_like: 13.5,
          pressure: 1015,
          humidity: 65,
          dew_point: 7.5,
          uvi: 4,
          clouds: 10,
          visibility: 10000,
          wind_speed: 3.5,
          wind_deg: 90,
          weather: [{ id: 800, main: 'Clear', description: 'Sunny', icon: '01d' }]
        },
        alerts: []
      }
    ];

    await setCachedForecast(mockRoute, mockSettings, mockForecasts);

    const retrieved = await getCachedForecast(mockRoute, mockSettings);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.length).toBe(1);
    expect(retrieved?.[0].weather.temp).toBe(14.0);

    const stats = await getForecastCacheStats();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(1);
  });
});

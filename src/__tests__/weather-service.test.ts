// Mock MongoDB before importing weather service
jest.mock('@/lib/mongodb', () => ({
  getCachedWeatherData: jest.fn().mockResolvedValue(null),
  setCachedWeatherData: jest.fn().mockResolvedValue(undefined),
}));

import { WeatherServiceFactory } from '@/lib/weather-service';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('WeatherServiceFactory', () => {
  it('should return Open-Meteo service by default', () => {
    // Clear any existing API key
    delete process.env.OPENWEATHER_API_KEY;
    
    const service = WeatherServiceFactory.getService();
    expect(service.getName()).toBe('Open-Meteo');
    expect(service.getApiLimits().requestsPerDay).toBe(10000);
  });

  it('should provide correct API limits for Open-Meteo', () => {
    const service = WeatherServiceFactory.getService();
    const limits = service.getApiLimits();
    
    expect(limits.requestsPerMinute).toBe(600);
    expect(limits.requestsPerDay).toBe(10000);
  });

  it('should handle weather data fetching', async () => {
    const service = WeatherServiceFactory.getService();
    
    // Mock fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-01-01T12:00:00Z',
          temperature_2m: 20,
          relative_humidity_2m: 65,
          apparent_temperature: 22,
          precipitation: 0,
          weather_code: 0,
          cloud_cover: 25,
          pressure_msl: 1013,
          wind_speed_10m: 5,
          wind_direction_10m: 180,
          wind_gusts_10m: 8
        }
      })
    });

    const weatherData = await service.fetchWeatherData(52.5, 13.4);
    
    expect(weatherData).toBeDefined();
    expect(weatherData?.temp).toBe(20);
    expect(weatherData?.humidity).toBe(65);
    expect(weatherData?.wind_speed).toBe(5);
    expect(weatherData?.weather[0].main).toBe('Clear');
  });

  it('should handle API errors gracefully', async () => {
    const service = WeatherServiceFactory.getService();
    
    // Mock fetch to return error
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    await expect(service.fetchWeatherData(52.5, 13.4))
      .rejects
      .toThrow('Open-Meteo API error: 500');
  });

  it('should map weather codes correctly', async () => {
    const service = WeatherServiceFactory.getService();
    
    // Test different weather codes
    const testCases = [
      { code: 0, expected: 'Clear' },
      { code: 1, expected: 'Clouds' },
      { code: 61, expected: 'Rain' },
      { code: 71, expected: 'Snow' },
      { code: 95, expected: 'Thunderstorm' }
    ];

    for (const testCase of testCases) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          current: {
            time: '2024-01-01T12:00:00Z',
            temperature_2m: 20,
            relative_humidity_2m: 65,
            apparent_temperature: 22,
            precipitation: 0,
            weather_code: testCase.code,
            cloud_cover: 25,
            pressure_msl: 1013,
            wind_speed_10m: 5,
            wind_direction_10m: 180,
            wind_gusts_10m: 8
          }
        })
      });

      const weatherData = await service.fetchWeatherData(52.5, 13.4);
      expect(weatherData?.weather[0].main).toBe(testCase.expected);
    }
  });

  it('should calculate dew point correctly', async () => {
    const service = WeatherServiceFactory.getService();
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-01-01T12:00:00Z',
          temperature_2m: 20,
          relative_humidity_2m: 60,
          apparent_temperature: 22,
          precipitation: 0,
          weather_code: 0,
          cloud_cover: 25,
          pressure_msl: 1013,
          wind_speed_10m: 5,
          wind_direction_10m: 180,
          wind_gusts_10m: 8
        }
      })
    });

    const weatherData = await service.fetchWeatherData(52.5, 13.4);
    
    // Dew point should be calculated using Magnus formula
    // For 20°C and 60% humidity, dew point should be around 12°C
    expect(weatherData?.dew_point).toBeCloseTo(12, 0);
  });
});

describe('Weather Service Integration', () => {
  it('should maintain data structure compatibility', async () => {
    const service = WeatherServiceFactory.getService();
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-01-01T12:00:00Z',
          temperature_2m: 15,
          relative_humidity_2m: 70,
          apparent_temperature: 16,
          precipitation: 2.5,
          weather_code: 61,
          cloud_cover: 80,
          pressure_msl: 1008,
          wind_speed_10m: 12,
          wind_direction_10m: 270,
          wind_gusts_10m: 18
        }
      })
    });

    const weatherData = await service.fetchWeatherData(52.5, 13.4);
    
    // Verify all required fields are present
    expect(weatherData).toHaveProperty('lat');
    expect(weatherData).toHaveProperty('lon');
    expect(weatherData).toHaveProperty('dt');
    expect(weatherData).toHaveProperty('temp');
    expect(weatherData).toHaveProperty('feels_like');
    expect(weatherData).toHaveProperty('pressure');
    expect(weatherData).toHaveProperty('humidity');
    expect(weatherData).toHaveProperty('dew_point');
    expect(weatherData).toHaveProperty('clouds');
    expect(weatherData).toHaveProperty('wind_speed');
    expect(weatherData).toHaveProperty('wind_deg');
    expect(weatherData).toHaveProperty('weather');
    
    // Verify weather array structure
    expect(Array.isArray(weatherData?.weather)).toBe(true);
    expect(weatherData?.weather[0]).toHaveProperty('id');
    expect(weatherData?.weather[0]).toHaveProperty('main');
    expect(weatherData?.weather[0]).toHaveProperty('description');
    expect(weatherData?.weather[0]).toHaveProperty('icon');
  });
});

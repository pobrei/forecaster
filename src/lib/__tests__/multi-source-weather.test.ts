import {
  getAvailableProviders,
  fetchMultiSourceWeather,
  fetchMultiSourceForecasts
} from '../multi-source-weather';
import { WEATHER_PROVIDERS, WeatherProviderId } from '@/types/weather-sources';
import { RoutePoint } from '@/types';

describe('Multi-Source & Multi-Model Weather Engine', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('WEATHER_PROVIDERS registry', () => {
    it('should define all 6 free global meteorological models and external providers', () => {
      const freeModels: WeatherProviderId[] = ['open-meteo', 'ecmwf', 'gfs', 'icon', 'meteofrance', 'gem'];
      freeModels.forEach(modelId => {
        const config = WEATHER_PROVIDERS[modelId];
        expect(config).toBeDefined();
        expect(config.isFree).toBe(true);
        expect(config.apiKeyRequired).toBe(false);
        expect(config.color).toMatch(/^#/);
        expect(config.name).toBeTruthy();
        expect(config.origin).toBeTruthy();
      });

      expect(WEATHER_PROVIDERS['openweathermap'].apiKeyRequired).toBe(true);
      expect(WEATHER_PROVIDERS['weatherapi'].apiKeyRequired).toBe(true);
      expect(WEATHER_PROVIDERS['visual-crossing'].apiKeyRequired).toBe(true);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all free models by default with no keys provided', () => {
      const providers = getAvailableProviders();
      expect(providers).toContain('open-meteo');
      expect(providers).toContain('ecmwf');
      expect(providers).toContain('gfs');
      expect(providers).toContain('icon');
      expect(providers).toContain('meteofrance');
      expect(providers).toContain('gem');
      expect(providers).not.toContain('openweathermap');
    });

    it('should include external providers when custom keys are supplied', () => {
      const providers = getAvailableProviders({
        openweathermap: 'test-key-owm',
        weatherapi: 'test-key-wapi'
      });
      expect(providers).toContain('openweathermap');
      expect(providers).toContain('weatherapi');
      expect(providers).not.toContain('visual-crossing');
    });
  });

  describe('fetchMultiSourceWeather with mock Open-Meteo response', () => {
    it('should query multiple models and calculate consensus and divergence', async () => {
      const mockOpenMeteoData = {
        hourly: {
          time: ['2026-09-07T12:00'],
          temperature_2m_best_match: [20.5],
          relative_humidity_2m_best_match: [65],
          precipitation_best_match: [0.0],
          weather_code_best_match: [1],
          wind_speed_10m_best_match: [3.5],
          wind_direction_10m_best_match: [180],
          pressure_msl_best_match: [1015],
          cloud_cover_best_match: [25],

          temperature_2m_ecmwf_ifs025: [21.0],
          relative_humidity_2m_ecmwf_ifs025: [60],
          precipitation_ecmwf_ifs025: [0.0],
          weather_code_ecmwf_ifs025: [1],
          wind_speed_10m_ecmwf_ifs025: [3.2],
          wind_direction_10m_ecmwf_ifs025: [175],
          pressure_msl_ecmwf_ifs025: [1016],
          cloud_cover_ecmwf_ifs025: [20],

          temperature_2m_gfs_seamless: [16.5], // > 3.5°C spread from ECMWF (21.0 vs 16.5)
          relative_humidity_2m_gfs_seamless: [85],
          precipitation_gfs_seamless: [2.5], // Rain vs Dry divergence!
          weather_code_gfs_seamless: [61],
          wind_speed_10m_gfs_seamless: [8.5], // > 4 m/s wind variance!
          wind_direction_10m_gfs_seamless: [190],
          pressure_msl_gfs_seamless: [1012],
          cloud_cover_gfs_seamless: [90],
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOpenMeteoData
      } as Response);

      const models: WeatherProviderId[] = ['open-meteo', 'ecmwf', 'gfs'];
      const result = await fetchMultiSourceWeather(46.5, 6.6, models, new Date('2026-09-07T12:00:00Z'));

      expect(result.sources).toHaveLength(3);
      expect(result.consensus).toBeDefined();

      // Check consensus
      expect(result.consensus?.temp.min).toBe(16.5);
      expect(result.consensus?.temp.max).toBe(21.0);
      expect(result.consensus?.temp.value).toBeCloseTo((20.5 + 21.0 + 16.5) / 3, 1);
      expect(result.consensus?.temp.sources).toEqual(expect.arrayContaining(models));

      // Check individual sources
      const gfs = result.sources.find(s => s.source === 'gfs');
      expect(gfs?.temp).toBe(16.5);
      expect(gfs?.rain?.['1h']).toBe(2.5);
      expect(gfs?.wind_speed).toBe(8.5);

      const ecmwf = result.sources.find(s => s.source === 'ecmwf');
      expect(ecmwf?.temp).toBe(21.0);
      expect(ecmwf?.rain).toBeUndefined();
    });

    it('should detect divergence alerts when models disagree on precipitation', async () => {
      const mockData = {
        hourly: {
          time: ['2026-09-07T12:00'],
          temperature_2m_best_match: [18.0],
          precipitation_best_match: [0.0],
          weather_code_best_match: [0],
          wind_speed_10m_best_match: [2.0],

          temperature_2m_gfs_seamless: [17.5],
          precipitation_gfs_seamless: [3.2], // Rain
          weather_code_gfs_seamless: [63],
          wind_speed_10m_gfs_seamless: [2.5],
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData
      } as Response);

      const points: RoutePoint[] = [
        { lat: 46.5, lon: 6.6, elevation: 400, distance: 15.0, estimatedTime: new Date('2026-09-07T12:00:00Z') }
      ];

      const forecasts = await fetchMultiSourceForecasts(points, ['open-meteo', 'gfs']);
      expect(forecasts).toHaveLength(1);

      const comparison = forecasts[0].sourceComparison;
      expect(comparison).toBeDefined();
      expect(comparison?.divergenceAlerts).toBeDefined();

      const rainAlert = comparison?.divergenceAlerts.find(a => a.type === 'rain_disagreement');
      expect(rainAlert).toBeDefined();
      expect(rainAlert?.distanceKm).toBe(15.0);
      expect(rainAlert?.description).toContain('predicts rain');
    });
  });
});

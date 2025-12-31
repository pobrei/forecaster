/**
 * Open-Meteo Weather Provider
 * Free, open-source weather API with no API key required
 */

import { BaseWeatherProvider } from './base-provider';
import { SourcedWeatherData, WeatherProviderId } from '@/types/weather-sources';

export class OpenMeteoProvider extends BaseWeatherProvider {
  readonly id: WeatherProviderId = 'open-meteo';

  constructor() {
    super();
    this.rateLimitState.providerId = this.id;
  }

  isConfigured(): boolean {
    return true; // No API key required
  }

  async fetchWeatherData(lat: number, lon: number): Promise<SourcedWeatherData | null> {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded for Open-Meteo');
    }

    try {
      this.recordRequest();

      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'uv_index'
        ].join(','),
        wind_speed_unit: 'ms',
        timezone: 'auto'
      });

      const response = await fetch(`${this.config.baseUrl}/forecast?${params}`);

      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformToWeatherData(data, lat, lon);
    } catch (error) {
      console.error('Error fetching from Open-Meteo:', error);
      throw error;
    }
  }

  private transformToWeatherData(data: OpenMeteoResponse, lat: number, lon: number): SourcedWeatherData {
    const current = data.current;

    const weatherData = {
      lat,
      lon,
      dt: Math.floor(new Date(current.time).getTime() / 1000),
      temp: current.temperature_2m,
      feels_like: current.apparent_temperature,
      pressure: current.pressure_msl,
      humidity: current.relative_humidity_2m,
      dew_point: this.calculateDewPoint(current.temperature_2m, current.relative_humidity_2m),
      uvi: current.uv_index || 0,
      clouds: current.cloud_cover,
      visibility: 10000,
      wind_speed: current.wind_speed_10m,
      wind_deg: current.wind_direction_10m,
      wind_gust: current.wind_gusts_10m,
      weather: [this.mapWeatherCode(current.weather_code)],
      pop: undefined,
      rain: current.precipitation > 0 ? { '1h': current.precipitation } : undefined,
      snow: undefined,
    };

    return this.toSourcedData(weatherData);
  }

  private mapWeatherCode(code: number): { id: number; main: string; description: string; icon: string } {
    const weatherMap: Record<number, { main: string; description: string; icon: string }> = {
      0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
      1: { main: 'Clear', description: 'Mainly clear', icon: '01d' },
      2: { main: 'Clouds', description: 'Partly cloudy', icon: '02d' },
      3: { main: 'Clouds', description: 'Overcast', icon: '04d' },
      45: { main: 'Fog', description: 'Fog', icon: '50d' },
      48: { main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
      51: { main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
      53: { main: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
      55: { main: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
      56: { main: 'Drizzle', description: 'Light freezing drizzle', icon: '09d' },
      57: { main: 'Drizzle', description: 'Dense freezing drizzle', icon: '09d' },
      61: { main: 'Rain', description: 'Slight rain', icon: '10d' },
      63: { main: 'Rain', description: 'Moderate rain', icon: '10d' },
      65: { main: 'Rain', description: 'Heavy rain', icon: '10d' },
      66: { main: 'Rain', description: 'Light freezing rain', icon: '13d' },
      67: { main: 'Rain', description: 'Heavy freezing rain', icon: '13d' },
      71: { main: 'Snow', description: 'Slight snow', icon: '13d' },
      73: { main: 'Snow', description: 'Moderate snow', icon: '13d' },
      75: { main: 'Snow', description: 'Heavy snow', icon: '13d' },
      77: { main: 'Snow', description: 'Snow grains', icon: '13d' },
      80: { main: 'Rain', description: 'Slight rain showers', icon: '09d' },
      81: { main: 'Rain', description: 'Moderate rain showers', icon: '09d' },
      82: { main: 'Rain', description: 'Violent rain showers', icon: '09d' },
      85: { main: 'Snow', description: 'Slight snow showers', icon: '13d' },
      86: { main: 'Snow', description: 'Heavy snow showers', icon: '13d' },
      95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
      96: { main: 'Thunderstorm', description: 'Thunderstorm with slight hail', icon: '11d' },
      99: { main: 'Thunderstorm', description: 'Thunderstorm with heavy hail', icon: '11d' },
    };

    const weather = weatherMap[code] || { main: 'Unknown', description: 'Unknown weather', icon: '01d' };
    return { id: code, ...weather };
  }
}

// Types for Open-Meteo API Response
interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    uv_index?: number;
  };
}


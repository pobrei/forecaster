/**
 * Visual Crossing Weather Provider
 * Premium weather data with historical analysis capabilities
 */

import { BaseWeatherProvider } from './base-provider';
import { SourcedWeatherData, WeatherProviderId } from '@/types/weather-sources';

export class VisualCrossingProvider extends BaseWeatherProvider {
  readonly id: WeatherProviderId = 'visual-crossing';
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    super();
    this.rateLimitState.providerId = this.id;
    this.apiKey = apiKey || process.env.VISUAL_CROSSING_API_KEY || null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async fetchWeatherData(lat: number, lon: number): Promise<SourcedWeatherData | null> {
    if (!this.isConfigured()) {
      throw new Error('Visual Crossing API key not configured');
    }

    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded for Visual Crossing');
    }

    try {
      this.recordRequest();

      const params = new URLSearchParams({
        unitGroup: 'metric',
        key: this.apiKey!,
        include: 'current',
        contentType: 'json',
      });

      const response = await fetch(
        `${this.config.baseUrl}/${lat},${lon}/today?${params}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Visual Crossing API key');
        } else if (response.status === 429) {
          throw new Error('Visual Crossing rate limit exceeded');
        }
        throw new Error(`Visual Crossing API error: ${response.status}`);
      }

      const data: VisualCrossingResponse = await response.json();
      return this.transformToWeatherData(data, lat, lon);
    } catch (error) {
      console.error('Error fetching from Visual Crossing:', error);
      throw error;
    }
  }

  private transformToWeatherData(data: VisualCrossingResponse, lat: number, lon: number): SourcedWeatherData {
    const current = data.currentConditions;
    
    const weatherData = {
      lat,
      lon,
      dt: current.datetimeEpoch,
      temp: current.temp,
      feels_like: current.feelslike,
      pressure: current.pressure,
      humidity: current.humidity,
      dew_point: current.dew,
      uvi: current.uvindex,
      clouds: current.cloudcover,
      visibility: (current.visibility || 10) * 1000, // km to meters
      wind_speed: current.windspeed / 3.6, // km/h to m/s
      wind_deg: current.winddir,
      wind_gust: current.windgust ? current.windgust / 3.6 : undefined,
      weather: [{
        id: this.conditionToCode(current.conditions),
        main: this.conditionToMain(current.conditions, current.icon),
        description: current.conditions,
        icon: this.mapIcon(current.icon),
      }],
      pop: undefined,
      rain: current.precip > 0 ? { '1h': current.precip } : undefined,
      snow: current.snow > 0 ? { '1h': current.snow } : undefined,
    };

    return this.toSourcedData(weatherData);
  }

  private conditionToCode(conditions: string): number {
    const lowerConditions = conditions.toLowerCase();
    if (lowerConditions.includes('thunder')) return 200;
    if (lowerConditions.includes('snow')) return 600;
    if (lowerConditions.includes('rain')) return 500;
    if (lowerConditions.includes('drizzle')) return 300;
    if (lowerConditions.includes('fog') || lowerConditions.includes('mist')) return 741;
    if (lowerConditions.includes('cloud') || lowerConditions.includes('overcast')) return 803;
    if (lowerConditions.includes('clear')) return 800;
    return 800;
  }

  private conditionToMain(conditions: string, icon: string): string {
    const lowerConditions = conditions.toLowerCase();
    if (lowerConditions.includes('thunder')) return 'Thunderstorm';
    if (lowerConditions.includes('snow')) return 'Snow';
    if (lowerConditions.includes('rain')) return 'Rain';
    if (lowerConditions.includes('drizzle')) return 'Drizzle';
    if (lowerConditions.includes('fog') || lowerConditions.includes('mist')) return 'Fog';
    if (lowerConditions.includes('cloud') || lowerConditions.includes('overcast')) return 'Clouds';
    return 'Clear';
  }

  private mapIcon(vcIcon: string): string {
    const iconMap: Record<string, string> = {
      'clear-day': '01d', 'clear-night': '01n',
      'partly-cloudy-day': '02d', 'partly-cloudy-night': '02n',
      'cloudy': '04d',
      'rain': '10d', 'showers-day': '09d', 'showers-night': '09n',
      'snow': '13d', 'snow-showers-day': '13d', 'snow-showers-night': '13n',
      'thunder': '11d', 'thunder-rain': '11d', 'thunder-showers-day': '11d',
      'fog': '50d', 'wind': '50d',
    };
    return iconMap[vcIcon] || '01d';
  }
}

// Visual Crossing Response Types
interface VisualCrossingResponse {
  queryCost: number;
  latitude: number;
  longitude: number;
  resolvedAddress: string;
  timezone: string;
  currentConditions: {
    datetime: string;
    datetimeEpoch: number;
    temp: number;
    feelslike: number;
    humidity: number;
    dew: number;
    precip: number;
    precipprob: number;
    snow: number;
    snowdepth: number;
    windgust: number;
    windspeed: number;
    winddir: number;
    pressure: number;
    visibility: number;
    cloudcover: number;
    uvindex: number;
    conditions: string;
    icon: string;
    sunrise: string;
    sunset: string;
  };
}


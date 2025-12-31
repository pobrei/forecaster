/**
 * WeatherAPI.com Provider
 * Reliable weather data with generous free tier (1M calls/month)
 */

import { BaseWeatherProvider } from './base-provider';
import { SourcedWeatherData, WeatherProviderId } from '@/types/weather-sources';

export class WeatherAPIProvider extends BaseWeatherProvider {
  readonly id: WeatherProviderId = 'weatherapi';
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    super();
    this.rateLimitState.providerId = this.id;
    this.apiKey = apiKey || process.env.WEATHERAPI_KEY || null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async fetchWeatherData(lat: number, lon: number): Promise<SourcedWeatherData | null> {
    if (!this.isConfigured()) {
      throw new Error('WeatherAPI key not configured');
    }

    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded for WeatherAPI');
    }

    try {
      this.recordRequest();

      const response = await fetch(
        `${this.config.baseUrl}/current.json?key=${this.apiKey}&q=${lat},${lon}&aqi=no`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid WeatherAPI key');
        } else if (response.status === 429) {
          throw new Error('WeatherAPI rate limit exceeded');
        }
        throw new Error(`WeatherAPI error: ${response.status}`);
      }

      const data: WeatherAPIResponse = await response.json();
      return this.transformToWeatherData(data, lat, lon);
    } catch (error) {
      console.error('Error fetching from WeatherAPI:', error);
      throw error;
    }
  }

  private transformToWeatherData(data: WeatherAPIResponse, lat: number, lon: number): SourcedWeatherData {
    const current = data.current;
    
    const weatherData = {
      lat,
      lon,
      dt: current.last_updated_epoch,
      temp: current.temp_c,
      feels_like: current.feelslike_c,
      pressure: current.pressure_mb,
      humidity: current.humidity,
      dew_point: this.calculateDewPoint(current.temp_c, current.humidity),
      uvi: current.uv,
      clouds: current.cloud,
      visibility: current.vis_km * 1000, // Convert to meters
      wind_speed: current.wind_kph / 3.6, // Convert to m/s
      wind_deg: current.wind_degree,
      wind_gust: current.gust_kph / 3.6, // Convert to m/s
      weather: [{
        id: current.condition.code,
        main: this.mapConditionToMain(current.condition.text),
        description: current.condition.text,
        icon: this.mapConditionIcon(current.condition.icon),
      }],
      pop: undefined,
      rain: current.precip_mm > 0 ? { '1h': current.precip_mm } : undefined,
      snow: undefined,
    };

    return this.toSourcedData(weatherData);
  }

  private mapConditionToMain(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('thunder')) return 'Thunderstorm';
    if (lowerText.includes('snow') || lowerText.includes('blizzard')) return 'Snow';
    if (lowerText.includes('rain') || lowerText.includes('drizzle')) return 'Rain';
    if (lowerText.includes('fog') || lowerText.includes('mist')) return 'Fog';
    if (lowerText.includes('cloud') || lowerText.includes('overcast')) return 'Clouds';
    if (lowerText.includes('clear') || lowerText.includes('sunny')) return 'Clear';
    return 'Clear';
  }

  private mapConditionIcon(iconUrl: string): string {
    // WeatherAPI icons include day/night info
    const isNight = iconUrl.includes('night');
    const suffix = isNight ? 'n' : 'd';
    
    // Map common patterns
    if (iconUrl.includes('113')) return `01${suffix}`; // Clear
    if (iconUrl.includes('116')) return `02${suffix}`; // Partly cloudy
    if (iconUrl.includes('119') || iconUrl.includes('122')) return `04${suffix}`; // Cloudy
    if (iconUrl.includes('rain') || iconUrl.includes('drizzle')) return `10${suffix}`;
    if (iconUrl.includes('snow')) return `13${suffix}`;
    if (iconUrl.includes('thunder')) return `11${suffix}`;
    if (iconUrl.includes('fog') || iconUrl.includes('mist')) return `50${suffix}`;
    
    return `01${suffix}`; // Default to clear
  }
}

// WeatherAPI Response Types
interface WeatherAPIResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: {
    last_updated_epoch: number;
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
}


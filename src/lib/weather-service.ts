import { WeatherData, WeatherForecast, RoutePoint, WeatherAlert } from '@/types';
import { WEATHER_API, WEATHER_THRESHOLDS } from './constants';
import { getCachedWeatherData, setCachedWeatherData } from './mongodb';

// Abstract Weather Service Interface
export interface WeatherService {
  fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null>;
  getName(): string;
  getApiLimits(): { requestsPerMinute: number; requestsPerDay: number };
}

// Open-Meteo Service Implementation
class OpenMeteoService implements WeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1';

  getName(): string {
    return 'Open-Meteo';
  }

  getApiLimits() {
    return {
      requestsPerMinute: 600, // Very generous limits
      requestsPerDay: 10000
    };
  }

  async fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
    try {
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
          'wind_gusts_10m'
        ].join(','),
        wind_speed_unit: 'ms',
        timezone: 'auto'
      });

      const response = await fetch(`${this.baseUrl}/forecast?${params}`);

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

  private transformToWeatherData(data: any, lat: number, lon: number): WeatherData {
    const current = data.current;

    return {
      lat,
      lon,
      dt: Math.floor(new Date(current.time).getTime() / 1000),
      temp: current.temperature_2m,
      feels_like: current.apparent_temperature,
      pressure: current.pressure_msl,
      humidity: current.relative_humidity_2m,
      dew_point: this.calculateDewPoint(current.temperature_2m, current.relative_humidity_2m),
      uvi: 0, // Not available in current weather
      clouds: current.cloud_cover,
      visibility: 10000, // Default visibility
      wind_speed: current.wind_speed_10m,
      wind_deg: current.wind_direction_10m,
      wind_gust: current.wind_gusts_10m,
      weather: [this.mapWeatherCode(current.weather_code)],
      pop: undefined,
      rain: current.precipitation > 0 ? { '1h': current.precipitation } : undefined,
      snow: undefined // Open-Meteo doesn't separate rain/snow in current weather
    };
  }

  private calculateDewPoint(temp: number, humidity: number): number {
    // Magnus formula approximation
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  }

  private mapWeatherCode(code: number): { id: number; main: string; description: string; icon: string } {
    // WMO Weather interpretation codes mapping
    const weatherMap: Record<number, { main: string; description: string; icon: string }> = {
      0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
      1: { main: 'Clouds', description: 'Mainly clear', icon: '02d' },
      2: { main: 'Clouds', description: 'Partly cloudy', icon: '03d' },
      3: { main: 'Clouds', description: 'Overcast', icon: '04d' },
      45: { main: 'Fog', description: 'Fog', icon: '50d' },
      48: { main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
      51: { main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
      53: { main: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
      55: { main: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
      61: { main: 'Rain', description: 'Slight rain', icon: '10d' },
      63: { main: 'Rain', description: 'Moderate rain', icon: '10d' },
      65: { main: 'Rain', description: 'Heavy rain', icon: '10d' },
      71: { main: 'Snow', description: 'Slight snow fall', icon: '13d' },
      73: { main: 'Snow', description: 'Moderate snow fall', icon: '13d' },
      75: { main: 'Snow', description: 'Heavy snow fall', icon: '13d' },
      95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
      96: { main: 'Thunderstorm', description: 'Thunderstorm with slight hail', icon: '11d' },
      99: { main: 'Thunderstorm', description: 'Thunderstorm with heavy hail', icon: '11d' }
    };

    const weather = weatherMap[code] || { main: 'Unknown', description: 'Unknown weather', icon: '01d' };
    return {
      id: code,
      ...weather
    };
  }
}

// OpenWeatherMap Service (Legacy)
class OpenWeatherMapService implements WeatherService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'OpenWeatherMap';
  }

  getApiLimits() {
    return {
      requestsPerMinute: 60,
      requestsPerDay: 1000
    };
  }

  async fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
    const url = `${WEATHER_API.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded');
      } else {
        throw new Error(`Weather API error: ${response.status}`);
      }
    }

    const data: OpenWeatherResponse = await response.json();

    return {
      lat: data.coord.lat,
      lon: data.coord.lon,
      dt: data.dt,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
      dew_point: data.main.temp, // Approximation
      uvi: 0,
      clouds: data.clouds.all,
      visibility: data.visibility,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      wind_gust: data.wind.gust,
      weather: data.weather,
      pop: undefined,
      rain: data.rain ? { '1h': data.rain['1h'] } : undefined,
      snow: data.snow ? { '1h': data.snow['1h'] } : undefined,
    };
  }
}

// Weather Service Factory - Simplified to use only Open-Meteo
class WeatherServiceFactory {
  private static instance: WeatherService | null = null;

  static getService(): WeatherService {
    if (!this.instance) {
      console.log('Using Open-Meteo weather service (free and reliable)');
      this.instance = new OpenMeteoService();
    }

    return this.instance;
  }

  static setService(service: WeatherService): void {
    this.instance = service;
  }

  static reset(): void {
    this.instance = null;
  }
}

// Export the factory for external use
export { WeatherServiceFactory };

// API key is now optional since we use Open-Meteo by default
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Rate limiting
const rateLimiter = {
  requests: [] as number[],
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '60'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  
  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  },
  
  recordRequest(): void {
    this.requests.push(Date.now());
  }
};

// OpenWeather Current Weather API response interface
interface OpenWeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
  rain?: {
    '1h': number;
    '3h': number;
  };
  snow?: {
    '1h': number;
    '3h': number;
  };
}

/**
 * Fetch weather data using the configured weather service with caching
 */
export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    // Check cache first
    const cached = await getCachedWeatherData(lat, lon);
    if (cached) {
      console.log(`Cache hit for coordinates: ${lat}, ${lon}`);
      return cached.data;
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Get weather service and fetch data
    const weatherService = WeatherServiceFactory.getService();
    console.log(`Fetching weather data using ${weatherService.getName()} for: ${lat}, ${lon}`);

    rateLimiter.recordRequest();

    const weatherData = await weatherService.fetchWeatherData(lat, lon);

    if (!weatherData) {
      throw new Error('No weather data received');
    }

    // Cache the result
    await setCachedWeatherData({
      lat: weatherData.lat,
      lon: weatherData.lon,
      data: weatherData,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + WEATHER_API.CACHE_DURATION)
    });

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

/**
 * Generate weather alerts based on thresholds
 */
export function generateWeatherAlerts(weather: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Wind alerts
  if (weather.wind_speed >= WEATHER_THRESHOLDS.WIND.EXTREME) {
    alerts.push({
      type: 'wind',
      severity: 'extreme',
      title: 'Extreme Wind Warning',
      description: `Very strong winds of ${Math.round(weather.wind_speed)} m/s. Outdoor activities not recommended.`
    });
  } else if (weather.wind_speed >= WEATHER_THRESHOLDS.WIND.HIGH) {
    alerts.push({
      type: 'wind',
      severity: 'high',
      title: 'High Wind Advisory',
      description: `Strong winds of ${Math.round(weather.wind_speed)} m/s. Exercise caution.`
    });
  }

  // Temperature alerts
  if (weather.temp >= WEATHER_THRESHOLDS.TEMPERATURE.EXTREME_HOT) {
    alerts.push({
      type: 'temperature',
      severity: 'extreme',
      title: 'Extreme Heat Warning',
      description: `Dangerous heat of ${Math.round(weather.temp)}°C. Risk of heat exhaustion.`
    });
  } else if (weather.temp >= WEATHER_THRESHOLDS.TEMPERATURE.HOT) {
    alerts.push({
      type: 'temperature',
      severity: 'medium',
      title: 'Hot Weather Advisory',
      description: `High temperature of ${Math.round(weather.temp)}°C. Stay hydrated.`
    });
  } else if (weather.temp <= WEATHER_THRESHOLDS.TEMPERATURE.EXTREME_COLD) {
    alerts.push({
      type: 'temperature',
      severity: 'extreme',
      title: 'Extreme Cold Warning',
      description: `Dangerous cold of ${Math.round(weather.temp)}°C. Risk of hypothermia.`
    });
  } else if (weather.temp <= WEATHER_THRESHOLDS.TEMPERATURE.FREEZING) {
    alerts.push({
      type: 'temperature',
      severity: 'medium',
      title: 'Freezing Temperature',
      description: `Temperature at or below freezing (${Math.round(weather.temp)}°C). Watch for ice.`
    });
  }

  // Precipitation alerts
  const precipitation = weather.rain?.['1h'] || weather.snow?.['1h'] || 0;
  if (precipitation >= WEATHER_THRESHOLDS.PRECIPITATION.EXTREME) {
    alerts.push({
      type: 'precipitation',
      severity: 'extreme',
      title: 'Extreme Precipitation Warning',
      description: `Very heavy ${weather.rain ? 'rain' : 'snow'} of ${precipitation.toFixed(1)}mm/h.`
    });
  } else if (precipitation >= WEATHER_THRESHOLDS.PRECIPITATION.HEAVY) {
    alerts.push({
      type: 'precipitation',
      severity: 'high',
      title: 'Heavy Precipitation Alert',
      description: `Heavy ${weather.rain ? 'rain' : 'snow'} of ${precipitation.toFixed(1)}mm/h.`
    });
  }

  // Visibility alerts
  if (weather.visibility <= WEATHER_THRESHOLDS.VISIBILITY.VERY_POOR) {
    alerts.push({
      type: 'visibility',
      severity: 'high',
      title: 'Very Poor Visibility',
      description: `Visibility reduced to ${weather.visibility}m. Exercise extreme caution.`
    });
  } else if (weather.visibility <= WEATHER_THRESHOLDS.VISIBILITY.POOR) {
    alerts.push({
      type: 'visibility',
      severity: 'medium',
      title: 'Poor Visibility',
      description: `Reduced visibility of ${weather.visibility}m.`
    });
  }

  return alerts;
}

/**
 * Get weather forecasts for multiple route points with batching and parallel processing
 */
export async function getWeatherForecasts(routePoints: RoutePoint[]): Promise<WeatherForecast[]> {
  const forecasts: WeatherForecast[] = [];
  const errors: string[] = [];

  // Optimized batch size for better performance
  const BATCH_SIZE = 15; // Increased from 10
  const MAX_CONCURRENT = 8; // Increased from 5

  console.log(`Processing ${routePoints.length} points in batches of ${BATCH_SIZE}`);

  // Process points in batches
  for (let i = 0; i < routePoints.length; i += BATCH_SIZE) {
    const batch = routePoints.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(routePoints.length / BATCH_SIZE)}`);

    // Process batch with limited concurrency and optimized delays
    const batchPromises = batch.map(async (point, index) => {
      // Reduced delay for better performance while respecting rate limits
      const delay = Math.floor(index / MAX_CONCURRENT) * 50; // 50ms delay per group (was 100ms)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        const weather = await fetchWeatherData(point.lat, point.lon);
        if (weather) {
          const alerts = generateWeatherAlerts(weather);
          return {
            routePoint: point,
            weather,
            alerts: alerts.length > 0 ? alerts : undefined
          };
        }
        return null;
      } catch (error) {
        console.error(`Failed to fetch weather for point ${point.lat}, ${point.lon}:`, error);
        errors.push(`Failed to fetch weather for coordinates ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`);
        return null;
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Collect successful results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        forecasts.push(result.value);
      }
    });

    // Reduced delay between batches for better performance
    if (i + BATCH_SIZE < routePoints.length) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 200ms
    }
  }

  if (forecasts.length === 0 && errors.length > 0) {
    throw new Error(`Failed to fetch weather data: ${errors.join('; ')}`);
  }

  return forecasts;
}

/**
 * Test OpenWeather API connection
 */
export async function testWeatherAPI(): Promise<boolean> {
  try {
    // Test with London coordinates
    const testLat = 51.5074;
    const testLon = -0.1278;
    
    const weather = await fetchWeatherData(testLat, testLon);
    return weather !== null;
  } catch (error) {
    console.error('Weather API test failed:', error);
    return false;
  }
}

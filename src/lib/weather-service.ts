import { WeatherData, WeatherForecast, RoutePoint, WeatherAlert } from '@/types';
import { WEATHER_API, WEATHER_THRESHOLDS } from './constants';
import { getCachedWeatherData, setCachedWeatherData } from './mongodb';

if (!process.env.OPENWEATHER_API_KEY) {
  throw new Error('Invalid/Missing environment variable: "OPENWEATHER_API_KEY"');
}

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
 * Fetch weather data from OpenWeather API with caching
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

    // Make API request - using current weather endpoint for free tier
    const url = `${WEATHER_API.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    
    console.log(`Fetching weather data for: ${lat}, ${lon}`);
    rateLimiter.recordRequest();
    
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

    const weatherData: WeatherData = {
      lat: data.coord.lat,
      lon: data.coord.lon,
      dt: data.dt,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
      dew_point: data.main.temp, // Approximation - not available in current weather API
      uvi: 0, // Not available in current weather API
      clouds: data.clouds.all,
      visibility: data.visibility,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      wind_gust: data.wind.gust,
      weather: data.weather,
      pop: undefined, // Not available in current weather API
      rain: data.rain ? { '1h': data.rain['1h'] } : undefined,
      snow: data.snow ? { '1h': data.snow['1h'] } : undefined,
    };

    // Cache the result
    await setCachedWeatherData({
      lat: data.coord.lat,
      lon: data.coord.lon,
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
 * Get weather forecasts for multiple route points
 */
export async function getWeatherForecasts(routePoints: RoutePoint[]): Promise<WeatherForecast[]> {
  const forecasts: WeatherForecast[] = [];
  const errors: string[] = [];

  for (const point of routePoints) {
    try {
      const weather = await fetchWeatherData(point.lat, point.lon);
      if (weather) {
        const alerts = generateWeatherAlerts(weather);
        forecasts.push({
          routePoint: point,
          weather,
          alerts: alerts.length > 0 ? alerts : undefined
        });
      }
    } catch (error) {
      console.error(`Failed to fetch weather for point ${point.lat}, ${point.lon}:`, error);
      errors.push(`Failed to fetch weather for coordinates ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`);
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

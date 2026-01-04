/**
 * Multi-Source Weather Service
 * Fetches weather data from multiple providers in parallel for comparison
 */

import { WeatherData, RoutePoint, WeatherAlert } from '@/types';
import { SourcedWeatherData, MultiSourceWeatherData, MultiSourceWeatherForecast, WeatherProviderId, ConsensusWeatherData } from '@/types/weather-sources';
import { generateWeatherAlerts } from './weather-service';

// Provider configurations
const PROVIDERS: Record<WeatherProviderId, ProviderConfig> = {
  'open-meteo': {
    name: 'Open-Meteo',
    baseUrl: 'https://api.open-meteo.com/v1/forecast',
    requiresApiKey: false,
    rateLimit: 600, // per minute
  },
  'openweathermap': {
    name: 'OpenWeatherMap',
    baseUrl: 'https://api.openweathermap.org/data/2.5/weather',
    requiresApiKey: true,
    rateLimit: 60,
  },
  'weatherapi': {
    name: 'WeatherAPI',
    baseUrl: 'https://api.weatherapi.com/v1/current.json',
    requiresApiKey: true,
    rateLimit: 60,
  },
  'visual-crossing': {
    name: 'Visual Crossing',
    baseUrl: 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline',
    requiresApiKey: true,
    rateLimit: 25,
  },
};

interface ProviderConfig {
  name: string;
  baseUrl: string;
  requiresApiKey: boolean;
  rateLimit: number;
}

/**
 * Fetch weather from Open-Meteo (free, no API key required)
 */
async function fetchOpenMeteo(lat: number, lon: number): Promise<SourcedWeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
        'precipitation', 'weather_code', 'cloud_cover', 'pressure_msl',
        'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
      ].join(','),
      wind_speed_unit: 'ms',
      timezone: 'auto'
    });

    const response = await fetch(`${PROVIDERS['open-meteo'].baseUrl}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const current = data.current;

    return {
      lat, lon,
      dt: Math.floor(new Date(current.time).getTime() / 1000),
      temp: current.temperature_2m,
      feels_like: current.apparent_temperature,
      pressure: current.pressure_msl,
      humidity: current.relative_humidity_2m,
      dew_point: calculateDewPoint(current.temperature_2m, current.relative_humidity_2m),
      uvi: 0,
      clouds: current.cloud_cover,
      visibility: 10000,
      wind_speed: current.wind_speed_10m,
      wind_deg: current.wind_direction_10m,
      wind_gust: current.wind_gusts_10m,
      weather: [mapOpenMeteoWeatherCode(current.weather_code)],
      rain: current.precipitation > 0 ? { '1h': current.precipitation } : undefined,
      source: 'open-meteo',
      fetchedAt: new Date(),
      confidence: 85,
    };
  } catch (error) {
    console.error('Open-Meteo fetch error:', error);
    return null;
  }
}

/**
 * Fetch weather from OpenWeatherMap (requires API key)
 */
async function fetchOpenWeatherMap(lat: number, lon: number): Promise<SourcedWeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${PROVIDERS['openweathermap'].baseUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      lat: data.coord.lat,
      lon: data.coord.lon,
      dt: data.dt,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
      dew_point: data.main.temp - ((100 - data.main.humidity) / 5), // Approximation
      uvi: 0,
      clouds: data.clouds.all,
      visibility: data.visibility,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      wind_gust: data.wind.gust,
      weather: data.weather,
      rain: data.rain ? { '1h': data.rain['1h'] } : undefined,
      snow: data.snow ? { '1h': data.snow['1h'] } : undefined,
      source: 'openweathermap',
      fetchedAt: new Date(),
      confidence: 90,
    };
  } catch (error) {
    console.error('OpenWeatherMap fetch error:', error);
    return null;
  }
}

// Helper functions
function calculateDewPoint(temp: number, humidity: number): number {
  const a = 17.27, b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

function mapOpenMeteoWeatherCode(code: number): { id: number; main: string; description: string; icon: string } {
  const weatherMap: Record<number, { main: string; description: string; icon: string }> = {
    0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
    1: { main: 'Clouds', description: 'Mainly clear', icon: '02d' },
    2: { main: 'Clouds', description: 'Partly cloudy', icon: '03d' },
    3: { main: 'Clouds', description: 'Overcast', icon: '04d' },
    45: { main: 'Fog', description: 'Fog', icon: '50d' },
    51: { main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
    61: { main: 'Rain', description: 'Slight rain', icon: '10d' },
    63: { main: 'Rain', description: 'Moderate rain', icon: '10d' },
    65: { main: 'Rain', description: 'Heavy rain', icon: '10d' },
    71: { main: 'Snow', description: 'Slight snow', icon: '13d' },
    95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
  };
  const weather = weatherMap[code] || { main: 'Unknown', description: 'Unknown', icon: '01d' };
  return { id: code, ...weather };
}

/**
 * Fetch weather from multiple sources in parallel
 */
export async function fetchMultiSourceWeather(
  lat: number,
  lon: number,
  sources: WeatherProviderId[] = ['open-meteo', 'openweathermap']
): Promise<MultiSourceWeatherData> {
  const fetchFunctions: Record<WeatherProviderId, (lat: number, lon: number) => Promise<SourcedWeatherData | null>> = {
    'open-meteo': fetchOpenMeteo,
    'openweathermap': fetchOpenWeatherMap,
    'weatherapi': async () => null, // Not implemented yet
    'visual-crossing': async () => null, // Not implemented yet
  };

  // Fetch from all sources in parallel
  const results = await Promise.allSettled(
    sources.map(source => fetchFunctions[source](lat, lon))
  );

  // Collect successful results
  const sourcedData: SourcedWeatherData[] = results
    .filter((r): r is PromiseFulfilledResult<SourcedWeatherData | null> =>
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value as SourcedWeatherData);

  return {
    lat,
    lon,
    timestamp: new Date(),
    sources: sourcedData,
    consensus: sourcedData.length > 1 ? calculateConsensus(sourcedData) : undefined,
  };
}

/**
 * Calculate consensus weather from multiple sources
 */
function calculateConsensus(sources: SourcedWeatherData[]): ConsensusWeatherData {
  const sourceIds = sources.map(s => s.source);

  const calcMetric = (getValue: (s: SourcedWeatherData) => number) => {
    const values = sources.map(getValue);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
    return { value: avg, variance, sources: sourceIds };
  };

  // Get most common weather condition
  const conditions = sources.map(s => s.weather[0]?.main || 'Unknown');
  const conditionCounts = conditions.reduce((acc, c) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {} as Record<string, number>);
  const topCondition = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  const topIcon = sources.find(s => s.weather[0]?.main === topCondition)?.weather[0]?.icon || '01d';

  return {
    temp: calcMetric(s => s.temp),
    humidity: calcMetric(s => s.humidity),
    wind_speed: calcMetric(s => s.wind_speed),
    wind_deg: calcMetric(s => s.wind_deg),
    pressure: calcMetric(s => s.pressure),
    clouds: calcMetric(s => s.clouds),
    precipitation: calcMetric(s => (s.rain?.['1h'] || 0) + (s.snow?.['1h'] || 0)),
    weather: { condition: topCondition, icon: topIcon },
  };
}

/**
 * Fetch multi-source weather for multiple route points
 */
export async function fetchMultiSourceForecasts(
  points: RoutePoint[],
  sources: WeatherProviderId[] = ['open-meteo', 'openweathermap']
): Promise<MultiSourceWeatherForecast[]> {
  // Limit parallel requests to avoid rate limits
  const batchSize = 5;
  const results: MultiSourceWeatherForecast[] = [];

  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (point) => {
        const multiSourceData = await fetchMultiSourceWeather(point.lat, point.lon, sources);

        // Use first source as primary, or Open-Meteo as fallback
        const primaryWeather = multiSourceData.sources.find(s => s.source === 'open-meteo')
          || multiSourceData.sources[0];

        if (!primaryWeather) {
          return null;
        }

        const alerts = generateWeatherAlerts(primaryWeather);

        const result: MultiSourceWeatherForecast = {
          routePoint: point,
          multiSourceData,
          primaryWeather,
          alerts: alerts.length > 0 ? alerts : undefined,
        };
        return result;
      })
    );

    const validResults = batchResults.filter((r): r is MultiSourceWeatherForecast => r !== null);
    results.push(...validResults);

    // Small delay between batches to respect rate limits
    if (i + batchSize < points.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Get available providers (those with API keys configured)
 */
export function getAvailableProviders(): WeatherProviderId[] {
  const available: WeatherProviderId[] = ['open-meteo']; // Always available

  if (process.env.OPENWEATHER_API_KEY) {
    available.push('openweathermap');
  }
  if (process.env.WEATHERAPI_KEY) {
    available.push('weatherapi');
  }
  if (process.env.VISUALCROSSING_API_KEY) {
    available.push('visual-crossing');
  }

  return available;
}


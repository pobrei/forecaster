/**
 * Multi-Source & Multi-Model Weather Service
 * Fetches real weather data and global meteorological forecasts (ECMWF, GFS, ICON, Météo-France, GEM, Best Match, OpenWeatherMap, WeatherAPI, Visual Crossing)
 */

import { RoutePoint, WeatherCondition } from '@/types';
import {
  SourcedWeatherData,
  MultiSourceWeatherData,
  MultiSourceWeatherForecast,
  WeatherProviderId,
  ConsensusWeatherData,
  ConsensusMetric,
  SourceComparisonData,
  ModelDivergenceAlert,
  WEATHER_PROVIDERS
} from '@/types/weather-sources';
import { generateWeatherAlerts } from './weather-service';

// Open-Meteo model identifiers
const OPEN_METEO_MODEL_MAP: Partial<Record<WeatherProviderId, string>> = {
  'open-meteo': 'best_match',
  'ecmwf': 'ecmwf_ifs025',
  'gfs': 'gfs_seamless',
  'icon': 'icon_seamless',
  'meteofrance': 'meteofrance_seamless',
  'gem': 'gem_seamless',
};

export interface CustomApiKeys {
  openweathermap?: string;
  weatherapi?: string;
  visualcrossing?: string;
}

/**
 * Weather code mapping for WMO codes (used by Open-Meteo and global models)
 */
function mapWmoWeatherCode(code: number): WeatherCondition {
  const weatherMap: Record<number, WeatherCondition> = {
    0: { id: 800, main: 'Clear', description: 'Clear sky', icon: '01d' },
    1: { id: 801, main: 'Clouds', description: 'Mainly clear', icon: '02d' },
    2: { id: 802, main: 'Clouds', description: 'Partly cloudy', icon: '03d' },
    3: { id: 803, main: 'Clouds', description: 'Overcast', icon: '04d' },
    45: { id: 741, main: 'Fog', description: 'Foggy', icon: '50d' },
    48: { id: 741, main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
    51: { id: 300, main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
    53: { id: 301, main: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
    55: { id: 302, main: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
    61: { id: 500, main: 'Rain', description: 'Slight rain', icon: '10d' },
    63: { id: 501, main: 'Rain', description: 'Moderate rain', icon: '10d' },
    65: { id: 502, main: 'Rain', description: 'Heavy rain', icon: '10d' },
    71: { id: 600, main: 'Snow', description: 'Slight snow fall', icon: '13d' },
    73: { id: 601, main: 'Snow', description: 'Moderate snow fall', icon: '13d' },
    75: { id: 602, main: 'Snow', description: 'Heavy snow fall', icon: '13d' },
    80: { id: 520, main: 'Rain', description: 'Slight rain showers', icon: '09d' },
    81: { id: 521, main: 'Rain', description: 'Moderate rain showers', icon: '09d' },
    82: { id: 522, main: 'Rain', description: 'Violent rain showers', icon: '09d' },
    95: { id: 200, main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
    96: { id: 201, main: 'Thunderstorm', description: 'Thunderstorm with slight hail', icon: '11d' },
    99: { id: 202, main: 'Thunderstorm', description: 'Thunderstorm with heavy hail', icon: '11d' },
  };

  return weatherMap[code] || { id: 800, main: 'Clear', description: 'Clear', icon: '01d' };
}

function calculateDewPoint(temp: number, humidity: number): number {
  const a = 17.27, b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(Math.max(1, humidity) / 100);
  return (b * alpha) / (a - alpha);
}

function calculateFeelsLike(temp: number, windSpeed: number, humidity: number): number {
  // Wind chill approximation for cold temps
  if (temp <= 10 && windSpeed > 1.3) {
    const v = Math.pow(windSpeed * 3.6, 0.16);
    return 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v;
  }
  // Heat index approximation for warm temps
  if (temp >= 26) {
    return temp + 0.33 * (humidity / 100 * 6.105 * Math.exp(17.27 * temp / (237.7 + temp))) - 4;
  }
  return temp;
}

/**
 * Fetch meteorological models from Open-Meteo in a single unified API request
 */
async function fetchOpenMeteoModels(
  lat: number,
  lon: number,
  models: WeatherProviderId[],
  targetTime?: Date
): Promise<SourcedWeatherData[]> {
  const openMeteoModelNames = models
    .map(m => OPEN_METEO_MODEL_MAP[m])
    .filter((name): name is string => Boolean(name));

  if (openMeteoModelNames.length === 0) return [];

  const hourlyParams = [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'pressure_msl',
    'cloud_cover'
  ].join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&models=${openMeteoModelNames.join(',')}&wind_speed_unit=ms&timezone=auto&forecast_days=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Open-Meteo model query failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const times: string[] = data.hourly?.time || [];
    if (times.length === 0) return [];

    // Find the hourly slot closest to the target time
    const targetMs = targetTime ? new Date(targetTime).getTime() : Date.now();
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    const results: SourcedWeatherData[] = [];
    const timestampSec = Math.floor(new Date(times[closestIndex]).getTime() / 1000);

    for (const providerId of models) {
      const modelKey = OPEN_METEO_MODEL_MAP[providerId];
      if (!modelKey) continue;

      const rawTemp = data.hourly[`temperature_2m_${modelKey}`]?.[closestIndex];
      if (rawTemp === undefined || rawTemp === null) continue;

      const temp = Number(rawTemp);
      const humidity = Number(data.hourly[`relative_humidity_2m_${modelKey}`]?.[closestIndex] ?? 60);
      const precipitation = Number(data.hourly[`precipitation_${modelKey}`]?.[closestIndex] ?? 0);
      const code = Number(data.hourly[`weather_code_${modelKey}`]?.[closestIndex] ?? 0);
      const windSpeed = Number(data.hourly[`wind_speed_10m_${modelKey}`]?.[closestIndex] ?? 2.0);
      const windDeg = Number(data.hourly[`wind_direction_10m_${modelKey}`]?.[closestIndex] ?? 0);
      const pressure = Number(data.hourly[`pressure_msl_${modelKey}`]?.[closestIndex] ?? 1013);
      const clouds = Number(data.hourly[`cloud_cover_${modelKey}`]?.[closestIndex] ?? (code > 0 ? 50 : 10));

      const weatherCondition = mapWmoWeatherCode(code);
      const config = WEATHER_PROVIDERS[providerId];

      results.push({
        lat,
        lon,
        dt: timestampSec,
        temp,
        feels_like: calculateFeelsLike(temp, windSpeed, humidity),
        pressure,
        humidity,
        dew_point: calculateDewPoint(temp, humidity),
        clouds,
        uvi: 0,
        visibility: 10000,
        wind_speed: windSpeed,
        wind_deg: windDeg,
        weather: [weatherCondition],
        pop: precipitation > 0 ? Math.min(1, Math.max(0.2, 0.4 + precipitation * 0.2)) : 0,
        rain: precipitation > 0 ? { '1h': precipitation } : undefined,
        source: providerId,
        sourceName: config?.name || providerId,
        fetchedAt: new Date(),
        confidence: 85,
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching Open-Meteo models:', error);
    return [];
  }
}

/**
 * Fetch from OpenWeatherMap (if API key available)
 */
async function fetchOpenWeatherMap(
  lat: number,
  lon: number,
  apiKey?: string
): Promise<SourcedWeatherData | null> {
  const key = apiKey || process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHERMAP_KEY;
  if (!key) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
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
      dew_point: data.main.temp - ((100 - data.main.humidity) / 5),
      clouds: data.clouds?.all ?? 0,
      uvi: 0,
      visibility: data.visibility ?? 10000,
      wind_speed: data.wind?.speed ?? 0,
      wind_deg: data.wind?.deg ?? 0,
      wind_gust: data.wind?.gust,
      weather: data.weather || [{ id: 800, main: 'Clear', description: 'Clear sky', icon: '01d' }],
      rain: data.rain ? { '1h': data.rain['1h'] } : undefined,
      snow: data.snow ? { '1h': data.snow['1h'] } : undefined,
      source: 'openweathermap',
      sourceName: WEATHER_PROVIDERS['openweathermap'].name,
      fetchedAt: new Date(),
      confidence: 90,
    };
  } catch (err) {
    console.error('OpenWeatherMap fetch error:', err);
    return null;
  }
}

/**
 * Fetch from WeatherAPI.com (if API key available)
 */
async function fetchWeatherAPI(
  lat: number,
  lon: number,
  apiKey?: string
): Promise<SourcedWeatherData | null> {
  const key = apiKey || process.env.WEATHERAPI_KEY || process.env.NEXT_PUBLIC_WEATHERAPI_KEY;
  if (!key) return null;

  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${lat},${lon}&aqi=no`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const current = data.current;
    return {
      lat,
      lon,
      dt: current.last_updated_epoch,
      temp: current.temp_c,
      feels_like: current.feelslike_c,
      pressure: current.pressure_mb,
      humidity: current.humidity,
      dew_point: calculateDewPoint(current.temp_c, current.humidity),
      clouds: current.cloud,
      uvi: 0,
      visibility: current.vis_km * 1000,
      wind_speed: current.wind_kph / 3.6,
      wind_deg: current.wind_degree,
      wind_gust: current.gust_kph ? current.gust_kph / 3.6 : undefined,
      weather: [{
        id: current.condition.code,
        main: current.condition.text.includes('Rain') ? 'Rain' : current.condition.text.includes('Snow') ? 'Snow' : current.condition.text.includes('Cloud') ? 'Clouds' : 'Clear',
        description: current.condition.text,
        icon: current.is_day ? '01d' : '01n',
      }],
      rain: current.precip_mm > 0 ? { '1h': current.precip_mm } : undefined,
      source: 'weatherapi',
      sourceName: WEATHER_PROVIDERS['weatherapi'].name,
      fetchedAt: new Date(),
      confidence: 90,
    };
  } catch (err) {
    console.error('WeatherAPI fetch error:', err);
    return null;
  }
}

/**
 * Calculate consensus ensemble from multiple sources/models
 */
function calculateConsensus(sources: SourcedWeatherData[]): ConsensusWeatherData {
  const sourceIds = sources.map(s => s.source);

  const calcMetric = (getValue: (s: SourcedWeatherData) => number): ConsensusMetric => {
    const values = sources.map(getValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
    return {
      value: Number(avg.toFixed(1)),
      min: Number(min.toFixed(1)),
      max: Number(max.toFixed(1)),
      variance: Number(variance.toFixed(2)),
      sources: sourceIds,
    };
  };

  // Weather condition consensus (mode)
  const conditions = sources.map(s => s.weather[0]?.main || 'Clear');
  const counts: Record<string, number> = {};
  conditions.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
  const topCondition = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Clear';
  const topIcon = sources.find(s => s.weather[0]?.main === topCondition)?.weather[0]?.icon || '01d';

  // Calculate agreement score (0-100%) based on temp spread and condition agreement
  const tempSpread = Math.max(...sources.map(s => s.temp)) - Math.min(...sources.map(s => s.temp));
  const tempAgreement = Math.max(0, 100 - tempSpread * 15);
  const conditionUnanimity = ((counts[topCondition] || 1) / sources.length) * 100;
  const agreementScore = Math.round((tempAgreement * 0.6) + (conditionUnanimity * 0.4));

  return {
    temp: calcMetric(s => s.temp),
    humidity: calcMetric(s => s.humidity),
    wind_speed: calcMetric(s => s.wind_speed),
    wind_deg: calcMetric(s => s.wind_deg),
    pressure: calcMetric(s => s.pressure),
    clouds: calcMetric(s => s.clouds),
    precipitation: calcMetric(s => (s.rain?.['1h'] || s.snow?.['1h'] || 0)),
    weather: { condition: topCondition, icon: topIcon },
    agreementScore,
  };
}

/**
 * Detect significant divergence among models at a given point
 */
function analyzeDivergence(
  sources: SourcedWeatherData[],
  distanceKm: number
): { comparisonData: SourceComparisonData; alerts: ModelDivergenceAlert[] } {
  const temps = sources.map(s => s.temp);
  const winds = sources.map(s => s.wind_speed);
  const precips = sources.map(s => (s.rain?.['1h'] || s.snow?.['1h'] || 0));
  const humidities = sources.map(s => s.humidity);

  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);
  const tempDiff = Number((tempMax - tempMin).toFixed(1));

  const windMin = Math.min(...winds);
  const windMax = Math.max(...winds);
  const windDiff = Number((windMax - windMin).toFixed(1));

  const precipMin = Math.min(...precips);
  const precipMax = Math.max(...precips);
  const precipDiff = Number((precipMax - precipMin).toFixed(1));

  const humMin = Math.min(...humidities);
  const humMax = Math.max(...humidities);
  const humDiff = Number((humMax - humMin).toFixed(1));

  const alerts: ModelDivergenceAlert[] = [];

  // 1. Rain disagreement: one model predicts precipitation while another predicts dry
  const rainingModels = sources.filter(s => (s.rain?.['1h'] || s.snow?.['1h'] || 0) > 0.1);
  const dryModels = sources.filter(s => (s.rain?.['1h'] || s.snow?.['1h'] || 0) <= 0.05);

  if (rainingModels.length > 0 && dryModels.length > 0) {
    const maxPrecip = Math.max(...rainingModels.map(s => s.rain?.['1h'] || s.snow?.['1h'] || 0));
    alerts.push({
      type: 'rain_disagreement',
      severity: maxPrecip > 2 ? 'high' : 'medium',
      title: `Precipitation Disagreement at ${distanceKm.toFixed(1)}km`,
      description: `${rainingModels.map(m => m.sourceName).join(', ')} predicts rain (${maxPrecip.toFixed(1)}mm), while ${dryModels.map(m => m.sourceName).join(', ')} predicts dry conditions.`,
      distanceKm,
      spread: precipDiff,
      modelsInvolved: sources.map(s => s.source),
    });
  }

  // 2. High temperature spread (> 3.5°C)
  if (tempDiff >= 3.5) {
    const highestModel = sources.find(s => s.temp === tempMax);
    const lowestModel = sources.find(s => s.temp === tempMin);
    alerts.push({
      type: 'temp_spread',
      severity: tempDiff >= 5 ? 'high' : 'medium',
      title: `Temperature Spread of ${tempDiff}°C at ${distanceKm.toFixed(1)}km`,
      description: `${highestModel?.sourceName} predicts ${tempMax}°C, whereas ${lowestModel?.sourceName} predicts ${tempMin}°C.`,
      distanceKm,
      spread: tempDiff,
      modelsInvolved: sources.map(s => s.source),
    });
  }

  // 3. High wind variance (> 4 m/s spread)
  if (windDiff >= 4.0) {
    const gustiest = sources.find(s => s.wind_speed === windMax);
    alerts.push({
      type: 'wind_variance',
      severity: windMax > 12 ? 'high' : 'medium',
      title: `Wind Discrepancy at ${distanceKm.toFixed(1)}km`,
      description: `${gustiest?.sourceName} forecasts strong wind (${(windMax * 3.6).toFixed(0)} km/h), while other models predict calmer air.`,
      distanceKm,
      spread: windDiff,
      modelsInvolved: sources.map(s => s.source),
    });
  }

  // Calculate agreement score
  const tempScore = Math.max(0, 100 - tempDiff * 12);
  const precipScore = alerts.some(a => a.type === 'rain_disagreement') ? 40 : 100;
  const agreementScore = Math.round((tempScore * 0.5) + (precipScore * 0.5));

  const comparisonData: SourceComparisonData = {
    tempRange: { min: tempMin, max: tempMax, diff: tempDiff },
    humidityRange: { min: humMin, max: humMax, diff: humDiff },
    windSpeedRange: { min: windMin, max: windMax, diff: windDiff },
    precipitationRange: { min: precipMin, max: precipMax, diff: precipDiff },
    agreementScore,
    outlierSources: [],
    divergenceAlerts: alerts,
  };

  return { comparisonData, alerts };
}

/**
 * Fetch multi-source weather data for a single location point
 */
export async function fetchMultiSourceWeather(
  lat: number,
  lon: number,
  sources: WeatherProviderId[] = ['open-meteo', 'ecmwf', 'gfs', 'icon'],
  targetTime?: Date,
  customKeys?: CustomApiKeys
): Promise<MultiSourceWeatherData> {
  const openMeteoModels = sources.filter(s => Boolean(OPEN_METEO_MODEL_MAP[s]));
  const externalSources = sources.filter(s => !OPEN_METEO_MODEL_MAP[s]);

  const [omResults, ...externalResults] = await Promise.all([
    fetchOpenMeteoModels(lat, lon, openMeteoModels, targetTime),
    ...externalSources.map(async src => {
      if (src === 'openweathermap') return fetchOpenWeatherMap(lat, lon, customKeys?.openweathermap);
      if (src === 'weatherapi') return fetchWeatherAPI(lat, lon, customKeys?.weatherapi);
      return null;
    })
  ]);

  const allSourcedData: SourcedWeatherData[] = [
    ...omResults,
    ...externalResults.filter((r): r is SourcedWeatherData => r !== null)
  ];

  return {
    lat,
    lon,
    timestamp: targetTime || new Date(),
    sources: allSourcedData,
    consensus: allSourcedData.length > 1 ? calculateConsensus(allSourcedData) : undefined,
  };
}

/**
 * Fetch multi-source forecasts for all route points with rate limiting & batching
 */
export async function fetchMultiSourceForecasts(
  points: RoutePoint[],
  sources: WeatherProviderId[] = ['open-meteo', 'ecmwf', 'gfs', 'icon'],
  customKeys?: CustomApiKeys
): Promise<MultiSourceWeatherForecast[]> {
  const batchSize = 6;
  const results: MultiSourceWeatherForecast[] = [];

  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (point): Promise<MultiSourceWeatherForecast | null> => {
        const multiSourceData = await fetchMultiSourceWeather(
          point.lat,
          point.lon,
          sources,
          point.estimatedTime,
          customKeys
        );

        if (multiSourceData.sources.length === 0) return null;

        // Use primary source or first available source
        const primaryWeather = multiSourceData.sources.find(s => s.source === sources[0])
          || multiSourceData.sources[0];

        const { comparisonData } = analyzeDivergence(multiSourceData.sources, point.distance);
        const alerts = generateWeatherAlerts(primaryWeather);

        return {
          routePoint: point,
          multiSourceData,
          primaryWeather,
          alerts: alerts.length > 0 ? alerts : undefined,
          sourceComparison: comparisonData,
        };
      })
    );

    const valid = batchResults.filter((r): r is MultiSourceWeatherForecast => r !== null);
    results.push(...valid);

    if (i + batchSize < points.length) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  return results;
}

/**
 * Get all available providers and models
 */
export function getAvailableProviders(customKeys?: CustomApiKeys): WeatherProviderId[] {
  // Free meteorological models always available via Open-Meteo
  const available: WeatherProviderId[] = [
    'open-meteo',
    'ecmwf',
    'gfs',
    'icon',
    'meteofrance',
    'gem'
  ];

  if (customKeys?.openweathermap || process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHERMAP_KEY) {
    available.push('openweathermap');
  }
  if (customKeys?.weatherapi || process.env.WEATHERAPI_KEY || process.env.NEXT_PUBLIC_WEATHERAPI_KEY) {
    available.push('weatherapi');
  }
  if (customKeys?.visualcrossing || process.env.VISUAL_CROSSING_API_KEY || process.env.NEXT_PUBLIC_VISUAL_CROSSING_KEY) {
    available.push('visual-crossing');
  }

  return available;
}

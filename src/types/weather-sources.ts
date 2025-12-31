/**
 * Multi-Weather Source Types and Interfaces
 * Supports multiple weather data providers with comparison capabilities
 */

import { WeatherData, WeatherForecast, RoutePoint, WeatherAlert } from './index';

// Weather Provider Identifiers
export type WeatherProviderId = 
  | 'open-meteo'
  | 'weatherapi'
  | 'visual-crossing'
  | 'openweathermap';

// Provider Status for availability tracking
export type ProviderStatus = 'available' | 'degraded' | 'unavailable' | 'unknown';

// Provider Configuration
export interface WeatherProviderConfig {
  id: WeatherProviderId;
  name: string;
  description: string;
  apiKeyRequired: boolean;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  features: {
    currentWeather: boolean;
    hourlyForecast: boolean;
    dailyForecast: boolean;
    alerts: boolean;
    airQuality: boolean;
    uvIndex: boolean;
  };
  color: string; // For UI differentiation
  icon: string; // Icon name for display
}

// Provider Status Info
export interface ProviderStatusInfo {
  providerId: WeatherProviderId;
  status: ProviderStatus;
  lastChecked: Date;
  responseTimeMs?: number;
  errorMessage?: string;
  uptime24h?: number; // Percentage uptime in last 24h
  successRate?: number; // Percentage of successful requests
}

// Weather Data with Source Attribution
export interface SourcedWeatherData extends WeatherData {
  source: WeatherProviderId;
  fetchedAt: Date;
  confidence?: number; // 0-100 confidence score
}

// Multi-Source Weather Data for a single point
export interface MultiSourceWeatherData {
  lat: number;
  lon: number;
  timestamp: Date;
  sources: SourcedWeatherData[];
  consensus?: ConsensusWeatherData; // Aggregated "best" estimate
}

// Consensus Weather Data (aggregated from multiple sources)
export interface ConsensusWeatherData {
  temp: { value: number; variance: number; sources: WeatherProviderId[] };
  humidity: { value: number; variance: number; sources: WeatherProviderId[] };
  wind_speed: { value: number; variance: number; sources: WeatherProviderId[] };
  wind_deg: { value: number; variance: number; sources: WeatherProviderId[] };
  pressure: { value: number; variance: number; sources: WeatherProviderId[] };
  clouds: { value: number; variance: number; sources: WeatherProviderId[] };
  precipitation: { value: number; variance: number; sources: WeatherProviderId[] };
  weather: { condition: string; icon: string };
}

// Multi-Source Weather Forecast
export interface MultiSourceWeatherForecast {
  routePoint: RoutePoint;
  multiSourceData: MultiSourceWeatherData;
  primaryWeather: SourcedWeatherData; // Selected primary source
  alerts?: WeatherAlert[];
  sourceComparison?: SourceComparisonData;
}

// Comparison Data for UI Display
export interface SourceComparisonData {
  tempRange: { min: number; max: number; diff: number };
  humidityRange: { min: number; max: number; diff: number };
  windSpeedRange: { min: number; max: number; diff: number };
  precipitationRange: { min: number; max: number; diff: number };
  agreementScore: number; // 0-100, how much sources agree
  outlierSources: WeatherProviderId[];
}

// User Preferences for Weather Sources
export interface WeatherSourcePreferences {
  primarySource: WeatherProviderId;
  enabledSources: WeatherProviderId[];
  comparisonMode: 'single' | 'comparison' | 'consensus';
  autoFallback: boolean;
  refreshInterval: number; // minutes
  showSourceIndicators: boolean;
  showReliabilityScores: boolean;
}

// API Response Types for Multi-Source
export interface MultiSourceWeatherResponse {
  forecasts: MultiSourceWeatherForecast[];
  providerStatuses: ProviderStatusInfo[];
  cacheHit: boolean;
  message: string;
  fetchDurationMs: number;
}

// Weather Source Manager State
export interface WeatherSourceManagerState {
  providers: Map<WeatherProviderId, WeatherProviderConfig>;
  statuses: Map<WeatherProviderId, ProviderStatusInfo>;
  preferences: WeatherSourcePreferences;
  isInitialized: boolean;
}

// Rate Limiter State per Provider  
export interface ProviderRateLimitState {
  providerId: WeatherProviderId;
  requestsThisMinute: number;
  requestsToday: number;
  lastRequestTime: Date;
  minuteWindowStart: Date;
  dayWindowStart: Date;
}

// Default Preferences
export const DEFAULT_WEATHER_SOURCE_PREFERENCES: WeatherSourcePreferences = {
  primarySource: 'open-meteo',
  enabledSources: ['open-meteo'],
  comparisonMode: 'single',
  autoFallback: true,
  refreshInterval: 30,
  showSourceIndicators: true,
  showReliabilityScores: false,
};

// Provider Configurations
export const WEATHER_PROVIDERS: Record<WeatherProviderId, WeatherProviderConfig> = {
  'open-meteo': {
    id: 'open-meteo',
    name: 'Open-Meteo',
    description: 'Free, open-source weather API with high accuracy',
    apiKeyRequired: false,
    baseUrl: 'https://api.open-meteo.com/v1',
    rateLimit: { requestsPerMinute: 600, requestsPerDay: 10000 },
    features: {
      currentWeather: true,
      hourlyForecast: true,
      dailyForecast: true,
      alerts: false,
      airQuality: true,
      uvIndex: true,
    },
    color: '#10b981', // Emerald
    icon: 'Cloud',
  },
  'weatherapi': {
    id: 'weatherapi',
    name: 'WeatherAPI',
    description: 'Reliable weather data with generous free tier',
    apiKeyRequired: true,
    baseUrl: 'https://api.weatherapi.com/v1',
    rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000000 },
    features: {
      currentWeather: true,
      hourlyForecast: true,
      dailyForecast: true,
      alerts: true,
      airQuality: true,
      uvIndex: true,
    },
    color: '#3b82f6', // Blue
    icon: 'CloudSun',
  },
  'visual-crossing': {
    id: 'visual-crossing',
    name: 'Visual Crossing',
    description: 'Premium weather data with historical analysis',
    apiKeyRequired: true,
    baseUrl: 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline',
    rateLimit: { requestsPerMinute: 100, requestsPerDay: 1000 },
    features: {
      currentWeather: true,
      hourlyForecast: true,
      dailyForecast: true,
      alerts: true,
      airQuality: false,
      uvIndex: true,
    },
    color: '#8b5cf6', // Purple
    icon: 'CloudLightning',
  },
  'openweathermap': {
    id: 'openweathermap',
    name: 'OpenWeatherMap',
    description: 'Popular weather API with global coverage',
    apiKeyRequired: true,
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000 },
    features: {
      currentWeather: true,
      hourlyForecast: true,
      dailyForecast: true,
      alerts: true,
      airQuality: true,
      uvIndex: true,
    },
    color: '#f59e0b', // Amber
    icon: 'Sun',
  },
};


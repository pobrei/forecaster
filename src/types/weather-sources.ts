/**
 * Multi-Weather Source Types and Interfaces
 * Supports multiple weather data providers and global meteorological models with comparison capabilities
 */

import { WeatherData, RoutePoint, WeatherAlert } from './index';

// Weather Provider and Model Identifiers
export type WeatherProviderId = 
  | 'open-meteo'      // Open-Meteo Best Match (Ensemble)
  | 'ecmwf'           // ECMWF IFS (Europe)
  | 'gfs'             // NOAA GFS (USA)
  | 'icon'            // DWD ICON (Germany)
  | 'meteofrance'     // Météo-France (France)
  | 'gem'             // GEM (Canada)
  | 'openweathermap'  // OpenWeatherMap API
  | 'weatherapi'      // WeatherAPI.com
  | 'visual-crossing';// Visual Crossing API

// Provider Status for availability tracking
export type ProviderStatus = 'available' | 'degraded' | 'unavailable' | 'unknown';

// Provider / Model Configuration
export interface WeatherProviderConfig {
  id: WeatherProviderId;
  name: string;
  organization: string;
  origin: string; // Flag/country label
  description: string;
  resolution: string;
  apiKeyRequired: boolean;
  isFree: boolean;
  baseUrl: string;
  openMeteoModel?: string; // Model identifier for Open-Meteo API
  color: string; // Unique, harmonious chart line color
  fillColor: string; // Transparent fill color
  icon: 'Cloud' | 'CloudSun' | 'Sun' | 'CloudLightning' | 'Globe' | 'Shield';
}

// Provider Status Info
export interface ProviderStatusInfo {
  providerId: WeatherProviderId;
  status: ProviderStatus;
  lastChecked: Date;
  responseTimeMs?: number;
  errorMessage?: string;
  uptime24h?: number;
  successRate?: number;
}

// Weather Data with Source Attribution
export interface SourcedWeatherData extends WeatherData {
  source: WeatherProviderId;
  sourceName: string;
  fetchedAt: Date;
  confidence?: number; // 0-100 confidence score
}

// Multi-Source Weather Data for a single route point
export interface MultiSourceWeatherData {
  lat: number;
  lon: number;
  timestamp: Date;
  sources: SourcedWeatherData[];
  consensus?: ConsensusWeatherData; // Aggregated ensemble estimate
}

// Consensus Weather Metric with variance and model spread
export interface ConsensusMetric {
  value: number;
  min: number;
  max: number;
  variance: number;
  sources: WeatherProviderId[];
}

// Consensus Weather Data (aggregated ensemble from multiple models/sources)
export interface ConsensusWeatherData {
  temp: ConsensusMetric;
  humidity: ConsensusMetric;
  wind_speed: ConsensusMetric;
  wind_deg: ConsensusMetric;
  pressure: ConsensusMetric;
  clouds: ConsensusMetric;
  precipitation: ConsensusMetric;
  weather: { condition: string; icon: string };
  agreementScore: number; // 0-100% agreement across models
}

// Model Divergence Alert for significant disagreements along the route
export interface ModelDivergenceAlert {
  type: 'rain_disagreement' | 'wind_variance' | 'temp_spread' | 'severe_weather';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  distanceKm: number;
  spread: number;
  modelsInvolved: WeatherProviderId[];
}

// Comparison Data for UI Display
export interface SourceComparisonData {
  tempRange: { min: number; max: number; diff: number };
  humidityRange: { min: number; max: number; diff: number };
  windSpeedRange: { min: number; max: number; diff: number };
  precipitationRange: { min: number; max: number; diff: number };
  agreementScore: number; // 0-100, overall agreement
  outlierSources: WeatherProviderId[];
  divergenceAlerts: ModelDivergenceAlert[];
}

// Multi-Source Weather Forecast
export interface MultiSourceWeatherForecast {
  routePoint: RoutePoint;
  multiSourceData: MultiSourceWeatherData;
  primaryWeather: SourcedWeatherData; // Selected primary source
  alerts?: WeatherAlert[];
  sourceComparison?: SourceComparisonData;
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
  customApiKeys?: {
    openweathermap?: string;
    weatherapi?: string;
    visualcrossing?: string;
  };
}

// API Response Types for Multi-Source
export interface MultiSourceWeatherResponse {
  forecasts: MultiSourceWeatherForecast[];
  availableProviders: WeatherProviderId[];
  usedProviders: WeatherProviderId[];
  summary: {
    totalPoints: number;
    agreementScore: number;
    divergenceCount: number;
    divergenceAlerts: ModelDivergenceAlert[];
  };
  message: string;
  timestamp: Date;
}

// Default Preferences
export const DEFAULT_WEATHER_SOURCE_PREFERENCES: WeatherSourcePreferences = {
  primarySource: 'open-meteo',
  enabledSources: ['open-meteo', 'ecmwf', 'gfs', 'icon'],
  comparisonMode: 'single',
  autoFallback: true,
  refreshInterval: 30,
  showSourceIndicators: true,
  showReliabilityScores: false,
};

// Provider & Model Configurations
export const WEATHER_PROVIDERS: Record<WeatherProviderId, WeatherProviderConfig> = {
  'open-meteo': {
    id: 'open-meteo',
    name: 'Best Match',
    organization: 'Open-Meteo Ensemble',
    origin: 'Global 🌐',
    description: 'Blended optimal ensemble from leading meteorological agencies',
    resolution: '1-11 km',
    apiKeyRequired: false,
    isFree: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    openMeteoModel: 'best_match',
    color: '#10b981', // Emerald green
    fillColor: 'rgba(16, 185, 129, 0.1)',
    icon: 'Globe',
  },
  'ecmwf': {
    id: 'ecmwf',
    name: 'ECMWF IFS',
    organization: 'European Centre for Medium-Range Weather Forecasts',
    origin: 'Europe 🇪🇺',
    description: 'Gold standard global numerical weather prediction model',
    resolution: '9-25 km',
    apiKeyRequired: false,
    isFree: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    openMeteoModel: 'ecmwf_ifs025',
    color: '#3b82f6', // Bright Blue
    fillColor: 'rgba(59, 130, 246, 0.1)',
    icon: 'Cloud',
  },
  'gfs': {
    id: 'gfs',
    name: 'NOAA GFS',
    organization: 'National Oceanic and Atmospheric Administration',
    origin: 'USA 🇺🇸',
    description: 'United States flagship operational global forecast system',
    resolution: '13-25 km',
    apiKeyRequired: false,
    isFree: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    openMeteoModel: 'gfs_seamless',
    color: '#8b5cf6', // Purple
    fillColor: 'rgba(139, 92, 246, 0.1)',
    icon: 'CloudSun',
  },
  'icon': {
    id: 'icon',
    name: 'DWD ICON',
    organization: 'Deutscher Wetterdienst (German Weather Service)',
    origin: 'Germany 🇩🇪',
    description: 'High-precision non-hydrostatic global atmospheric model',
    resolution: '7-13 km',
    apiKeyRequired: false,
    isFree: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    openMeteoModel: 'icon_seamless',
    color: '#f59e0b', // Amber / Gold
    fillColor: 'rgba(245, 158, 11, 0.1)',
    icon: 'Sun',
  },
  'meteofrance': {
    id: 'meteofrance',
    name: 'Météo-France',
    organization: 'French National Meteorological Service',
    origin: 'France 🇫🇷',
    description: 'Leading European ARPEGE / AROME weather modeling system',
    resolution: '2.5-10 km',
    apiKeyRequired: false,
    isFree: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    openMeteoModel: 'meteofrance_seamless',
    color: '#06b6d4', // Cyan
    fillColor: 'rgba(6, 182, 212, 0.1)',
    icon: 'Cloud',
  },
  'gem': {
    id: 'gem',
    name: 'GEM (Canada)',
    organization: 'Canadian Meteorological Centre',
    origin: 'Canada 🇨🇦',
    description: 'Global Environmental Multiscale weather forecasting model',
    resolution: '15-25 km',
    apiKeyRequired: false,
    isFree: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    openMeteoModel: 'gem_seamless',
    color: '#ec4899', // Pink / Rose
    fillColor: 'rgba(236, 72, 153, 0.1)',
    icon: 'CloudLightning',
  },
  'openweathermap': {
    id: 'openweathermap',
    name: 'OpenWeatherMap',
    organization: 'OpenWeather Ltd',
    origin: 'UK / Global 🌐',
    description: 'Popular commercial weather API with global radar & satellite feeds',
    resolution: 'Station / Grid',
    apiKeyRequired: true,
    isFree: false,
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    color: '#f97316', // Orange
    fillColor: 'rgba(249, 115, 22, 0.1)',
    icon: 'Sun',
  },
  'weatherapi': {
    id: 'weatherapi',
    name: 'WeatherAPI',
    organization: 'WeatherAPI.com',
    origin: 'Global 🌐',
    description: 'Commercial weather service with real-time station feeds',
    resolution: 'Grid',
    apiKeyRequired: true,
    isFree: false,
    baseUrl: 'https://api.weatherapi.com/v1',
    color: '#6366f1', // Indigo
    fillColor: 'rgba(99, 102, 241, 0.1)',
    icon: 'CloudSun',
  },
  'visual-crossing': {
    id: 'visual-crossing',
    name: 'Visual Crossing',
    organization: 'Visual Crossing Corporation',
    origin: 'USA 🇺🇸',
    description: 'Professional weather data engine with historical analysis',
    resolution: 'Sub-hourly / Grid',
    apiKeyRequired: true,
    isFree: false,
    baseUrl: 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline',
    color: '#14b8a6', // Teal
    fillColor: 'rgba(20, 184, 166, 0.1)',
    icon: 'Shield',
  },
};

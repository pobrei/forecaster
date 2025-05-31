// GPX and Route Types
export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface GPXTrack {
  name?: string;
  points: GPXPoint[];
}

export interface GPXData {
  tracks: GPXTrack[];
  waypoints?: GPXPoint[];
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    time?: string;
  };
}

export interface RoutePoint {
  lat: number;
  lon: number;
  elevation?: number;
  distance: number; // cumulative distance in km
  estimatedTime?: Date;
}

export interface Route {
  id: string;
  name: string;
  points: RoutePoint[];
  totalDistance: number; // in km
  totalElevationGain?: number; // in meters
  estimatedDuration?: number; // in hours
}

// Weather Types
export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherData {
  lat: number;
  lon: number;
  dt: number; // Unix timestamp
  temp: number; // Celsius
  feels_like: number;
  pressure: number; // hPa
  humidity: number; // %
  dew_point: number;
  uvi: number;
  clouds: number; // %
  visibility: number; // meters
  wind_speed: number; // m/s
  wind_deg: number; // degrees
  wind_gust?: number; // m/s
  weather: WeatherCondition[];
  pop?: number; // Probability of precipitation (0-1)
  rain?: {
    "1h"?: number; // mm
  };
  snow?: {
    "1h"?: number; // mm
  };
}

export interface WeatherForecast {
  routePoint: RoutePoint;
  weather: WeatherData;
  alerts?: WeatherAlert[];
}

export interface WeatherAlert {
  type: 'wind' | 'temperature' | 'precipitation' | 'visibility' | 'general';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  startTime?: Date;
  endTime?: Date;
}

// Application State Types
export interface AppSettings {
  startTime: Date;
  averageSpeed: number; // km/h
  forecastInterval: number; // km
  units: 'metric' | 'imperial';
  timezone: string;
}

export interface AppState {
  gpxFile: File | null;
  route: Route | null;
  weatherForecasts: WeatherForecast[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Export Options
export interface ExportOptions {
  includeMap: boolean;
  includeCharts: boolean;
  includeWeatherDetails: boolean;
  includeAlerts: boolean;
  format: 'pdf' | 'json';
}

export interface UploadResponse {
  route: Route;
  message: string;
}

export interface WeatherResponse {
  forecasts: WeatherForecast[];
  cacheHit: boolean;
  message: string;
}

// Chart Data Types
export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
}

// Selected Point State
export interface SelectedWeatherPoint {
  forecastIndex: number;
  forecast: WeatherForecast;
  source: 'timeline' | 'chart' | 'map';
}

// Weather Summary Types
export interface WeatherSummaryStats {
  temperature: {
    min: number;
    max: number;
    avg: number;
    range: number;
  };
  wind: {
    min: number;
    max: number;
    avg: number;
    maxGust?: number;
  };
  precipitation: {
    total: number;
    maxHourly: number;
    rainyPoints: number;
    totalPoints: number;
  };
  atmospheric: {
    humidity: { min: number; max: number; avg: number };
    pressure: { min: number; max: number; avg: number };
    visibility: { min: number; max: number; avg: number };
  };
  alerts: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

// Export/PDF Types
export interface ExportOptions {
  includeMap: boolean;
  includeCharts: boolean;
  includeWeatherDetails: boolean;
  includeAlerts: boolean;
  format: 'pdf' | 'json';
}

// Database Types (for caching)
export interface CachedWeatherData {
  _id?: string;
  lat: number;
  lon: number;
  timestamp: Date;
  data: WeatherData;
  expiresAt: Date;
}

export interface CachedRoute {
  _id?: string;
  hash: string; // Hash of GPX file content
  route: Route;
  createdAt: Date;
  lastAccessed: Date;
}

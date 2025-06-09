// Application Constants

// Weather API Configuration
export const WEATHER_API = {
  // Legacy OpenWeatherMap (fallback)
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  RATE_LIMIT: {
    MAX_REQUESTS: 60,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
} as const;

// Open-Meteo API Configuration (Primary)
export const OPEN_METEO_API = {
  BASE_URL: 'https://api.open-meteo.com/v1',
  RATE_LIMIT: {
    MAX_REQUESTS: 600, // Very generous
    WINDOW_MS: 60 * 1000, // 1 minute
  },
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
  FEATURES: {
    NO_API_KEY_REQUIRED: true,
    FREE_TIER: true,
    OPEN_SOURCE: true,
    HIGH_ACCURACY: true
  }
} as const;

// GPX File Constraints
export const GPX_CONSTRAINTS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB (increased for GPX files with elevation and more data)
  MAX_WAYPOINTS: 2000, // Increased from 500 to 2000
  SUPPORTED_FORMATS: ['.gpx'],
  // iOS Safari often doesn't provide MIME types or uses different ones
  MIME_TYPES: [
    'application/gpx+xml',
    'text/xml',
    'application/xml',
    'application/octet-stream', // iOS Safari fallback
    'text/plain', // Sometimes used by mobile browsers
    '', // Empty MIME type (common on iOS Safari)
  ],
} as const;

// Route Configuration
export const ROUTE_CONFIG = {
  DEFAULT_SPEED: 15, // km/h
  MIN_SPEED: 1,
  MAX_SPEED: 100,
  DEFAULT_INTERVAL: 5, // km
  MIN_INTERVAL: 1,
  MAX_INTERVAL: 50,
} as const;

// Weather Alert Thresholds
export const WEATHER_THRESHOLDS = {
  WIND: {
    HIGH: 10, // m/s (36 km/h)
    EXTREME: 17, // m/s (61 km/h)
  },
  TEMPERATURE: {
    FREEZING: 0, // °C
    HOT: 30, // °C
    EXTREME_HOT: 40, // °C
    EXTREME_COLD: -10, // °C
  },
  PRECIPITATION: {
    LIGHT: 0.1, // mm/h
    MODERATE: 2.5, // mm/h
    HEAVY: 10, // mm/h
    EXTREME: 50, // mm/h
  },
  VISIBILITY: {
    POOR: 1000, // meters
    VERY_POOR: 200, // meters
  },
  HUMIDITY: {
    HIGH: 80, // %
    VERY_HIGH: 95, // %
  },
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  COLORS: {
    TEMPERATURE: '#ef4444',
    PRECIPITATION: '#3b82f6',
    WIND: '#10b981',
    HUMIDITY: '#8b5cf6',
    PRESSURE: '#f59e0b',
    ELEVATION: '#6b7280',
  },
  ANIMATION_DURATION: 300,
} as const;

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [51.505, -0.09] as [number, number],
  DEFAULT_ZOOM: 13,
  MAX_ZOOM: 18,
  MIN_ZOOM: 3,
  TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ATTRIBUTION: '© OpenStreetMap contributors',
} as const;

// Export Configuration
export const EXPORT_CONFIG = {
  PDF: {
    FORMAT: 'a4' as const,
    ORIENTATION: 'portrait' as const,
    MARGIN: 20,
    QUALITY: 0.95,
  },
  IMAGE: {
    FORMAT: 'png' as const,
    QUALITY: 0.95,
    SCALE: 2,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GPX: {
    INVALID_FILE: 'Please select a valid GPX file',
    FILE_TOO_LARGE: `File size must be less than ${GPX_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
    PARSE_ERROR: 'Failed to parse GPX file. Please check the file format.',
    NO_TRACKS: 'No valid tracks found in the GPX file',
    TOO_MANY_POINTS: `Route has too many points. Maximum allowed: ${GPX_CONSTRAINTS.MAX_WAYPOINTS}`,
  },
  WEATHER: {
    API_ERROR: 'Failed to fetch weather data. Please try again.',
    RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
    INVALID_COORDINATES: 'Invalid coordinates in the route',
    NO_DATA: 'No weather data available for this location',
  },
  GENERAL: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    VALIDATION_ERROR: 'Please check your input and try again.',
  },
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  GPX_UPLOADED: 'GPX file uploaded successfully',
  WEATHER_LOADED: 'Weather forecast generated successfully',
  PDF_EXPORTED: 'PDF report exported successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;

// Time Formats
export const TIME_FORMATS = {
  DATE: 'MMM dd, yyyy',
  TIME: 'HH:mm',
  DATETIME: 'MMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
} as const;

// Units
export const UNITS = {
  METRIC: {
    TEMPERATURE: '°C',
    SPEED: 'km/h',
    DISTANCE: 'km',
    ELEVATION: 'm',
    PRESSURE: 'hPa',
    PRECIPITATION: 'mm',
    WIND_SPEED: 'm/s',
  },
  IMPERIAL: {
    TEMPERATURE: '°F',
    SPEED: 'mph',
    DISTANCE: 'mi',
    ELEVATION: 'ft',
    PRESSURE: 'inHg',
    PRECIPITATION: 'in',
    WIND_SPEED: 'mph',
  },
} as const;

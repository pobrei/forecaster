// Formatting utilities for the Forecaster app

import { UNITS } from './constants';

/**
 * Format temperature based on unit system
 */
export function formatTemperature(temp: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const fahrenheit = (temp * 9/5) + 32;
    return `${Math.round(fahrenheit)}${UNITS.IMPERIAL.TEMPERATURE}`;
  }
  return `${Math.round(temp)}${UNITS.METRIC.TEMPERATURE}`;
}

/**
 * Format wind speed based on unit system
 */
export function formatWindSpeed(speed: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const mph = speed * 2.237;
    return `${Math.round(mph)} ${UNITS.IMPERIAL.WIND_SPEED}`;
  }
  return `${Math.round(speed)} ${UNITS.METRIC.WIND_SPEED}`;
}

/**
 * Format distance based on unit system
 */
export function formatDistance(distance: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const miles = distance * 0.621371;
    return `${miles.toFixed(1)} ${UNITS.IMPERIAL.DISTANCE}`;
  }
  return `${distance.toFixed(1)} ${UNITS.METRIC.DISTANCE}`;
}

/**
 * Format elevation based on unit system
 */
export function formatElevation(elevation: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const feet = elevation * 3.28084;
    return `${Math.round(feet)} ${UNITS.IMPERIAL.ELEVATION}`;
  }
  return `${Math.round(elevation)} ${UNITS.METRIC.ELEVATION}`;
}

/**
 * Format pressure based on unit system
 */
export function formatPressure(pressure: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const inHg = pressure * 0.02953;
    return `${inHg.toFixed(2)} ${UNITS.IMPERIAL.PRESSURE}`;
  }
  return `${pressure} ${UNITS.METRIC.PRESSURE}`;
}

/**
 * Format precipitation based on unit system
 */
export function formatPrecipitation(precipitation: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const inches = precipitation * 0.0393701;
    return `${inches.toFixed(2)} ${UNITS.IMPERIAL.PRECIPITATION}`;
  }
  return `${precipitation.toFixed(1)} ${UNITS.METRIC.PRECIPITATION}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format time duration in hours and minutes
 */
export function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string | undefined): string {
  if (!date) {
    return 'Invalid date';
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format time only
 */
export function formatTime(date: Date | string | undefined): string {
  if (!date) {
    return '--:--';
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format date only
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) {
    return 'Invalid date';
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format wind direction from degrees to cardinal direction
 */
export function formatWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Get wind direction arrow rotation based on degrees
 * Returns the CSS rotation angle for a CSS-based arrow pointing in the direction the wind is blowing towards
 */
export function getWindDirectionRotation(degrees: number): number {
  // Normalize degrees to 0-360 range
  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  // Return the rotation angle for CSS transform
  // Wind direction is where wind is coming FROM, but we want to show where it's blowing TO
  // So we add 180 degrees to flip the direction
  return (normalizedDegrees + 180) % 360;
}

/**
 * Get wind direction arrow symbol based on degrees
 * Returns a CSS class name for styling the arrow
 */
export function getWindDirectionArrow(_degrees: number): string {
  void _degrees;
  // For backward compatibility, return a simple arrow character
  // This will be replaced by CSS-based arrows in the UI components
  return '→';
}

/**
 * Format wind information with speed and direction
 */
export function formatWindInfo(speed: number, degrees: number, unit: 'metric' | 'imperial' = 'metric'): string {
  const speedStr = formatWindSpeed(speed, unit);
  const direction = formatWindDirection(degrees);
  const arrow = getWindDirectionArrow(degrees);
  return `${speedStr} ${arrow} ${direction}`;
}

/**
 * Format weather condition for display
 */
export function formatWeatherCondition(condition: string): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1).toLowerCase();
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

/**
 * Aerodynamic relative wind type
 */
export type RelativeWindType = 'Headwind' | 'Tailwind' | 'Crosswind';

export interface RelativeWindAnalysis {
  heading: number;           // Course heading in degrees (0-360)
  windSpeed: number;         // Wind speed in m/s (or input units)
  windDeg: number;           // Direction wind is coming FROM (0-360)
  relAngle: number;          // Angular difference between wind origin and heading (0-180)
  parallelSpeed: number;     // Effective headwind/tailwind component magnitude
  crosswindSpeed: number;    // Effective perpendicular crosswind component
  isHeadwind: boolean;       // True if wind opposes forward motion
  isTailwind: boolean;       // True if wind aids forward motion
  isCrosswind: boolean;      // True if wind is primarily lateral
  type: RelativeWindType;    // 'Headwind' | 'Tailwind' | 'Crosswind'
  description: string;       // Human-readable summary description
}

/**
 * Calculate compass bearing between two coordinates in degrees (0-360)
 */
export function calculateBearing(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): number {
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;

  return (brng + 360) % 360;
}

/**
 * Compute aerodynamic relative wind vector relative to route heading.
 * In meteorology, windDeg is where the wind blows FROM.
 * Heading is where the traveler is MOVING TOWARDS.
 * When windDeg == heading, wind is blowing directly in face => HEADWIND.
 * When windDeg == (heading + 180), wind is blowing from behind => TAILWIND.
 */
export function getRelativeWind(
  heading: number,
  windSpeed: number,
  windDeg: number
): RelativeWindAnalysis {
  // Angular difference between wind origin and heading: 0° = direct face, 180° = direct back
  const rawDiff = Math.abs(((windDeg - heading + 180) % 360 + 360) % 360 - 180);
  const diffRad = (rawDiff * Math.PI) / 180;

  // Headwind component: positive when opposing motion, negative when aiding
  const parallelComponent = windSpeed * Math.cos(diffRad);
  const parallelSpeed = Math.round(Math.abs(parallelComponent) * 10) / 10;
  const crosswindSpeed = Math.round(Math.abs(windSpeed * Math.sin(diffRad)) * 10) / 10;

  let type: RelativeWindType = 'Crosswind';
  if (windSpeed >= 0.5) {
    if (rawDiff <= 65) {
      type = 'Headwind';
    } else if (rawDiff >= 115) {
      type = 'Tailwind';
    } else {
      type = 'Crosswind';
    }
  }

  const isHeadwind = type === 'Headwind';
  const isTailwind = type === 'Tailwind';
  const isCrosswind = type === 'Crosswind';

  const description =
    type === 'Headwind'
      ? `Headwind (${parallelSpeed})`
      : type === 'Tailwind'
      ? `Tailwind (+${parallelSpeed})`
      : `Crosswind (${crosswindSpeed})`;

  return {
    heading: Math.round(heading),
    windSpeed,
    windDeg: Math.round(windDeg),
    relAngle: Math.round(rawDiff),
    parallelSpeed,
    crosswindSpeed,
    isHeadwind,
    isTailwind,
    isCrosswind,
    type,
    description,
  };
}

/**
 * Find route course bearing at a specific distance along route points
 */
export function getRouteBearingAtDistance(
  points: { lat: number; lon: number; distance: number }[],
  distance: number
): number {
  if (!points || points.length < 2) return 0;

  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(points[i].distance - distance);
    if (d < minDiff) {
      minDiff = d;
      closestIdx = i;
    }
  }

  const prevIdx = Math.max(0, closestIdx - 1);
  const nextIdx = Math.min(points.length - 1, closestIdx + 1);

  if (prevIdx === nextIdx) {
    return 0;
  }

  return calculateBearing(points[prevIdx], points[nextIdx]);
}

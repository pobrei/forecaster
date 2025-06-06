import { GPXData, GPXPoint, GPXTrack, Route, RoutePoint } from '@/types';
import { GPX_CONSTRAINTS, ROUTE_CONFIG, ERROR_MESSAGES } from './constants';
import crypto from 'crypto';
import { DOMParser } from '@xmldom/xmldom';

/**
 * GPX Parser Configuration
 */
export interface GPXParserConfig {
  maxFileSize?: number;
  maxWaypoints?: number;
  enableSampling?: boolean;
  validateCoordinates?: boolean;
}

/**
 * GPX Parser Result
 */
export interface GPXParserResult {
  route: Route;
  metadata: {
    originalPointCount: number;
    sampledPointCount: number;
    processingTime: number;
    fileSize: number;
    hash: string;
  };
}

/**
 * GPX Validation Result
 */
export interface GPXValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate elevation gain from elevation profile
 */
function calculateElevationGain(points: RoutePoint[]): number {
  let totalGain = 0;
  for (let i = 1; i < points.length; i++) {
    const prevElevation = points[i - 1].elevation || 0;
    const currentElevation = points[i].elevation || 0;
    if (currentElevation > prevElevation) {
      totalGain += currentElevation - prevElevation;
    }
  }
  return totalGain;
}

/**
 * Validate GPX file constraints with enhanced validation
 */
export function validateGPXFile(file: File, config: GPXParserConfig = {}): GPXValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxFileSize = config.maxFileSize || GPX_CONSTRAINTS.MAX_FILE_SIZE;

  console.log('Validating GPX file:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  });

  // Check file size
  if (file.size > maxFileSize) {
    errors.push(ERROR_MESSAGES.GPX.FILE_TOO_LARGE);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // More lenient file extension check for mobile compatibility
  const fileName = file.name.toLowerCase();
  const hasGpxExtension = fileName.endsWith('.gpx');
  const hasValidMimeType = file.type === 'application/gpx+xml' ||
                          file.type === 'text/xml' ||
                          file.type === 'application/xml' ||
                          file.type === ''; // Allow empty MIME type (common on mobile)

  // Accept if it has .gpx extension OR if it's an XML-like file
  if (!hasGpxExtension && !hasValidMimeType && !fileName.includes('gpx')) {
    errors.push(ERROR_MESSAGES.GPX.INVALID_FILE);
  }

  // Add warnings for potential issues
  if (file.size > maxFileSize * 0.8) {
    warnings.push('File size is close to the maximum limit');
  }

  if (!hasGpxExtension && hasValidMimeType) {
    warnings.push('File does not have .gpx extension but appears to be XML');
  }

  const isValid = errors.length === 0;

  if (isValid) {
    console.log('File validation passed');
  } else {
    console.error('File validation failed:', { errors, warnings });
  }

  return { isValid, errors, warnings };
}

/**
 * Validate GPX content structure
 */
export function validateGPXContent(content: string): GPXValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('GPX content is empty');
    return { isValid: false, errors, warnings };
  }

  // Check if content looks like GPX (more flexible check)
  const contentLower = content.toLowerCase();
  const hasGpxTag = contentLower.includes('<gpx');
  const hasTrkptTag = contentLower.includes('<trkpt');
  const hasXmlDeclaration = contentLower.includes('<?xml');

  if (!hasGpxTag && !hasTrkptTag) {
    errors.push('Content does not appear to be a valid GPX file');
  }

  if (!hasXmlDeclaration) {
    warnings.push('Missing XML declaration');
  }

  // Check for potential XML issues
  const openTags = (content.match(/</g) || []).length;
  const closeTags = (content.match(/>/g) || []).length;

  if (Math.abs(openTags - closeTags) > 10) { // Allow some tolerance
    warnings.push('Potential XML structure issues detected');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Parse GPX XML content
 */
function parseGPXContent(xmlContent: string): GPXData {
  try {
    // Basic XML parsing - in a production app, you might want to use a proper XML parser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    // Extract metadata
    const metadataElements = xmlDoc.getElementsByTagName('metadata');
    const metadataElement = metadataElements[0];
    const metadata = metadataElement ? {
      name: metadataElement.getElementsByTagName('name')[0]?.textContent || undefined,
      description: metadataElement.getElementsByTagName('desc')[0]?.textContent || undefined,
      author: metadataElement.getElementsByTagName('author')[0]?.getElementsByTagName('name')[0]?.textContent || undefined,
      time: metadataElement.getElementsByTagName('time')[0]?.textContent || undefined,
    } : undefined;

    // Extract tracks
    const tracks: GPXTrack[] = [];
    const trackElements = xmlDoc.getElementsByTagName('trk');

    for (let i = 0; i < trackElements.length; i++) {
      const trackElement = trackElements[i];
      const trackNameElements = trackElement.getElementsByTagName('name');
      const trackName = trackNameElements[0]?.textContent || undefined;
      const points: GPXPoint[] = [];

      const trackPoints = trackElement.getElementsByTagName('trkpt');
      for (let j = 0; j < trackPoints.length; j++) {
        const trkpt = trackPoints[j];
        const lat = parseFloat(trkpt.getAttribute('lat') || '0');
        const lon = parseFloat(trkpt.getAttribute('lon') || '0');

        if (isNaN(lat) || isNaN(lon)) {
          continue; // Skip invalid points
        }

        const eleElements = trkpt.getElementsByTagName('ele');
        const timeElements = trkpt.getElementsByTagName('time');

        points.push({
          lat,
          lon,
          ele: eleElements[0] ? parseFloat(eleElements[0].textContent || '0') : undefined,
          time: timeElements[0]?.textContent || undefined,
        });
      }

      if (points.length > 0) {
        tracks.push({
          name: trackName,
          points
        });
      }
    }

    // Extract waypoints
    const waypoints: GPXPoint[] = [];
    const waypointElements = xmlDoc.getElementsByTagName('wpt');

    for (let i = 0; i < waypointElements.length; i++) {
      const wpt = waypointElements[i];
      const lat = parseFloat(wpt.getAttribute('lat') || '0');
      const lon = parseFloat(wpt.getAttribute('lon') || '0');

      if (!isNaN(lat) && !isNaN(lon)) {
        const eleElements = wpt.getElementsByTagName('ele');
        waypoints.push({
          lat,
          lon,
          ele: eleElements[0] ? parseFloat(eleElements[0].textContent || '0') : undefined,
        });
      }
    }

    return {
      tracks,
      waypoints: waypoints.length > 0 ? waypoints : undefined,
      metadata
    };
  } catch (error) {
    console.error('GPX parsing error:', error);
    throw new Error(ERROR_MESSAGES.GPX.PARSE_ERROR);
  }
}

/**
 * Convert GPX data to Route with distance calculations
 */
function convertGPXToRoute(gpxData: GPXData, routeId: string, config: GPXParserConfig = {}): Route {
  if (gpxData.tracks.length === 0) {
    throw new Error(ERROR_MESSAGES.GPX.NO_TRACKS);
  }

  // Use the first track (most common case)
  const track = gpxData.tracks[0];
  let gpxPoints = track.points;

  // If there are too many points, sample them to reduce the count
  const maxWaypoints = config.maxWaypoints || GPX_CONSTRAINTS.MAX_WAYPOINTS;
  const enableSampling = config.enableSampling !== false; // Default to true

  if (enableSampling && gpxPoints.length > maxWaypoints) {
    console.log(`GPX file has ${gpxPoints.length} points, sampling to ${maxWaypoints} points`);
    const sampleRate = Math.ceil(gpxPoints.length / maxWaypoints);
    gpxPoints = gpxPoints.filter((_, index) => index % sampleRate === 0);

    // Always include the last point
    if (gpxPoints[gpxPoints.length - 1] !== track.points[track.points.length - 1]) {
      gpxPoints.push(track.points[track.points.length - 1]);
    }

    console.log(`Sampled down to ${gpxPoints.length} points`);
  }

  // Convert GPX points to route points with distance calculations
  const routePoints: RoutePoint[] = [];
  let totalDistance = 0;

  gpxPoints.forEach((point, index) => {
    if (index > 0) {
      const prevPoint = gpxPoints[index - 1];
      const segmentDistance = calculateDistance(
        prevPoint.lat, prevPoint.lon,
        point.lat, point.lon
      );
      totalDistance += segmentDistance;
    }

    // Create estimated time, but validate it
    let estimatedTime: Date | undefined = undefined;
    if (point.time) {
      const timeDate = new Date(point.time);
      if (!isNaN(timeDate.getTime())) {
        estimatedTime = timeDate;
      }
    }

    routePoints.push({
      lat: point.lat,
      lon: point.lon,
      elevation: point.ele,
      distance: totalDistance,
      estimatedTime,
    });
  });

  const totalElevationGain = calculateElevationGain(routePoints);
  const estimatedDuration = totalDistance / ROUTE_CONFIG.DEFAULT_SPEED; // hours

  return {
    id: routeId,
    name: track.name || gpxData.metadata?.name || 'Imported Route',
    points: routePoints,
    totalDistance,
    totalElevationGain,
    estimatedDuration,
  };
}

/**
 * Generate hash for GPX file content (for caching)
 */
export function generateGPXHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Sample route points at specified intervals
 */
export function sampleRoutePoints(route: Route, intervalKm: number = ROUTE_CONFIG.DEFAULT_INTERVAL): RoutePoint[] {
  if (intervalKm <= 0) {
    throw new Error('Interval must be greater than 0');
  }

  const sampledPoints: RoutePoint[] = [];
  let nextSampleDistance = 0;

  // Always include the first point
  if (route.points.length > 0) {
    sampledPoints.push(route.points[0]);
    nextSampleDistance = intervalKm;
  }

  // Sample points at intervals
  for (const point of route.points) {
    if (point.distance >= nextSampleDistance) {
      sampledPoints.push(point);
      nextSampleDistance += intervalKm;
    }
  }

  // Always include the last point if it's not already included
  const lastPoint = route.points[route.points.length - 1];
  if (sampledPoints.length === 0 || sampledPoints[sampledPoints.length - 1] !== lastPoint) {
    sampledPoints.push(lastPoint);
  }

  return sampledPoints;
}

/**
 * Enhanced GPX file parser with comprehensive validation and metadata
 */
export async function parseGPXFile(file: File, config: GPXParserConfig = {}): Promise<GPXParserResult> {
  const startTime = performance.now();

  try {
    console.log('Starting GPX file parsing for:', file.name);

    // Validate file
    const fileValidation = validateGPXFile(file, config);
    if (!fileValidation.isValid) {
      throw new Error(`File validation failed: ${fileValidation.errors.join(', ')}`);
    }

    // Read file content with better error handling
    let content: string;
    try {
      content = await file.text();
      console.log(`File content read successfully, length: ${content.length}`);
    } catch (readError) {
      console.error('Failed to read file content:', readError);
      throw new Error('Failed to read file content. Please try again.');
    }

    // Validate content structure
    const contentValidation = validateGPXContent(content);
    if (!contentValidation.isValid) {
      throw new Error(`Content validation failed: ${contentValidation.errors.join(', ')}`);
    }

    // Parse GPX content
    const gpxData = parseGPXContent(content);

    // Generate route ID and hash
    const hash = generateGPXHash(content);
    const routeId = hash.substring(0, 16);

    // Store original point count before conversion
    const originalPointCount = gpxData.tracks.reduce((total, track) => total + track.points.length, 0);

    // Convert to route
    const route = convertGPXToRoute(gpxData, routeId, config);

    const processingTime = performance.now() - startTime;

    console.log(`Successfully parsed GPX file: ${route.name}`);
    console.log(`Points: ${route.points.length}, Distance: ${route.totalDistance.toFixed(2)}km`);
    console.log(`Processing time: ${processingTime.toFixed(2)}ms`);

    return {
      route,
      metadata: {
        originalPointCount,
        sampledPointCount: route.points.length,
        processingTime,
        fileSize: file.size,
        hash
      }
    };
  } catch (error) {
    console.error('GPX parsing failed:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function parseGPXFileSimple(file: File): Promise<Route> {
  const result = await parseGPXFile(file);
  return result.route;
}

/**
 * Validate route data
 */
export function validateRoute(route: Route): boolean {
  if (!route.points || route.points.length < 2) {
    return false;
  }

  // Check if all points have valid coordinates
  return route.points.every(point => 
    typeof point.lat === 'number' && 
    typeof point.lon === 'number' &&
    point.lat >= -90 && point.lat <= 90 &&
    point.lon >= -180 && point.lon <= 180
  );
}

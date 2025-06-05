import { GPXData, GPXPoint, GPXTrack, Route, RoutePoint } from '@/types';
import { GPX_CONSTRAINTS, ROUTE_CONFIG, ERROR_MESSAGES } from './constants';
import crypto from 'crypto';
import { DOMParser } from '@xmldom/xmldom';

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
 * Validate GPX file constraints
 */
function validateGPXFile(file: File): void {
  console.log('Validating GPX file:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  });

  // Check file size
  if (file.size > GPX_CONSTRAINTS.MAX_FILE_SIZE) {
    throw new Error(ERROR_MESSAGES.GPX.FILE_TOO_LARGE);
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
    console.error('File validation failed:', { fileName, hasGpxExtension, hasValidMimeType, fileType: file.type });
    throw new Error(ERROR_MESSAGES.GPX.INVALID_FILE);
  }

  console.log('File validation passed');
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
function convertGPXToRoute(gpxData: GPXData, routeId: string): Route {
  if (gpxData.tracks.length === 0) {
    throw new Error(ERROR_MESSAGES.GPX.NO_TRACKS);
  }

  // Use the first track (most common case)
  const track = gpxData.tracks[0];
  let gpxPoints = track.points;

  // If there are too many points, sample them to reduce the count
  if (gpxPoints.length > GPX_CONSTRAINTS.MAX_WAYPOINTS) {
    console.log(`GPX file has ${gpxPoints.length} points, sampling to ${GPX_CONSTRAINTS.MAX_WAYPOINTS} points`);
    const sampleRate = Math.ceil(gpxPoints.length / GPX_CONSTRAINTS.MAX_WAYPOINTS);
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
 * Main function to parse GPX file
 */
export async function parseGPXFile(file: File): Promise<Route> {
  try {
    console.log('Starting GPX file parsing for:', file.name);

    // Validate file
    validateGPXFile(file);

    // Read file content with better error handling
    let content: string;
    try {
      content = await file.text();
      console.log(`File content read successfully, length: ${content.length}`);
    } catch (readError) {
      console.error('Failed to read file content:', readError);
      throw new Error('Failed to read file content. Please try again.');
    }

    // Check if content looks like GPX (more flexible check)
    const contentLower = content.toLowerCase();
    const hasGpxTag = contentLower.includes('<gpx');
    const hasTrkptTag = contentLower.includes('<trkpt');
    const hasXmlDeclaration = contentLower.includes('<?xml');

    console.log('Content analysis:', { hasGpxTag, hasTrkptTag, hasXmlDeclaration, contentLength: content.length });

    if (!hasGpxTag && !hasTrkptTag) {
      console.error('Content does not appear to be a GPX file');
      throw new Error(ERROR_MESSAGES.GPX.PARSE_ERROR);
    }

    // Parse GPX content
    const gpxData = parseGPXContent(content);

    // Generate route ID
    const routeId = generateGPXHash(content).substring(0, 16);

    // Convert to route
    const route = convertGPXToRoute(gpxData, routeId);

    console.log(`Successfully parsed GPX file: ${route.name}`);
    console.log(`Points: ${route.points.length}, Distance: ${route.totalDistance.toFixed(2)}km`);

    return route;
  } catch (error) {
    console.error('GPX parsing failed:', error);
    throw error;
  }
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

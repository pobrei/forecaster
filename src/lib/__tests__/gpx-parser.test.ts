import { 
  validateGPXFile, 
  validateGPXContent, 
  parseGPXFile, 
  parseGPXFileSimple,
  generateGPXHash, 
  sampleRoutePoints,
  validateRoute 
} from '../gpx-parser';
import { GPXParserConfig } from '../gpx-parser';

// Mock file for testing
const createMockFile = (content: string, name: string = 'test.gpx', type: string = 'application/gpx+xml'): File => {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Mock the text() method for Node.js environment
  Object.defineProperty(file, 'text', {
    value: async () => content,
    writable: false
  });

  return file;
};

// Sample GPX content for testing
const validGPXContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata>
    <name>Test Route</name>
    <desc>A test route for unit testing</desc>
  </metadata>
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2023-01-01T12:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7849" lon="-122.4094">
        <ele>15</ele>
        <time>2023-01-01T12:01:00Z</time>
      </trkpt>
      <trkpt lat="37.7949" lon="-122.3994">
        <ele>20</ele>
        <time>2023-01-01T12:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const invalidGPXContent = `<html><body>Not a GPX file</body></html>`;

describe('GPX Parser', () => {
  describe('validateGPXFile', () => {
    it('should validate a correct GPX file', () => {
      const file = createMockFile(validGPXContent);
      const result = validateGPXFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const file = createMockFile(validGPXContent);
      const config: GPXParserConfig = { maxFileSize: 100 }; // Very small limit
      
      const result = validateGPXFile(file, config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size must be less than 5MB');
    });

    it('should reject empty files', () => {
      const file = createMockFile('');
      const result = validateGPXFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject files without GPX extension or valid MIME type', () => {
      const file = createMockFile(validGPXContent, 'test.txt', 'text/plain');
      const result = validateGPXFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about large files approaching the limit', () => {
      const largeContent = validGPXContent.repeat(100);
      const file = createMockFile(largeContent);
      const config: GPXParserConfig = { maxFileSize: largeContent.length * 1.1 }; // Just above content size
      
      const result = validateGPXFile(file, config);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File size is close to the maximum limit');
    });
  });

  describe('validateGPXContent', () => {
    it('should validate correct GPX content', () => {
      const result = validateGPXContent(validGPXContent);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const result = validateGPXContent('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GPX content is empty');
    });

    it('should reject non-GPX content', () => {
      const result = validateGPXContent(invalidGPXContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content does not appear to be a valid GPX file');
    });

    it('should warn about missing XML declaration', () => {
      const contentWithoutDeclaration = validGPXContent.replace('<?xml version="1.0" encoding="UTF-8"?>', '');
      const result = validateGPXContent(contentWithoutDeclaration);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Missing XML declaration');
    });
  });

  describe('generateGPXHash', () => {
    it('should generate consistent hashes for the same content', () => {
      const hash1 = generateGPXHash(validGPXContent);
      const hash2 = generateGPXHash(validGPXContent);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateGPXHash(validGPXContent);
      const hash2 = generateGPXHash(validGPXContent + ' ');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('parseGPXFile', () => {
    it('should parse a valid GPX file and return metadata', async () => {
      const file = createMockFile(validGPXContent);
      const result = await parseGPXFile(file);
      
      expect(result.route).toBeDefined();
      expect(result.route.name).toBe('Test Track');
      expect(result.route.points).toHaveLength(3);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.originalPointCount).toBe(3);
      expect(result.metadata.sampledPointCount).toBe(3);
      expect(result.metadata.fileSize).toBe(file.size);
      expect(result.metadata.hash).toHaveLength(64);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle sampling configuration', async () => {
      const file = createMockFile(validGPXContent);
      const config: GPXParserConfig = { 
        maxWaypoints: 2,
        enableSampling: true 
      };
      
      const result = await parseGPXFile(file, config);
      
      expect(result.route.points.length).toBeLessThanOrEqual(2);
      expect(result.metadata.sampledPointCount).toBeLessThanOrEqual(2);
    });

    it('should disable sampling when configured', async () => {
      const file = createMockFile(validGPXContent);
      const config: GPXParserConfig = { 
        maxWaypoints: 1,
        enableSampling: false 
      };
      
      const result = await parseGPXFile(file, config);
      
      expect(result.route.points).toHaveLength(3); // Should not be sampled
    });

    it('should throw error for invalid files', async () => {
      const file = createMockFile(invalidGPXContent);
      
      await expect(parseGPXFile(file)).rejects.toThrow();
    });
  });

  describe('parseGPXFileSimple', () => {
    it('should return only the route for backward compatibility', async () => {
      const file = createMockFile(validGPXContent);
      const route = await parseGPXFileSimple(file);
      
      expect(route).toBeDefined();
      expect(route.name).toBe('Test Track');
      expect(route.points).toHaveLength(3);
      expect(route.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('validateRoute', () => {
    it('should validate a correct route', () => {
      const route = {
        id: 'test',
        name: 'Test Route',
        points: [
          { lat: 37.7749, lon: -122.4194, distance: 0 },
          { lat: 37.7849, lon: -122.4094, distance: 1.5 }
        ],
        totalDistance: 1.5,
        totalElevationGain: 0,
        estimatedDuration: 0.1
      };
      
      expect(validateRoute(route)).toBe(true);
    });

    it('should reject routes with insufficient points', () => {
      const route = {
        id: 'test',
        name: 'Test Route',
        points: [{ lat: 37.7749, lon: -122.4194, distance: 0 }],
        totalDistance: 0,
        totalElevationGain: 0,
        estimatedDuration: 0
      };
      
      expect(validateRoute(route)).toBe(false);
    });

    it('should reject routes with invalid coordinates', () => {
      const route = {
        id: 'test',
        name: 'Test Route',
        points: [
          { lat: 91, lon: -122.4194, distance: 0 }, // Invalid latitude
          { lat: 37.7849, lon: -181, distance: 1.5 } // Invalid longitude
        ],
        totalDistance: 1.5,
        totalElevationGain: 0,
        estimatedDuration: 0.1
      };
      
      expect(validateRoute(route)).toBe(false);
    });
  });

  describe('sampleRoutePoints', () => {
    const mockRoute = {
      id: 'test',
      name: 'Test Route',
      points: [
        { lat: 37.7749, lon: -122.4194, distance: 0 },
        { lat: 37.7849, lon: -122.4094, distance: 2.5 },
        { lat: 37.7949, lon: -122.3994, distance: 5.0 },
        { lat: 37.8049, lon: -122.3894, distance: 7.5 },
        { lat: 37.8149, lon: -122.3794, distance: 10.0 }
      ],
      totalDistance: 10.0,
      totalElevationGain: 0,
      estimatedDuration: 0.67
    };

    it('should sample points at specified intervals', () => {
      const sampledPoints = sampleRoutePoints(mockRoute, 5);
      
      expect(sampledPoints).toHaveLength(3); // Start, middle (5km), end
      expect(sampledPoints[0].distance).toBe(0);
      expect(sampledPoints[1].distance).toBe(5.0);
      expect(sampledPoints[2].distance).toBe(10.0);
    });

    it('should always include first and last points', () => {
      const sampledPoints = sampleRoutePoints(mockRoute, 15); // Larger than total distance
      
      expect(sampledPoints).toHaveLength(2); // Start and end
      expect(sampledPoints[0]).toBe(mockRoute.points[0]);
      expect(sampledPoints[1]).toBe(mockRoute.points[4]);
    });

    it('should throw error for invalid interval', () => {
      expect(() => sampleRoutePoints(mockRoute, 0)).toThrow('Interval must be greater than 0');
      expect(() => sampleRoutePoints(mockRoute, -1)).toThrow('Interval must be greater than 0');
    });
  });
});

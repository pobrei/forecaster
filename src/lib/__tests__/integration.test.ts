/**
 * Integration tests for the enhanced Forecaster app features
 * Tests the interaction between GPX parsing, rate limiting, and dynamic imports
 */

import { NextRequest } from 'next/server';
import { parseGPXFile, validateGPXFile, generateGPXHash } from '../gpx-parser';
import { createRateLimiter } from '../rate-limiter';
import { formatTemperature, formatWindSpeed, formatDistance } from '../format';
import { cn, debounce, deepClone } from '../utils';

// Mock file for testing
const createMockFile = (content: string, name: string = 'test.gpx'): File => {
  const blob = new Blob([content], { type: 'application/gpx+xml' });
  const file = new File([blob], name, { type: 'application/gpx+xml' });

  // Mock the text() method for Node.js environment
  Object.defineProperty(file, 'text', {
    value: async () => content,
    writable: false
  });

  return file;
};

// Sample GPX content
const sampleGPXContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata>
    <name>Integration Test Route</name>
    <desc>A test route for integration testing</desc>
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

describe('Integration Tests', () => {
  describe('GPX Parser Integration', () => {
    it('should parse GPX file and return comprehensive metadata', async () => {
      const file = createMockFile(sampleGPXContent);
      const result = await parseGPXFile(file);

      // Verify route data
      expect(result.route).toBeDefined();
      expect(result.route.name).toBe('Test Track');
      expect(result.route.points).toHaveLength(3);
      expect(result.route.totalDistance).toBeGreaterThan(0);

      // Verify metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.originalPointCount).toBe(3);
      expect(result.metadata.sampledPointCount).toBe(3);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.fileSize).toBe(file.size);
      expect(result.metadata.hash).toHaveLength(64);

      // Verify hash consistency
      const hash1 = generateGPXHash(sampleGPXContent);
      const hash2 = generateGPXHash(sampleGPXContent);
      expect(hash1).toBe(hash2);
      expect(result.metadata.hash).toBe(hash1);
    });

    it('should handle GPX parsing with custom configuration', async () => {
      const file = createMockFile(sampleGPXContent);
      const config = {
        maxWaypoints: 2,
        enableSampling: true,
        validateCoordinates: true
      };

      const result = await parseGPXFile(file, config);

      expect(result.route.points.length).toBeLessThanOrEqual(2);
      expect(result.metadata.sampledPointCount).toBeLessThanOrEqual(2);
    });

    it('should validate GPX files with detailed feedback', () => {
      const file = createMockFile(sampleGPXContent);
      const validation = validateGPXFile(file);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should integrate rate limiting with API-like workflow', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 2
      });

      // Mock request
      const createMockRequest = (ip: string = '127.0.0.1') => {
        const url = 'http://localhost:3000/api/upload';

        // Create a mock request object that mimics NextRequest
        const mockRequest = {
          url,
          headers: new Map([['x-forwarded-for', ip]]),
          ip,
          geo: { country: 'US', city: 'San Francisco' }
        };

        // Add get method to headers
        mockRequest.headers.get = function(key: string) {
          return this.get(key);
        };

        return mockRequest as any; // Type assertion for testing
      };

      const request = createMockRequest();

      // First two requests should pass
      let result = await rateLimiter.isRateLimited(request);
      expect(result.limited).toBe(false);
      expect(result.count).toBe(1);

      result = await rateLimiter.isRateLimited(request);
      expect(result.limited).toBe(false);
      expect(result.count).toBe(2);

      // Third request should be limited
      result = await rateLimiter.isRateLimited(request);
      expect(result.limited).toBe(true);
      expect(result.count).toBe(3);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Formatting Integration', () => {
    it('should format weather data consistently across different units', () => {
      const temperature = 20; // Celsius
      const windSpeed = 10; // m/s
      const distance = 5.5; // km

      // Metric formatting
      expect(formatTemperature(temperature, 'metric')).toBe('20°C');
      expect(formatWindSpeed(windSpeed, 'metric')).toBe('10 m/s');
      expect(formatDistance(distance)).toBe('5.5 km');

      // Imperial formatting
      expect(formatTemperature(temperature, 'imperial')).toBe('68°F');
      expect(formatWindSpeed(windSpeed, 'imperial')).toBe('22 mph');
    });

    it('should handle edge cases in formatting', () => {
      expect(formatTemperature(0)).toBe('0°C');
      expect(formatWindSpeed(0)).toBe('0 m/s');
      expect(formatDistance(0)).toBe('0.0 km');
    });
  });

  describe('Utility Functions Integration', () => {
    it('should work together for complex data processing', () => {
      const weatherData = {
        temperature: 25.7,
        windSpeed: 12.3,
        humidity: 65,
        location: 'San Francisco'
      };

      // Deep clone for immutability
      const clonedData = deepClone(weatherData);
      expect(clonedData).toEqual(weatherData);
      expect(clonedData).not.toBe(weatherData);

      // Format data
      const formattedTemp = formatTemperature(clonedData.temperature);
      expect(formattedTemp).toBe('26°C'); // Rounded

      // Combine classes
      const className = cn(
        'weather-card',
        clonedData.humidity > 60 && 'high-humidity',
        'p-4'
      );
      expect(className).toContain('weather-card');
      expect(className).toContain('high-humidity');
      expect(className).toContain('p-4');
    });

    it('should handle debounced operations', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 50);

      // Call multiple times rapidly
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      // Should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Should be called once after delay
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('third');
        done();
      }, 60);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid GPX files gracefully', async () => {
      const invalidFile = createMockFile('<html>Not a GPX file</html>');
      
      await expect(parseGPXFile(invalidFile)).rejects.toThrow();
    });

    it('should validate file constraints', () => {
      const emptyFile = createMockFile('');
      const validation = validateGPXFile(emptyFile);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File is empty');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large GPX files efficiently', async () => {
      // Create a larger GPX file
      const largeGPXContent = sampleGPXContent.replace(
        '</trkseg>',
        Array.from({ length: 100 }, (_, i) => 
          `<trkpt lat="${37.7749 + i * 0.001}" lon="${-122.4194 + i * 0.001}">
            <ele>${10 + i}</ele>
            <time>2023-01-01T${12 + Math.floor(i / 60)}:${i % 60}:00Z</time>
          </trkpt>`
        ).join('\n') + '\n</trkseg>'
      );

      const file = createMockFile(largeGPXContent);
      const startTime = performance.now();
      
      const result = await parseGPXFile(file);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result.route.points.length).toBeGreaterThan(3);
      expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect configuration across different modules', async () => {
      const config = {
        maxWaypoints: 5,
        enableSampling: true,
        validateCoordinates: true
      };

      // Create a file with more points than the limit
      const manyPointsGPX = sampleGPXContent.replace(
        '</trkseg>',
        Array.from({ length: 10 }, (_, i) => 
          `<trkpt lat="${37.7749 + i * 0.01}" lon="${-122.4194 + i * 0.01}">
            <ele>${10 + i}</ele>
          </trkpt>`
        ).join('\n') + '\n</trkseg>'
      );

      const file = createMockFile(manyPointsGPX);
      const result = await parseGPXFile(file, config);

      // Should respect the maxWaypoints configuration
      expect(result.route.points.length).toBeLessThanOrEqual(config.maxWaypoints);
      expect(result.metadata.originalPointCount).toBeGreaterThan(config.maxWaypoints);
    });
  });
});

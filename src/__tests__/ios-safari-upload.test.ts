/**
 * Tests for iOS Safari file upload compatibility
 */

import { GPX_CONSTRAINTS } from '@/lib/constants';
import { secureFileValidationSchema } from '@/lib/validation';

describe('iOS Safari File Upload Compatibility', () => {
  // Mock File object that simulates iOS Safari behavior
  const createMockFile = (name: string, size: number, type: string = '') => {
    return {
      name,
      size,
      type,
      lastModified: Date.now()
    };
  };

  describe('MIME Type Validation', () => {
    it('should accept empty MIME type (common on iOS Safari)', () => {
      const file = createMockFile('test-route.gpx', 1024, '');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should accept application/octet-stream (iOS Safari fallback)', () => {
      const file = createMockFile('test-route.gpx', 1024, 'application/octet-stream');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should accept text/plain (sometimes used by mobile browsers)', () => {
      const file = createMockFile('test-route.gpx', 1024, 'text/plain');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should accept standard GPX MIME types', () => {
      const standardTypes = ['application/gpx+xml', 'text/xml', 'application/xml'];
      
      standardTypes.forEach(type => {
        const file = createMockFile('test-route.gpx', 1024, type);
        const result = secureFileValidationSchema.safeParse(file);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid MIME types', () => {
      const file = createMockFile('test-route.gpx', 1024, 'image/jpeg');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(false);
    });
  });

  describe('Filename Validation', () => {
    it('should accept filenames with spaces (common on iOS)', () => {
      const file = createMockFile('My Route File.gpx', 1024);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should accept filenames with hyphens and underscores', () => {
      const file = createMockFile('my-route_file.gpx', 1024);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should accept filenames with numbers', () => {
      const file = createMockFile('route-2024-01-15.gpx', 1024);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should reject files without .gpx extension', () => {
      const file = createMockFile('route.txt', 1024);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(false);
    });

    it('should reject filenames with path traversal attempts', () => {
      const file = createMockFile('../../../etc/passwd.gpx', 1024);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    it('should accept files within size limit', () => {
      const file = createMockFile('test-route.gpx', GPX_CONSTRAINTS.MAX_FILE_SIZE - 1000);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = createMockFile('test-route.gpx', GPX_CONSTRAINTS.MAX_FILE_SIZE + 1000);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(false);
    });

    it('should reject empty files', () => {
      const file = createMockFile('test-route.gpx', 0);
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(false);
    });
  });

  describe('iOS Safari Specific Cases', () => {
    it('should handle typical iOS Safari file upload scenario', () => {
      // iOS Safari often provides empty MIME type and basic filename
      const file = createMockFile('My GPX Route.gpx', 2048, '');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should handle iOS Files app scenario', () => {
      // Files app might use application/octet-stream
      const file = createMockFile('Downloaded Route.gpx', 1536, 'application/octet-stream');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });

    it('should handle AirDrop scenario', () => {
      // AirDrop might preserve original MIME type
      const file = createMockFile('Shared Route.gpx', 3072, 'application/gpx+xml');
      
      const result = secureFileValidationSchema.safeParse(file);
      expect(result.success).toBe(true);
    });
  });

  describe('Security Validation', () => {
    it('should reject files with dangerous characters in filename', () => {
      const dangerousNames = [
        'test<script>.gpx',
        'test&lt;script&gt;.gpx',
        'test%3Cscript%3E.gpx'
      ];
      
      dangerousNames.forEach(name => {
        const file = createMockFile(name, 1024);
        const result = secureFileValidationSchema.safeParse(file);
        expect(result.success).toBe(false);
      });
    });

    it('should accept safe filenames with various characters', () => {
      const safeNames = [
        'route.gpx',
        'my-route.gpx',
        'my_route.gpx',
        'route 2024.gpx',
        'route-01-15-2024.gpx',
        'GPS_Track_2024.01.15.gpx'
      ];
      
      safeNames.forEach(name => {
        const file = createMockFile(name, 1024);
        const result = secureFileValidationSchema.safeParse(file);
        expect(result.success).toBe(true);
      });
    });
  });
});

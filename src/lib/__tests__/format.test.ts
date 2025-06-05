import { formatWindDirection, getWindDirectionArrow, getWindDirectionRotation, formatWindInfo } from '../format';

describe('Wind Direction Functions', () => {
  describe('formatWindDirection', () => {
    it('should return correct cardinal directions', () => {
      expect(formatWindDirection(0)).toBe('N');
      expect(formatWindDirection(90)).toBe('E');
      expect(formatWindDirection(180)).toBe('S');
      expect(formatWindDirection(270)).toBe('W');
    });

    it('should handle intermediate directions', () => {
      expect(formatWindDirection(45)).toBe('NE');
      expect(formatWindDirection(135)).toBe('SE');
      expect(formatWindDirection(225)).toBe('SW');
      expect(formatWindDirection(315)).toBe('NW');
    });

    it('should handle values over 360 degrees', () => {
      expect(formatWindDirection(450)).toBe('E'); // 450 - 360 = 90
      expect(formatWindDirection(720)).toBe('N'); // 720 - 720 = 0
    });
  });

  describe('getWindDirectionArrow', () => {
    it('should return a simple arrow character', () => {
      expect(getWindDirectionArrow(0)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(90)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(180)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(270)).toBe('→'); // Returns simple arrow
    });

    it('should handle any degree value', () => {
      expect(getWindDirectionArrow(45)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(135)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(225)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(315)).toBe('→'); // Returns simple arrow
    });

    it('should handle negative values', () => {
      expect(getWindDirectionArrow(-90)).toBe('→'); // Returns simple arrow
      expect(getWindDirectionArrow(-45)).toBe('→'); // Returns simple arrow
    });
  });

  describe('getWindDirectionRotation', () => {
    it('should return correct rotation angles for cardinal directions', () => {
      expect(getWindDirectionRotation(0)).toBe(180); // North wind blows south
      expect(getWindDirectionRotation(90)).toBe(270); // East wind blows west
      expect(getWindDirectionRotation(180)).toBe(0); // South wind blows north
      expect(getWindDirectionRotation(270)).toBe(90); // West wind blows east
    });

    it('should handle values over 360 degrees', () => {
      expect(getWindDirectionRotation(450)).toBe(270); // Same as 90 degrees
      expect(getWindDirectionRotation(720)).toBe(180); // Same as 0 degrees
    });

    it('should handle negative values', () => {
      expect(getWindDirectionRotation(-90)).toBe(90); // Same as 270 degrees
      expect(getWindDirectionRotation(-180)).toBe(0); // Same as 180 degrees
    });
  });

  describe('formatWindInfo', () => {
    it('should format complete wind information in metric units', () => {
      const result = formatWindInfo(10, 90, 'metric');
      expect(result).toContain('10 m/s');
      expect(result).toContain('→'); // Simple arrow
      expect(result).toContain('E');
    });

    it('should format complete wind information in imperial units', () => {
      const result = formatWindInfo(10, 180, 'imperial');
      expect(result).toContain('mph');
      expect(result).toContain('→'); // Simple arrow
      expect(result).toContain('S');
    });
  });
});

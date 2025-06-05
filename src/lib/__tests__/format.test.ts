import { formatWindDirection, getWindDirectionArrow, formatWindInfo } from '../format';

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
    it('should return correct arrows for cardinal directions', () => {
      expect(getWindDirectionArrow(0)).toBe('↓'); // North wind blows south
      expect(getWindDirectionArrow(90)).toBe('←'); // East wind blows west
      expect(getWindDirectionArrow(180)).toBe('↑'); // South wind blows north
      expect(getWindDirectionArrow(270)).toBe('→'); // West wind blows east
    });

    it('should return correct arrows for intermediate directions', () => {
      expect(getWindDirectionArrow(45)).toBe('↙'); // NE wind blows SW
      expect(getWindDirectionArrow(135)).toBe('↖'); // SE wind blows NW
      expect(getWindDirectionArrow(225)).toBe('↗'); // SW wind blows NE
      expect(getWindDirectionArrow(315)).toBe('↘'); // NW wind blows SE
    });

    it('should handle negative values', () => {
      expect(getWindDirectionArrow(-90)).toBe('→'); // Same as 270
      expect(getWindDirectionArrow(-45)).toBe('↘'); // Same as 315
    });
  });

  describe('formatWindInfo', () => {
    it('should format complete wind information in metric units', () => {
      const result = formatWindInfo(10, 90, 'metric');
      expect(result).toContain('10 m/s');
      expect(result).toContain('←');
      expect(result).toContain('E');
    });

    it('should format complete wind information in imperial units', () => {
      const result = formatWindInfo(10, 180, 'imperial');
      expect(result).toContain('mph');
      expect(result).toContain('↑');
      expect(result).toContain('S');
    });
  });
});

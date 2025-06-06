import {
  formatWindDirection,
  getWindDirectionArrow,
  getWindDirectionRotation,
  formatWindInfo,
  formatTemperature,
  formatWindSpeed,
  formatDistance,
  formatDuration,
  formatElevation,
  formatDate,
  formatWeatherCondition,
  formatFileSize
} from '../format';

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

describe('Temperature Formatting', () => {
  describe('formatTemperature', () => {
    it('should format temperature in metric units by default', () => {
      expect(formatTemperature(20)).toBe('20°C');
      expect(formatTemperature(0)).toBe('0°C');
      expect(formatTemperature(-10)).toBe('-10°C');
    });

    it('should format temperature in imperial units', () => {
      expect(formatTemperature(20, 'imperial')).toBe('68°F');
      expect(formatTemperature(0, 'imperial')).toBe('32°F');
      expect(formatTemperature(-10, 'imperial')).toBe('14°F');
    });

    it('should round temperatures to nearest integer', () => {
      expect(formatTemperature(20.7)).toBe('21°C');
      expect(formatTemperature(20.3)).toBe('20°C');
      expect(formatTemperature(20.7, 'imperial')).toBe('69°F');
    });
  });
});

describe('Wind Speed Formatting', () => {
  describe('formatWindSpeed', () => {
    it('should format wind speed in metric units by default', () => {
      expect(formatWindSpeed(10)).toBe('10 m/s');
      expect(formatWindSpeed(0)).toBe('0 m/s');
      expect(formatWindSpeed(5.7)).toBe('6 m/s');
    });

    it('should format wind speed in imperial units', () => {
      expect(formatWindSpeed(10, 'imperial')).toBe('22 mph');
      expect(formatWindSpeed(0, 'imperial')).toBe('0 mph');
    });

    it('should round wind speeds to nearest integer', () => {
      expect(formatWindSpeed(10.7)).toBe('11 m/s');
      expect(formatWindSpeed(10.3)).toBe('10 m/s');
    });
  });
});

describe('Distance Formatting', () => {
  describe('formatDistance', () => {
    it('should format distances in kilometers', () => {
      expect(formatDistance(1.5)).toBe('1.5 km');
      expect(formatDistance(10)).toBe('10.0 km');
      expect(formatDistance(0.5)).toBe('0.5 km');
    });

    it('should handle zero distance', () => {
      expect(formatDistance(0)).toBe('0.0 km');
    });

    it('should format very small distances', () => {
      expect(formatDistance(0.01)).toBe('0.0 km');
      expect(formatDistance(0.05)).toBe('0.1 km');
    });
  });
});

describe('Duration Formatting', () => {
  describe('formatDuration', () => {
    it('should format duration in hours and minutes', () => {
      expect(formatDuration(1.5)).toBe('1h 30m');
      expect(formatDuration(2.25)).toBe('2h 15m');
      expect(formatDuration(0.5)).toBe('30m');
    });

    it('should handle whole hours', () => {
      expect(formatDuration(2)).toBe('2h');
      expect(formatDuration(1)).toBe('1h');
    });

    it('should handle minutes only', () => {
      expect(formatDuration(0.25)).toBe('15m');
      expect(formatDuration(0.75)).toBe('45m');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0m');
    });
  });
});

describe('File Size Formatting', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe('1.5 GB');
    });
  });
});

describe('Date Formatting', () => {
  describe('formatDate', () => {
    it('should format valid dates', () => {
      const date = new Date('2023-12-25');
      expect(formatDate(date)).toBe('Dec 25, 2023');
    });

    it('should format date strings', () => {
      expect(formatDate('2023-12-25')).toBe('Dec 25, 2023');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid date');
      expect(formatDate(undefined)).toBe('Invalid date');
    });

    it('should handle edge cases', () => {
      expect(formatDate('')).toBe('Invalid date');
      expect(formatDate(new Date('invalid'))).toBe('Invalid date');
    });
  });
});

describe('Weather Condition Formatting', () => {
  describe('formatWeatherCondition', () => {
    it('should capitalize weather conditions', () => {
      expect(formatWeatherCondition('clear sky')).toBe('Clear sky');
      expect(formatWeatherCondition('RAIN')).toBe('Rain');
      expect(formatWeatherCondition('scattered clouds')).toBe('Scattered clouds');
    });

    it('should handle empty strings', () => {
      expect(formatWeatherCondition('')).toBe('');
    });

    it('should handle single characters', () => {
      expect(formatWeatherCondition('a')).toBe('A');
    });
  });
});

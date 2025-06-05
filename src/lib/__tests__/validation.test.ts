import { validateRoute, validateWeatherData, validateAppSettings } from '../validation'

describe('Validation Functions', () => {
  describe('validateRoute', () => {
    it('should validate a correct route object', () => {
      const validRoute = {
        id: 'test-route-1',
        name: 'Test Route',
        description: 'A test route',
        points: [
          {
            lat: 41.16028,
            lon: 1.10038,
            elevation: 100,
            distance: 0,
            estimatedTime: new Date(),
          },
          {
            lat: 41.16734,
            lon: 1.047029,
            elevation: 120,
            distance: 1000,
            estimatedTime: new Date(),
          },
        ],
        totalDistance: 1000,
        totalElevationGain: 20,
        estimatedDuration: 3600,
        createdAt: new Date(),
      }

      expect(validateRoute(validRoute)).toBe(true)
    })

    it('should reject invalid route objects', () => {
      const invalidRoute = {
        id: 'test-route-1',
        name: '', // Empty name should fail
        points: [], // Empty points should fail
      }

      expect(validateRoute(invalidRoute)).toBe(false)
    })
  })

  describe('validateWeatherData', () => {
    it('should validate correct weather data', () => {
      const validWeatherData = {
        temperature: 20,
        feelsLike: 22,
        humidity: 65,
        pressure: 1013,
        windSpeed: 10,
        windDirection: 180,
        visibility: 10000,
        uvIndex: 5,
        cloudCover: 50,
        precipitation: 0,
        precipitationProbability: 20,
        weatherCondition: 'Clear',
        weatherDescription: 'Clear sky',
        icon: '01d',
        timestamp: new Date(),
      }

      expect(validateWeatherData(validWeatherData)).toBe(true)
    })

    it('should reject invalid weather data', () => {
      const invalidWeatherData = {
        temperature: 'hot', // Should be number
        humidity: 150, // Should be <= 100
      }

      expect(validateWeatherData(invalidWeatherData)).toBe(false)
    })
  })

  describe('validateAppSettings', () => {
    it('should validate correct app settings', () => {
      const validSettings = {
        startTime: new Date(),
        averageSpeed: 15,
        forecastInterval: 5,
        units: 'metric' as const,
        timezone: 'Europe/Madrid',
      }

      expect(validateAppSettings(validSettings)).toBe(true)
    })

    it('should reject invalid app settings', () => {
      const invalidSettings = {
        startTime: 'tomorrow', // Should be Date
        averageSpeed: -5, // Should be positive
        units: 'invalid', // Should be 'metric' or 'imperial'
      }

      expect(validateAppSettings(invalidSettings)).toBe(false)
    })
  })
})

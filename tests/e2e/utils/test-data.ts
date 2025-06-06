export const testRoutes = {
  shortRoute: {
    name: 'Short Test Route',
    points: [
      { lat: 40.7128, lng: -74.0060, ele: 10 },
      { lat: 40.7589, lng: -73.9851, ele: 15 }
    ]
  },
  longRoute: {
    name: 'Long Test Route',
    points: Array.from({ length: 50 }, (_, i) => ({
      lat: 40.7128 + (i * 0.001),
      lng: -74.0060 + (i * 0.001),
      ele: 10 + i
    }))
  },
  mountainRoute: {
    name: 'Mountain Test Route',
    points: [
      { lat: 46.8182, lng: 8.2275, ele: 1000 },
      { lat: 46.8200, lng: 8.2300, ele: 1200 },
      { lat: 46.8220, lng: 8.2350, ele: 1500 },
      { lat: 46.8250, lng: 8.2400, ele: 1800 },
      { lat: 46.8280, lng: 8.2450, ele: 2000 }
    ]
  }
};

export const mockWeatherData = {
  clear: {
    temp: 22,
    feels_like: 24,
    humidity: 65,
    pressure: 1013,
    wind_speed: 5.2,
    wind_deg: 180,
    weather: [{ main: 'Clear', description: 'clear sky' }]
  },
  rainy: {
    temp: 18,
    feels_like: 16,
    humidity: 85,
    pressure: 1008,
    wind_speed: 8.5,
    wind_deg: 225,
    weather: [{ main: 'Rain', description: 'light rain' }],
    rain: { '1h': 2.5 }
  },
  snowy: {
    temp: -2,
    feels_like: -8,
    humidity: 90,
    pressure: 1020,
    wind_speed: 12.0,
    wind_deg: 315,
    weather: [{ main: 'Snow', description: 'light snow' }],
    snow: { '1h': 1.2 }
  },
  windy: {
    temp: 15,
    feels_like: 10,
    humidity: 70,
    pressure: 1005,
    wind_speed: 25.0,
    wind_deg: 270,
    weather: [{ main: 'Clouds', description: 'broken clouds' }]
  }
};

export const testSettings = {
  default: {
    forecastInterval: 5,
    averageSpeed: 15,
    units: 'metric',
    startTime: new Date('2024-01-01T08:00:00Z')
  },
  fast: {
    forecastInterval: 10,
    averageSpeed: 30,
    units: 'metric',
    startTime: new Date('2024-01-01T06:00:00Z')
  },
  slow: {
    forecastInterval: 2,
    averageSpeed: 8,
    units: 'imperial',
    startTime: new Date('2024-01-01T10:00:00Z')
  }
};

export const createMockForecastResponse = (pointCount: number, weatherType: keyof typeof mockWeatherData = 'clear') => {
  const baseWeather = mockWeatherData[weatherType];
  
  return {
    forecasts: Array.from({ length: pointCount }, (_, i) => ({
      routePoint: {
        lat: 40.7128 + (i * 0.001),
        lng: -74.0060 + (i * 0.001),
        distance: i * 5,
        estimatedTime: new Date(Date.now() + i * 3600000)
      },
      weather: {
        ...baseWeather,
        temp: baseWeather.temp + (Math.random() - 0.5) * 4, // Add some variation
        humidity: Math.max(0, Math.min(100, baseWeather.humidity + (Math.random() - 0.5) * 20))
      }
    }))
  };
};

export const testSelectors = {
  fileInput: 'input[type="file"]',
  generateButton: '[data-testid="generate-forecast-btn"]',
  weatherCharts: '[data-testid="weather-charts"]',
  exportButton: '[data-testid="export-pdf-btn"]',
  mapContainer: '[data-testid="route-map"]',
  errorMessage: '[data-testid="error-message"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  successMessage: '[data-testid="gpx-success"]',
  temperatureChart: '[data-testid="temperature-chart"]',
  windChart: '[data-testid="wind-chart"]',
  precipitationChart: '[data-testid="precipitation-chart"]',
  chartTabWind: '[data-testid="chart-tab-wind"]',
  weatherSummary: '[data-testid="weather-summary"]',
  windInfo: '[data-testid="wind-info"]',
  mobileMenuToggle: '[data-testid="mobile-menu-toggle"]',
  mobileMenu: '[data-testid="mobile-menu"]',
  desktopSidebar: '[data-testid="desktop-sidebar"]',
  selectedPointMarker: '[data-testid="selected-point-marker"]'
};

export const testTimeouts = {
  short: 5000,
  medium: 10000,
  long: 30000,
  veryLong: 60000
};

export const createTestGPX = (points: Array<{ lat: number; lng: number; ele?: number }>, name = 'Test Route') => {
  const pointsXML = points.map((point, index) => `
    <trkpt lat="${point.lat}" lon="${point.lng}">
      ${point.ele ? `<ele>${point.ele}</ele>` : ''}
      <time>${new Date(Date.now() + index * 60000).toISOString()}</time>
    </trkpt>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Forecaster Test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <desc>A test route for E2E testing</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <desc>Test route for weather forecasting</desc>
    <trkseg>
      ${pointsXML}
    </trkseg>
  </trk>
</gpx>`;
};

export const performanceThresholds = {
  pageLoad: 5000, // 5 seconds
  apiResponse: 2000, // 2 seconds
  chartRender: 3000, // 3 seconds
  mapRender: 4000, // 4 seconds
  pdfGeneration: 10000 // 10 seconds
};

# 3.1 E2E Testing with Playwright

## Configuration Setup

### playwright.config.ts (Enhanced)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Core Test Examples

### tests/e2e/core-flow.spec.ts
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Forecaster Core Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete user journey: upload → map → weather → export', async ({ page }) => {
    // Step 1: Upload GPX file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-route.gpx'));
    
    // Wait for file processing
    await expect(page.locator('[data-testid="gpx-success"]')).toBeVisible({ timeout: 10000 });
    
    // Step 2: Verify map rendering
    await expect(page.locator('[data-testid="route-map"]')).toBeVisible();
    await expect(page.locator('.ol-viewport')).toBeVisible();
    
    // Step 3: Generate weather forecast
    await page.click('[data-testid="generate-forecast-btn"]');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="weather-charts"]')).toBeVisible({ timeout: 30000 });
    
    // Step 4: Interact with weather charts
    const chartCanvas = page.locator('canvas').first();
    await chartCanvas.click({ position: { x: 100, y: 100 } });
    
    // Verify map updates when chart point is clicked
    await expect(page.locator('[data-testid="selected-point-marker"]')).toBeVisible();
    
    // Step 5: Export PDF
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="export-pdf-btn"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/forecaster-report.*\.pdf/);
  });

  test('handles invalid GPX file gracefully', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/invalid.txt'));
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid GPX file');
  });

  test('responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
    
    // Test mobile interactions
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});
```

### tests/e2e/weather-integration.spec.ts
```typescript
import { test, expect } from '@playwright/test';

test.describe('Weather Integration', () => {
  test('weather API integration and chart rendering', async ({ page }) => {
    // Mock weather API for consistent testing
    await page.route('**/api/weather**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          forecasts: [
            {
              routePoint: { lat: 40.7128, lng: -74.0060, distance: 0 },
              weather: {
                temp: 22,
                feels_like: 24,
                humidity: 65,
                pressure: 1013,
                wind_speed: 5.2,
                wind_deg: 180,
                weather: [{ main: 'Clear', description: 'clear sky' }]
              }
            }
          ]
        })
      });
    });

    await page.goto('/');
    
    // Upload test GPX file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-route.gpx'));
    
    // Generate forecast
    await page.click('[data-testid="generate-forecast-btn"]');
    
    // Verify weather charts render
    await expect(page.locator('[data-testid="temperature-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="wind-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="precipitation-chart"]')).toBeVisible();
    
    // Test chart interactions
    await page.click('[data-testid="chart-tab-wind"]');
    await expect(page.locator('[data-testid="wind-chart"]')).toBeVisible();
    
    // Verify weather data display
    await expect(page.locator('[data-testid="weather-summary"]')).toContainText('22°C');
    await expect(page.locator('[data-testid="wind-info"]')).toContainText('5.2');
  });
});
```

## Page Object Models

### tests/e2e/pages/ForecastPage.ts
```typescript
import { Page, Locator } from '@playwright/test';

export class ForecastPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly generateButton: Locator;
  readonly weatherCharts: Locator;
  readonly exportButton: Locator;
  readonly mapContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('input[type="file"]');
    this.generateButton = page.locator('[data-testid="generate-forecast-btn"]');
    this.weatherCharts = page.locator('[data-testid="weather-charts"]');
    this.exportButton = page.locator('[data-testid="export-pdf-btn"]');
    this.mapContainer = page.locator('[data-testid="route-map"]');
  }

  async uploadGPXFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async generateForecast() {
    await this.generateButton.click();
  }

  async exportPDF() {
    const downloadPromise = this.page.waitForDownload();
    await this.exportButton.click();
    return await downloadPromise;
  }

  async selectChartPoint(chartIndex: number, x: number, y: number) {
    const chart = this.page.locator('canvas').nth(chartIndex);
    await chart.click({ position: { x, y } });
  }
}
```

## Test Fixtures

### tests/fixtures/test-route.gpx
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Forecaster Test">
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <ele>10</ele>
      </trkpt>
      <trkpt lat="40.7589" lon="-73.9851">
        <ele>15</ele>
      </trkpt>
      <trkpt lat="40.7831" lon="-73.9712">
        <ele>20</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>
```

## Test Data Management

### tests/e2e/utils/test-data.ts
```typescript
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
  }
};
```

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

  test('accessibility compliance', async ({ page }) => {
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check for proper form labels
    const inputs = page.locator('input[type="file"]');
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
      }
    }
  });

  test('performance metrics', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Assert reasonable load time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000); // 5 seconds
    
    // Check for performance markers
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });
    
    const entries = JSON.parse(performanceEntries);
    expect(entries.length).toBeGreaterThan(0);
  });
});

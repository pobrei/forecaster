import { test, expect } from '@playwright/test';
import { ForecastPage } from './pages/ForecastPage';
import { mockWeatherData, createMockForecastResponse, testTimeouts } from './utils/test-data';
import path from 'path';

test.describe('Weather Integration Tests', () => {
  let forecastPage: ForecastPage;

  test.beforeEach(async ({ page }) => {
    forecastPage = new ForecastPage(page);
    await forecastPage.goto();
  });

  test('handles successful weather API response', async ({ page }) => {
    const mockResponse = createMockForecastResponse(5, 'clear');
    await forecastPage.mockWeatherAPI(mockResponse);

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await expect(page.locator('[data-testid="gpx-success"]')).toBeVisible({ timeout: testTimeouts.medium });

    await forecastPage.generateForecast();
    await forecastPage.waitForWeatherCharts();

    // Verify charts are rendered
    await expect(page.locator('[data-testid="temperature-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="wind-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="precipitation-chart"]')).toBeVisible();

    // Verify weather data is displayed
    const weatherSummary = await forecastPage.getWeatherSummaryText();
    expect(weatherSummary).toContain('22°C'); // From mock data
  });

  test('handles weather API error gracefully', async ({ page }) => {
    await page.route('**/api/weather**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Weather service unavailable' })
      });
    });

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();

    await expect(forecastPage.errorMessage).toBeVisible({ timeout: testTimeouts.medium });
    await expect(forecastPage.errorMessage).toContainText('Weather service unavailable');
  });

  test('handles weather API rate limiting', async ({ page }) => {
    await page.route('**/api/weather**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Too many requests',
          retryAfter: 60 
        }),
        headers: {
          'Retry-After': '60'
        }
      });
    });

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();

    await expect(forecastPage.errorMessage).toBeVisible({ timeout: testTimeouts.medium });
    await expect(forecastPage.errorMessage).toContainText('Too many requests');
  });

  test('displays different weather conditions correctly', async ({ page }) => {
    const rainyResponse = createMockForecastResponse(3, 'rainy');
    await forecastPage.mockWeatherAPI(rainyResponse);

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();
    await forecastPage.waitForWeatherCharts();

    // Switch to precipitation chart
    await forecastPage.switchToChartTab('precipitation');
    await expect(page.locator('[data-testid="precipitation-chart"]')).toBeVisible();

    // Verify precipitation data is shown
    const precipitationInfo = await page.locator('[data-testid="precipitation-info"]').textContent();
    expect(precipitationInfo).toContain('2.5'); // From mock rainy data
  });

  test('chart interactions update map correctly', async ({ page }) => {
    const mockResponse = createMockForecastResponse(5, 'clear');
    await forecastPage.mockWeatherAPI(mockResponse);

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();
    await forecastPage.waitForWeatherCharts();

    // Click on a chart point
    await forecastPage.selectChartPoint(0, 100, 100);

    // Verify map updates
    await expect(page.locator('[data-testid="selected-point-marker"]')).toBeVisible({ timeout: testTimeouts.short });
  });

  test('handles large routes with progressive loading', async ({ page }) => {
    const largeResponse = createMockForecastResponse(150, 'clear');
    await forecastPage.mockWeatherAPI(largeResponse);

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();

    // Should show loading indicator for longer
    await expect(forecastPage.loadingSpinner).toBeVisible();
    
    // Eventually should complete
    await forecastPage.waitForWeatherCharts();
    await expect(page.locator('[data-testid="temperature-chart"]')).toBeVisible();
  });

  test('caches weather data correctly', async ({ page }) => {
    let apiCallCount = 0;
    
    await page.route('**/api/weather**', async route => {
      apiCallCount++;
      const mockResponse = createMockForecastResponse(5, 'clear');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    // First request
    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();
    await forecastPage.waitForWeatherCharts();

    expect(apiCallCount).toBe(1);

    // Second request with same file should use cache
    await page.reload();
    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();
    await forecastPage.waitForWeatherCharts();

    // Should still be 1 if caching works
    expect(apiCallCount).toBe(1);
  });

  test('handles network timeout gracefully', async ({ page }) => {
    await page.route('**/api/weather**', async route => {
      // Simulate network timeout by delaying response
      await new Promise(resolve => setTimeout(resolve, 35000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockForecastResponse(5, 'clear'))
      });
    });

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();

    // Should show timeout error
    await expect(forecastPage.errorMessage).toBeVisible({ timeout: testTimeouts.long });
    await expect(forecastPage.errorMessage).toContainText('timeout');
  });

  test('validates weather data format', async ({ page }) => {
    await page.route('**/api/weather**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          forecasts: [
            {
              // Invalid format - missing required fields
              routePoint: { lat: 40.7128 },
              weather: { temp: 'invalid' }
            }
          ]
        })
      });
    });

    await forecastPage.uploadGPXFile(path.join(__dirname, '../fixtures/test-route.gpx'));
    await forecastPage.generateForecast();

    await expect(forecastPage.errorMessage).toBeVisible({ timeout: testTimeouts.medium });
    await expect(forecastPage.errorMessage).toContainText('Invalid weather data');
  });
});

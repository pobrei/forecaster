import { Page, Locator } from '@playwright/test';

export class ForecastPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly generateButton: Locator;
  readonly weatherCharts: Locator;
  readonly exportButton: Locator;
  readonly mapContainer: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('input[type="file"]');
    this.generateButton = page.locator('[data-testid="generate-forecast-btn"]');
    this.weatherCharts = page.locator('[data-testid="weather-charts"]');
    this.exportButton = page.locator('[data-testid="export-pdf-btn"]');
    this.mapContainer = page.locator('[data-testid="route-map"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  async goto() {
    await this.page.goto('/');
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

  async waitForMapToLoad() {
    await this.mapContainer.waitFor({ state: 'visible' });
    await this.page.locator('.ol-viewport').waitFor({ state: 'visible' });
  }

  async waitForWeatherCharts() {
    await this.weatherCharts.waitFor({ state: 'visible', timeout: 30000 });
  }

  async switchToChartTab(tabName: string) {
    await this.page.click(`[data-testid="chart-tab-${tabName}"]`);
  }

  async getWeatherSummaryText() {
    return await this.page.locator('[data-testid="weather-summary"]').textContent();
  }

  async getWindInfo() {
    return await this.page.locator('[data-testid="wind-info"]').textContent();
  }

  async mockWeatherAPI(mockData: any) {
    await this.page.route('**/api/weather**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData)
      });
    });
  }

  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async toggleMobileMenu() {
    await this.page.click('[data-testid="mobile-menu-toggle"]');
  }

  async isMobileMenuVisible() {
    return await this.page.locator('[data-testid="mobile-menu"]').isVisible();
  }

  async isDesktopSidebarVisible() {
    return await this.page.locator('[data-testid="desktop-sidebar"]').isVisible();
  }
}

import { test, expect } from '@playwright/test';

test.describe('Forecaster Workstation Smoke Tests', () => {
  test('should load the workstation and render the split-screen layout', async ({ page }) => {
    await page.goto('/');

    // Check title contains Forecaster
    await expect(page).toHaveTitle(/Forecaster/i);

    // Verify telemetry header
    await expect(page.getByText(/FORECASTER/i).first()).toBeVisible();
    await expect(page.getByText(/ATMOSPHERIC EXPEDITION INTELLIGENCE/i)).toBeVisible();

    // Verify Left Panel sections
    await expect(page.getByText(/TELEMETRY INGESTION/i)).toBeVisible();
    await expect(page.getByText(/SPEED & ROUTE SAMPLING/i)).toBeVisible();
    await expect(page.getByText(/METEOROLOGICAL SUPERCOMPUTER MATRIX/i)).toBeVisible();

    // Verify Right Stage map container
    await expect(page.locator('#tactical-weather-map')).toBeVisible();
  });

  test('should load Alpine 45km test route and calculate pacing telemetry', async ({ page }) => {
    await page.goto('/');

    // Click "Load Alpine Test GPX (45 km)" button
    const loadAlpineBtn = page.getByRole('button', { name: /Load Alpine Test GPX \(45 km\)/i });
    await expect(loadAlpineBtn).toBeVisible();
    await loadAlpineBtn.click();

    // Verify route loaded in header and telemetry strip
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/EST. TIME:/i)).toBeVisible();
    await expect(page.getByText(/SAMPLES:/i)).toBeVisible();

    // Verify Primary CTA is enabled
    const synthesizeBtn = page.getByRole('button', { name: /SYNTHESIZE EXPEDITION FORECAST/i });
    await expect(synthesizeBtn).toBeEnabled();
  });

  test('should allow manual speed and interval configuration', async ({ page }) => {
    await page.goto('/');

    // Check speed input with steppers
    const decreaseSpeedBtn = page.getByTitle(/Decrease speed/i);
    const increaseSpeedBtn = page.getByTitle(/Increase speed/i);
    await expect(decreaseSpeedBtn).toBeVisible();
    await expect(increaseSpeedBtn).toBeVisible();

    // Check interval input with presets
    await expect(page.getByRole('button', { name: '2k' })).toBeVisible();
    await expect(page.getByRole('button', { name: '5k' })).toBeVisible();
    await expect(page.getByRole('button', { name: '10k' })).toBeVisible();
  });

  test('should render map HUD controls and layer selector', async ({ page }) => {
    await page.goto('/');

    // Check map HUD layer buttons
    await expect(page.getByText(/SATELLITE/i)).toBeVisible();
    await expect(page.getByText(/DARK/i)).toBeVisible();
    await expect(page.getByText(/B&W CLEAN/i)).toBeVisible();
  });
});

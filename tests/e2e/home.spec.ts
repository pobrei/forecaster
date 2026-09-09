import { test, expect } from '@playwright/test';

test.describe('Forecaster Workstation Smoke Tests', () => {
  test('should load the workstation and render the split-screen layout', async ({ page }) => {
    await page.goto('/');

    // Check title contains Forecaster
    await expect(page).toHaveTitle(/Forecaster/i);

    // Verify telemetry header
    await expect(page.getByText(/FORECASTER/i).first()).toBeVisible();
    await expect(page.getByText(/EXPEDITION METEOROLOGY/i)).toBeVisible();

    // Verify Left Panel sections
    await expect(page.getByText(/ROUTE INGESTION • GPX/i)).toBeVisible();
    await expect(page.getByText(/SPEED & ROUTE SAMPLING/i)).toBeVisible();
    await expect(page.getByText(/MODEL MATRIX/i)).toBeVisible();

    // Verify Right Stage map container
    await expect(page.getByText(/EXPEDITION GEOSPATIAL RADAR/i)).toBeVisible();
  });

  test('should load Alpine 45km test route and calculate pacing telemetry', async ({ page }) => {
    await page.goto('/');

    // Click "Load Sample Route (Alpine 45km)" button
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await expect(loadAlpineBtn).toBeVisible();
    await loadAlpineBtn.click({ force: true });

    // Verify route loaded in header and telemetry strip
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/EST. TIME:/i)).toBeVisible();
    await expect(page.getByText('SAMPLES:', { exact: true })).toBeVisible();

    // Verify Primary CTA is enabled
    const synthesizeBtn = page.getByRole('button', { name: /GENERATE FORECAST/i });
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
    await expect(page.getByRole('button', { name: '2k', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '5k', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '10k', exact: true })).toBeVisible();
  });

  test('should render map HUD controls and layer selector', async ({ page }) => {
    await page.goto('/');

    // Load sample route to activate interactive map
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await loadAlpineBtn.click({ force: true });
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible({ timeout: 5000 });

    // Check map HUD layer buttons in WeatherMap
    await expect(page.getByRole('button', { name: /SATELLITE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /DARK/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /B&W CLEAN/i })).toBeVisible();

    // Check Map HUD toggle controls
    await expect(page.getByRole('button', { name: 'RADAR', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'VECTORS', exact: true })).toBeVisible();
  });
});


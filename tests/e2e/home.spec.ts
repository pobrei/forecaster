import { test, expect } from '@playwright/test';

test.describe('Forecaster Smoke Tests', () => {
  test('should load the home page and render key elements', async ({ page }) => {
    await page.goto('/');

    // Check title contains Forecaster
    await expect(page).toHaveTitle(/Forecaster/i);

    // Verify main brand heading is present and visible
    const heading = page.getByRole('heading', { name: /Forecaster/i }).first();
    await expect(heading).toBeVisible();

    // Verify GPX upload or route section is rendered
    const uploadText = page.getByText(/Upload.*GPX|Drag.*drop/i).first();
    await expect(uploadText).toBeVisible();
  });

  test('should load sample expedition and render active dossier data', async ({ page }) => {
    await page.goto('/');

    // Check dossier files exist
    await expect(page.getByText(/FILE \/\/ 01/i).first()).toBeVisible();
    await expect(page.getByText(/FILE \/\/ 02/i).first()).toBeVisible();
    await expect(page.getByText(/FILE \/\/ 03/i).first()).toBeVisible();

    // Click sample expedition preset button
    const presetBtn = page.getByRole('button', { name: /Dolomites/i });
    await presetBtn.click();

    // Verify route telemetry strip is visible in File 01
    await expect(page.getByText(/EXPEDITION NAME/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/28.5 km/i).first()).toBeVisible();

    // Click Generate Weather Forecast
    const generateBtn = page.getByRole('button', { name: /Generate Weather Forecast/i });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Wait for weather metrics to be rendered in File 04
    await expect(page.getByText(/Peak wind velocity/i)).toBeVisible({ timeout: 15000 });

    // Capture screenshot of fully populated active dossier
    await page.screenshot({
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/dossier_active_preview.png',
      fullPage: true,
    });
  });
});

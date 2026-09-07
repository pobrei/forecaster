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

  test('should render weather source comparison toggle or controls', async ({ page }) => {
    await page.goto('/');

    // Check that weather source selector or weather settings exist
    const weatherSourceSection = page.getByText(/Weather Sources|Forecast Models|Compare/i).first();
    await expect(weatherSourceSection).toBeVisible();
  });
});

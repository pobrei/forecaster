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
    await expect(page.getByText(/Peak wind velocity/i)).toBeVisible({ timeout: 30000 });

    // Capture screenshot of fully populated active dossier
    await page.screenshot({
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/dossier_active_preview.png',
      fullPage: true,
    });
  });

  test('should support MongoDB Atlas archive saving and tab switching', async ({ page }) => {
    await page.goto('/');

    // Check Atlas sync badge is visible in header
    await expect(page.getByText(/ATLAS CLOUD SYNCED/i)).toBeVisible();

    // Switch to Atlas Archive tab in File 01
    const atlasTabBtn = page.getByRole('button', { name: /ATLAS ARCHIVE/i });
    await expect(atlasTabBtn).toBeVisible();
    await atlasTabBtn.click();

    // Verify empty state or expedition list
    const archiveInfo = page.getByText(/No saved expeditions in MongoDB Atlas|waypoints/i).first();
    await expect(archiveInfo).toBeVisible({ timeout: 10000 });

    // Switch back to Presets
    const presetsTabBtn = page.getByRole('button', { name: /PRESETS \(3\)/i });
    await presetsTabBtn.click();

    // Arm Dolomites route
    const presetBtn = page.getByRole('button', { name: /Dolomites/i });
    await presetBtn.click();

    // Verify "Save Expedition to Atlas Archive" button is present and enabled
    const saveAtlasBtn = page.getByRole('button', { name: /Save Expedition to Atlas Archive/i });
    await expect(saveAtlasBtn).toBeVisible();
    await saveAtlasBtn.click();

    // Check success toast notification
    await expect(page.getByText(/Archived.*in MongoDB Atlas/i)).toBeVisible({ timeout: 10000 });
  });

  test('should generate ultra-high-resolution PNG dossier export', async ({ page }) => {
    await page.goto('/');

    // Click sample expedition preset button
    const presetBtn = page.getByRole('button', { name: /Dolomites/i });
    await presetBtn.click();

    // Click Generate Weather Forecast
    const generateBtn = page.getByRole('button', { name: /Generate Weather Forecast/i });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Wait for weather metrics to be rendered
    await expect(page.getByText(/Peak wind velocity/i)).toBeVisible({ timeout: 30000 });

    // Scroll to FILE // 05 (Export)
    const exportBtn = page.getByRole('button', { name: /Export PNG Image/i });
    await exportBtn.scrollIntoViewIfNeeded();
    await expect(exportBtn).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await exportBtn.click();

    const download = await downloadPromise;
    const downloadPath = '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/exported_dossier_highres.png';
    await download.saveAs(downloadPath);

    // Verify file exists and has substantial size
    const fs = await import('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(100000);
  });
});

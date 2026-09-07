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

  test('should render expedition tablet with nature atmosphere and power standby', async ({ page }) => {
    await page.goto('/');

    // Check nature atmosphere WebGL canvas telemetry
    await expect(page.getByText(/NATURE ATMOSPHERE \/\/ WIND & LEAVES/i)).toBeVisible();

    // Check tablet status bar indicators
    await expect(page.getByText(/FIELD SLATE \/\/ WGS84 RECON/i)).toBeVisible();
    await expect(page.getByText(/98%/i)).toBeVisible();

    // Verify physical power button on tablet frame
    const powerBtn = page.getByRole('button', { name: /POWER \[ON\]/i });
    await expect(powerBtn).toBeVisible();

    // Click power button to enter standby mode
    await powerBtn.click();

    // Verify standby screen
    await expect(page.getByText(/EXPEDITION TABLET IN STANDBY/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/tablet_standby_preview.png',
      fullPage: false,
    });
    await expect(page.getByRole('button', { name: /AWAKE EXPEDITION SLATE/i })).toBeVisible();

    // Click awake button to restore tablet display
    const awakeBtn = page.getByRole('button', { name: /AWAKE EXPEDITION SLATE/i });
    await awakeBtn.click();

    // Verify tablet display restored
    await expect(page.getByText(/FILE \/\/ 01/i).first()).toBeVisible();

    // Capture screenshot of expedition tablet in desk view at initial scroll position
    await page.screenshot({
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/tablet_expedition_preview.png',
      fullPage: false,
    });

    // Verify tablet internal scroll container scrolls smoothly without window lag
    const scrollContainer = page.locator('.custom-slate-scrollbar');
    await expect(scrollContainer).toBeVisible();

    // Scroll container down 350px smoothly to inspect File 01 & File 02
    await scrollContainer.evaluate((el) => {
      el.scrollTo({ top: 350, behavior: 'smooth' });
    });
    await page.waitForTimeout(500);

    // Verify File 02 is reachable via internal scroll
    await expect(page.getByText(/FILE \/\/ 02/i).first()).toBeVisible();

    // Capture screenshot of expedition tablet scrolled state
    await page.screenshot({
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/tablet_scrolled_preview.png',
      fullPage: false,
    });
  });
});

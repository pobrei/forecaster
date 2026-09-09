import { test, expect } from '@playwright/test';

test.describe('Forecaster Expedition Lifecycle & Forecast Synthesis', () => {
  test('should load Alpine 45km route, toggle pacing presets, and synthesize weather forecast', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('/');
    await expect(page).toHaveTitle(/Forecaster/i);

    // 2. Load Alpine 45km sample route
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await expect(loadAlpineBtn).toBeVisible();
    await loadAlpineBtn.click({ force: true });

    // Verify route details loaded
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('EST. TIME:', { exact: true })).toBeVisible();
    await expect(page.getByText('SAMPLES:', { exact: true })).toBeVisible();

    // 3. Test Activity Pacing Presets
    const trailRunBtn = page.getByRole('button', { name: /Trail Running 9 km\/h/i });
    await expect(trailRunBtn).toBeVisible();
    await trailRunBtn.click({ force: true });

    // Check speed input updated to 9
    const speedInput = page.locator('input[type="number"]').first();
    await expect(speedInput).toHaveValue('9');

    // Test Quick Interval Presets
    const interval10kBtn = page.getByRole('button', { name: '10k', exact: true });
    await interval10kBtn.click({ force: true });
    const intervalInput = page.locator('input[type="number"]').nth(1);
    await expect(intervalInput).toHaveValue('10');

    // 4. Test Model Selection Matrix
    const consensusBtn = page.getByRole('button', { name: /CONSENSUS/i });
    await expect(consensusBtn).toBeVisible();
    await consensusBtn.click({ force: true });

    const divergenceBtn = page.getByRole('button', { name: /DIVERGENCE/i });
    await expect(divergenceBtn).toBeVisible();
    await divergenceBtn.click({ force: true });

    // 5. Test Map Layer Switching
    const darkMapBtn = page.getByRole('button', { name: /^dark$/i }).first();
    await darkMapBtn.click({ force: true });

    const bwMapBtn = page.getByRole('button', { name: /^b&w/i }).first();
    await bwMapBtn.click({ force: true });

    const satMapBtn = page.getByRole('button', { name: /^satellite$/i }).first();
    await satMapBtn.click({ force: true });

    // 6. Test Forecast Generation
    const generateBtn = page.getByRole('button', { name: /GENERATE FORECAST|RE-RUN WEATHER FORECAST/i });
    await expect(generateBtn).toBeEnabled();

    // Trigger forecast generation and wait for weather API
    const weatherPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/weather') && resp.status() === 200,
      { timeout: 25000 }
    ).catch(() => null);

    await generateBtn.click({ force: true });

    // Await response or confirmation
    await weatherPromise;
    await expect(
      page.getByRole('button', { name: /RE-RUN WEATHER FORECAST/i })
    ).toBeVisible({ timeout: 25000 });
  });

  test('should support navigating to dedicated Model Comparison Suite and Dossier Export', async ({ page }) => {
    await page.goto('/');

    // Load sample route first
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await loadAlpineBtn.click({ force: true });
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible({ timeout: 5000 });

    // Click "MODEL COMPARISON" button in header
    const comparisonStageBtn = page.getByRole('button', { name: /MODEL COMPARISON/i }).first();
    await expect(comparisonStageBtn).toBeVisible();
    await comparisonStageBtn.click({ force: true });

    // Verify dedicated comparison suite is rendered
    await expect(page.getByText(/METEOROLOGICAL SUPERCOMPUTER MATRIX/i).first()).toBeVisible();
    await expect(page.getByText(/SYNOPTIC AGREEMENT/i).first()).toBeVisible();
    await expect(page.getByText(/POLYLINE ENSEMBLE CROSS-SECTION/i)).toBeVisible();
    await expect(page.getByText(/WAYPOINT & PASS DIVERGENCE BREAKDOWN/i)).toBeVisible();

    // Capture visual preview artifact
    await page.screenshot({ 
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/model_comparison_preview.png',
      fullPage: false 
    });

    // Test metric toggles in comparison suite
    const windMetricBtn = page.getByRole('button', { name: 'Wind & Gusts' });
    await windMetricBtn.click({ force: true });

    const rainMetricBtn = page.getByRole('button', { name: 'Precipitation' });
    await rainMetricBtn.click({ force: true });

    // Switch to "DOSSIER EXPORT" stage
    const exportStageBtn = page.getByRole('button', { name: /DOSSIER EXPORT/i });
    await exportStageBtn.click({ force: true });
    await expect(page.getByText(/EXPEDITION DOSSIER/i).first()).toBeVisible();

    // Switch back to "RADAR & ROUTE" stage
    const radarStageBtn = page.getByRole('button', { name: /RADAR & ROUTE/i });
    await radarStageBtn.click({ force: true });
    await expect(page.getByRole('button', { name: 'SATELLITE' })).toBeVisible();
    await expect(page.getByText(/ROUTE INGESTION • GPX/i)).toBeVisible();
  });

  test('should toggle audio feedback settings cleanly', async ({ page }) => {
    await page.goto('/');

    // Locate mute audio button
    const muteBtn = page.getByTitle(/Mute audio|Unmute audio/i);
    await expect(muteBtn).toBeVisible();

    // Click to mute
    await muteBtn.click({ force: true });
    await expect(page.getByTitle(/Unmute audio/i)).toBeVisible();

    // Click to unmute
    await muteBtn.click({ force: true });
    await expect(page.getByTitle(/Mute audio/i)).toBeVisible();
  });

  test('should open Atlas Archive modal, display cloud storage engine, and allow closing', async ({ page }) => {
    await page.goto('/');

    // Load sample route first
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await loadAlpineBtn.click({ force: true });
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible();

    const archiveBtn = page.getByRole('button', { name: /Atlas Archive/i });
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();

    // Verify modal header, active route action, and MongoDB collection indicator
    await expect(page.getByText(/ATLAS EXPEDITION ARCHIVE/i)).toBeVisible();
    await expect(page.getByText(/ARCHIVE ACTIVE ROUTE/i)).toBeVisible();
    await expect(page.getByText(/saved_expeditions/i)).toBeVisible();

    await page.screenshot({
      path: '/Users/filippsh/.gemini/antigravity-ide/brain/8bd520e2-e567-497f-a4d3-e3ab959c2643/atlas_archive_preview.png',
      fullPage: false,
    });

    // Close modal
    const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    await closeBtn.click();
    await expect(page.getByText(/ATLAS EXPEDITION ARCHIVE/i)).not.toBeVisible();
  });

  test('should support collapsing and expanding elevation graph drawer on map view', async ({ page }) => {
    await page.goto('/');

    // Load sample route
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await loadAlpineBtn.click({ force: true });
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible();

    // Verify elevation drawer is present
    const minimizeBtn = page.getByText(/▼ MINIMIZE/i);
    await expect(minimizeBtn).toBeVisible();

    // Click minimize
    await minimizeBtn.click();
    await expect(page.getByText(/▲ EXPAND GRAPH/i)).toBeVisible();

    // Click expand
    await page.getByText(/▲ EXPAND GRAPH/i).click();
    await expect(page.getByText(/▼ MINIMIZE/i)).toBeVisible();
  });
});

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

  test('should support switching to 2D Dock View and navigating tabs', async ({ page }) => {
    await page.goto('/');

    // Load sample route first
    const loadAlpineBtn = page.getByRole('button', { name: /Load Sample Route \(Alpine 45km\)/i });
    await loadAlpineBtn.click({ force: true });
    await expect(page.getByText(/45.0 km/i).first()).toBeVisible({ timeout: 5000 });

    // Click "2D Dock View" button in header dock
    const dockViewBtn = page.getByRole('button', { name: /2D Dock View/i });
    await expect(dockViewBtn).toBeVisible();
    await dockViewBtn.click({ force: true });

    // Verify 2D SplitScreenLayout is rendered
    await expect(page.getByText(/EXPEDITION METEOROLOGY/i)).toBeVisible();
    await expect(page.getByText(/ROUTE ARMED/i)).toBeVisible();

    // Check that we can switch back to 3D Spatial Workspace
    const spatialViewBtn = page.getByRole('button', { name: /3D Spatial/i }).or(
      page.getByTitle(/Switch to 3D Spatial Workspace/i)
    );
    if (await spatialViewBtn.isVisible()) {
      await spatialViewBtn.click({ force: true });
      await expect(page.getByText(/ATMOSPHERIC EXPEDITION RADAR/i)).toBeVisible();
    }
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
});

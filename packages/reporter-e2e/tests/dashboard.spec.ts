import { test, expect } from '@playwright/test';
import { LocatorRace } from '@playwright-extensions/core';
import { execSync } from 'child_process';

const SERVER_URL = process.env.REPORTER_SERVER_URL || 'http://localhost:8400';

test.describe.serial('Reporter Web UI E2E', () => {

  test('User Journey: Navigate and inspect entire Dashboard UI', async ({ page, context, request }) => {
    // --- Dashboard View ---
    const response = await request.get(SERVER_URL);
    expect(response.status()).toBe(200);

    await page.goto(SERVER_URL);
    await expect(page.locator('h2').first()).toContainText('Dashboard');
    
    // Check Navigation Links
    const navLinks = page.locator('.nav-links a');
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible();
    await expect(navLinks.filter({ hasText: 'Runs' })).toBeVisible();
    await expect(navLinks.filter({ hasText: 'Trends' })).toBeVisible();

    // Check Stats Grid
    const stats = page.locator('.stat-label');
    await expect(stats).toContainText(['Total Runs', 'Total Tests', 'Pass Rate', 'Total Failures']);
    const runCountCard = page.locator('.stat-card').filter({ hasText: 'Total Runs' }).locator('.stat-value');
    const testCountCard = page.locator('.stat-card').filter({ hasText: 'Total Tests' }).locator('.stat-value');

    // Click on the most recent run if it exists
    const winnerTable = await LocatorRace.race([
      page.locator('.data-table tbody tr:has(td.empty-state)'),
      page.locator('.data-table tbody tr:not(:has(td.empty-state))').first()
    ]);

    const isMissingRuns = (await winnerTable.locator('td').first().getAttribute('class'))?.includes('empty-state');
    expect(isMissingRuns, 'Expected runs to be present in dashboard, but found empty state').toBeFalsy();

    expect(parseInt(await runCountCard.innerText(), 10)).toBeGreaterThan(0);
    expect(parseInt(await testCountCard.innerText(), 10)).toBeGreaterThan(0);
    
    const runsRes = await request.get(`${SERVER_URL}/api/v1/runs`);
    expect(runsRes.status()).toBe(200);
    const runsData = await runsRes.json();
    const runWithTrace = runsData.runs.find((r: any) => r.tests && r.tests.some((t: any) => t.hasTrace));

    if (runWithTrace) {
      await page.goto(`${SERVER_URL}/runs/${runWithTrace.id}`);
    } else {
      const recentRunLink = winnerTable.locator('td a').first();
      await expect(recentRunLink).toBeVisible({ timeout: 10000 });
      await recentRunLink.click();
    }
    
    // --- Run Detail View ---
    await expect(page.locator('.page-header h2')).toContainText('Run Detail');

    // Check Trace functionality
    if (runWithTrace) {
      const tracesRace = await LocatorRace.race([
        page.locator('#testsBody tr:has(td.empty-state)'),
        page.locator('#testsBody tr:not(:has(td.empty-state)):has(a.trace-link)').first()
      ]);

      const isMissingTraces = (await tracesRace.locator('td').first().getAttribute('class'))?.includes('empty-state');
      expect(isMissingTraces, 'Expected trace records to be present, but found empty state').toBeFalsy();

      const traceLink = tracesRace.locator('a.trace-link').first();
      await expect(traceLink).toBeVisible({ timeout: 10000 });
      await expect(traceLink).toHaveAttribute('target', '_blank');

      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        traceLink.click(),
      ]);
      await expect(newPage).toHaveURL(/trace\.playwright\.dev/);
    }
    
    // --- Runs View ---
    await page.goto(`${SERVER_URL}/runs`);
    await expect(page.locator('h2')).toContainText('Test Runs');
    await expect(page.locator('#searchRuns')).toBeVisible();
    await expect(page.locator('#searchRuns')).toHaveAttribute('placeholder', /Search/);
    
    const filterOptions = await page.locator('#filterStatus option').allInnerTexts();
    expect(filterOptions.some(t => t.toLowerCase().includes('passed'))).toBeTruthy();
    expect(filterOptions.some(t => t.toLowerCase().includes('failed'))).toBeTruthy();

    await page.goBack(); // Back to run-detail or dashboard

    // --- Trends View ---
    await page.goto(`${SERVER_URL}/trends`);
    await expect(page.locator('h2')).toContainText('Trends');
    await expect(page.locator('#trendChart')).toBeAttached();
    await expect(page.locator('#distributionChart')).toBeAttached();
    
    const trendValues = await page.locator('#trendGroupBy option').evaluateAll((els: HTMLOptionElement[]) => els.map(e => e.value));
    expect(trendValues).toContain('day');
    expect(trendValues).toContain('run');

    // --- API Checks ---
    const finalRunsRes = await request.get(`${SERVER_URL}/api/v1/runs`);
    expect(finalRunsRes.status()).toBe(200);
    expect(Array.isArray((await finalRunsRes.json()).runs)).toBe(true);

    const trendsRes = await request.get(`${SERVER_URL}/api/v1/trends`);
    expect(trendsRes.status()).toBe(200);
    expect(typeof await trendsRes.json()).toBe('object');
  });
});

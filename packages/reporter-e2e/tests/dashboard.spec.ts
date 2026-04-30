import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const SERVER_URL = process.env.REPORTER_SERVER_URL || 'http://localhost:8400';

test.describe.serial('Reporter Web UI E2E', () => {

  test.beforeAll('Setup: Execute Native Playwright Run to generate Server Traces', () => {
    // Bootstraps a run so we have reliable data to test against.
    try {
      execSync('npx playwright test tests/dummy.spec.ts --reporter=@playwright-extensions/reporter', {
        cwd: __dirname + '/..',
        env: { ...process.env, REPORTER_PROJECT_NAME: 'trace-generator-suite', REPORTER_SERVER_URL: SERVER_URL },
        stdio: 'ignore',
      });
    } catch (e) {}
  });

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
    expect(parseInt(await runCountCard.innerText(), 10)).toBeGreaterThan(0);
    expect(parseInt(await testCountCard.innerText(), 10)).toBeGreaterThan(0);

    // Click on the most recent run for trace generator
    const recentRunLink = page.locator('.data-table tbody tr:not(.empty-state)').filter({ hasText: 'trace-generator-suite' }).first().locator('td a');
    await expect(recentRunLink).toContainText(/trace-generator-suite - \d{4}-\d{2}-\d{2}T/);
    await recentRunLink.click();
    
    // --- Run Detail View ---
    await expect(page.locator('.page-header h2')).toContainText('Run Detail');

    // Check Trace functionality
    const tracesBtns = page.locator('#testsBody tr:not(.empty-state)').locator('a:has-text("Trace")');
    await expect(tracesBtns.first()).toBeVisible({ timeout: 10000 });
    await expect(tracesBtns.first()).toHaveAttribute('target', '_blank');

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      tracesBtns.first().click(),
    ]);
    await expect(newPage).toHaveURL(/trace\.playwright\.dev/);
    
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
    const runsRes = await request.get(`${SERVER_URL}/api/v1/runs`);
    expect(runsRes.status()).toBe(200);
    expect(Array.isArray((await runsRes.json()).runs)).toBe(true);

    const trendsRes = await request.get(`${SERVER_URL}/api/v1/trends`);
    expect(trendsRes.status()).toBe(200);
    expect(typeof await trendsRes.json()).toBe('object');
  });
});

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

  test('User Journey: Navigate and inspect entire Dashboard UI', async ({ page, context }) => {
    // 1. Dashboard View
    await page.goto(SERVER_URL);
    await expect(page.locator('h2').first()).toContainText('Dashboard');
    
    // 2. Click on the most recent run for trace generator
    const recentRunLink = page.locator('.data-table tbody tr:not(.empty-state)').filter({ hasText: 'trace-generator-suite' }).first().locator('td a');
    await expect(recentRunLink).toContainText(/trace-generator-suite - \d{4}-\d{2}-\d{2}T/);
    await recentRunLink.click();
    
    // 3. Drill down into Run Detail
    await expect(page.locator('.page-header h2')).toContainText('Run Detail');

    // 4. Check Trace functionality
    const tracesBtns = page.locator('#testsBody tr:not(.empty-state)').locator('a:has-text("Trace")');
    await expect(tracesBtns.first()).toBeVisible({ timeout: 10000 });
    await expect(tracesBtns.first()).toHaveAttribute('target', '_blank');

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      tracesBtns.first().click(),
    ]);

    await expect(newPage).toHaveURL(/trace\.playwright\.dev/);
    
    // 5. Go back to Dashboard / Trends
    await page.goto(`${SERVER_URL}/trends`);
    await expect(page.locator('h2')).toContainText('Trends');
  });

  test.describe('Dashboard Component Tests', () => {
    test('returns HTTP 200', async ({ request }) => {
      const response = await request.get(SERVER_URL);
      expect(response.status()).toBe(200);
    });

    test('renders dashboard title', async ({ page }) => {
      await page.goto(SERVER_URL);
      await expect(page.locator('h2')).toContainText('Dashboard');
    });

    test('renders all navigation links', async ({ page }) => {
      await page.goto(SERVER_URL);
      const links = page.locator('.nav-links a');
      await expect(links.filter({ hasText: 'Dashboard' })).toBeVisible();
      await expect(links.filter({ hasText: 'Runs' })).toBeVisible();
      await expect(links.filter({ hasText: 'Trends' })).toBeVisible();
    });

    test('renders stats grid with labels', async ({ page }) => {
      await page.goto(SERVER_URL);
      const stats = page.locator('.stat-label');
      await expect(stats).toContainText(['Total Runs', 'Total Tests', 'Pass Rate', 'Total Failures']);
    });

    test('displays valid non-zero metrics and a meaningful run title', async ({ page }) => {
      await page.goto(SERVER_URL);

      // Verify that after reporting tests, values are no longer just 0
      const runCountCard = page.locator('.stat-card').filter({ hasText: 'Total Runs' }).locator('.stat-value');
      const testCountCard = page.locator('.stat-card').filter({ hasText: 'Total Tests' }).locator('.stat-value');
      
      // Parse the counts to integers
      const runsText = await runCountCard.innerText();
      const testsText = await testCountCard.innerText();
      const runs = parseInt(runsText, 10);
      const testsRun = parseInt(testsText, 10);

      expect(runs).toBeGreaterThan(0);
      expect(testsRun).toBeGreaterThan(0);

      // Verify run title in the recent runs table includes the project name and timestamp format
      const recentRunLink = page.locator('.data-table tbody tr:not(.empty-state)').filter({ hasText: 'trace-generator-suite' }).first().locator('td a');
      await expect(recentRunLink).toContainText(/trace-generator-suite - \d{4}-\d{2}-\d{2}T/);
    });
  });

  test.describe('Runs Page', () => {
    test('returns HTTP 200', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/runs`);
      expect(response.status()).toBe(200);
    });

    test('renders runs page title', async ({ page }) => {
      await page.goto(`${SERVER_URL}/runs`);
      await expect(page.locator('h2')).toContainText('Test Runs');
    });

    test('renders filter controls', async ({ page }) => {
      await page.goto(`${SERVER_URL}/runs`);
      await expect(page.locator('#searchRuns')).toHaveAttribute('placeholder', /Search/);
    });

    test('search input is present', async ({ page }) => {
      await page.goto(`${SERVER_URL}/runs`);
      await expect(page.locator('#searchRuns')).toBeVisible();
    });

    test('status filter dropdown is present', async ({ page }) => {
      await page.goto(`${SERVER_URL}/runs`);
      const options = page.locator('#filterStatus option');
      const texts = await options.allInnerTexts();
      expect(texts.some(t => t.toLowerCase().includes('passed'))).toBeTruthy();
      expect(texts.some(t => t.toLowerCase().includes('failed'))).toBeTruthy();
    });
  });

  test.describe('Trends Page', () => {
    test('returns HTTP 200', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/trends`);
      expect(response.status()).toBe(200);
    });

    test('renders trends page title', async ({ page }) => {
      await page.goto(`${SERVER_URL}/trends`);
      await expect(page.locator('h2')).toContainText('Trends');
    });

    test('renders chart canvas elements', async ({ page }) => {
      await page.goto(`${SERVER_URL}/trends`);
      await expect(page.locator('#trendChart')).toBeAttached();
      await expect(page.locator('#distributionChart')).toBeAttached();
    });

    test('renders group-by dropdown', async ({ page }) => {
      await page.goto(`${SERVER_URL}/trends`);
      const options = page.locator('#trendGroupBy option');
      const values = await options.evaluateAll((els: HTMLOptionElement[]) => els.map(e => e.value));
      expect(values).toContain('day');
      expect(values).toContain('run');
    });
  });

  test.describe('Navigation', () => {
    test('can click Runs link from dashboard', async ({ page }) => {
      await page.goto(SERVER_URL);
      await page.click('a[href="/runs"]');
      await expect(page).toHaveURL(/.*\/runs/);
    });

    test('can navigate back with go-back command', async ({ page }) => {
      await page.goto(`${SERVER_URL}/runs`);
      await page.goto(`${SERVER_URL}/trends`);
      await page.goBack();
      await expect(page).toHaveURL(/.*\/runs/);
    });

    test('can navigate between all pages via sidebar', async ({ request }) => {
      const pages = ['/', '/runs', '/trends'];
      for (const pagePath of pages) {
        const response = await request.get(`${SERVER_URL}${pagePath}`);
        expect(response.status()).toBe(200);
      }
    });
  });

  test.describe('API Endpoints', () => {
    test('runs endpoint returns 200 with array', async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/v1/runs`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.runs)).toBe(true);
    });

    test('trends endpoint returns 200 with object', async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/v1/trends`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(typeof data).toBe('object');
    });
  });

  test.describe('Reporter Package Integration', () => {
    // Other reporter logic like initialization can be checked here in the future
  });
});

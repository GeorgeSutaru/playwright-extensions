import { test, expect } from '@playwright/test';
import { computeFingerprint } from '@playwright-extensions/reporter';

const SERVER_URL = process.env.REPORTER_SERVER_URL || 'http://localhost:8400';

test.describe('Reporter Web UI E2E', () => {

  test.describe('Dashboard', () => {
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
      await expect(links.filter({ hasText: 'Search Traces' })).toBeVisible();
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
      const recentRunLink = page.locator('.data-table tbody tr').first().locator('td a');
      await expect(recentRunLink).toContainText(/reporter-e2e - \d{4}-\d{2}-\d{2}T/);
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

  test.describe('Search Page', () => {
    test('returns HTTP 200', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/search`);
      expect(response.status()).toBe(200);
    });

    test('renders search page title', async ({ page }) => {
      await page.goto(`${SERVER_URL}/search`);
      await expect(page.locator('h2')).toContainText('Search Traces');
    });

    test('renders search input and action type input', async ({ page }) => {
      await page.goto(`${SERVER_URL}/search`);
      await expect(page.locator('#searchQuery')).toBeVisible();
      await expect(page.locator('#searchActionType')).toBeVisible();
    });

    test('can type into search input', async ({ page }) => {
      await page.goto(`${SERVER_URL}/search`);
      await page.fill('#searchQuery', 'test click action');
      await expect(page.locator('#searchQuery')).toHaveValue('test click action');
    });
  });

  test.describe('Snapshot Diff Page', () => {
    test('returns HTTP 200', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/diff`);
      expect(response.status()).toBe(200);
    });

    test('renders diff page title', async ({ page }) => {
      await page.goto(`${SERVER_URL}/diff`);
      await expect(page.locator('h2')).toContainText('Snapshot Diff');
    });

    test('renders diff form controls', async ({ page }) => {
      await page.goto(`${SERVER_URL}/diff`);
      await expect(page.locator('#diffFingerprint')).toBeVisible();
      await expect(page.locator('#diffRunA')).toBeVisible();
      await expect(page.locator('#diffRunB')).toBeVisible();
    });

    test('renders back to search link', async ({ page }) => {
      await page.goto(`${SERVER_URL}/diff`);
      await expect(page.locator('a.back-link')).toHaveAttribute('href', '/search');
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
      const pages = ['/', '/runs', '/trends', '/search', '/diff'];
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

    test('traces search endpoint returns 200 with array', async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/v1/traces/search?q=test`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.entries)).toBe(true);
    });
  });

  test.describe('Reporter Package Integration', () => {
    test('computes fingerprint correctly', () => {
      const fp = computeFingerprint({
        actionType: 'click',
        selector: 'text=Submit',
        sourceLocation: 'tests/checkout.spec.ts:42',
        actionIndex: 0,
      });
      expect(fp).toBeDefined();
      expect(typeof fp).toBe('string');
      expect(fp.length).toBeGreaterThan(0);
    });

    test('produces deterministic fingerprints', () => {
      const action = {
        actionType: 'fill',
        selector: 'css=input[name=email]',
        sourceLocation: 'tests/login.spec.ts:10',
        actionIndex: 1,
      };
      const fp1 = computeFingerprint(action);
      const fp2 = computeFingerprint(action);
      expect(fp1).toBe(fp2);
    });

    test('produces different fingerprints for different actions', () => {
      const fp1 = computeFingerprint({
        actionType: 'click',
        selector: '#submit',
        sourceLocation: 'test.ts:1',
        actionIndex: 0,
      });
      const fp2 = computeFingerprint({
        actionType: 'fill',
        selector: '#email',
        sourceLocation: 'test.ts:2',
        actionIndex: 1,
      });
      expect(fp1).not.toBe(fp2);
    });
  });
});

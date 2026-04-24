import { Page } from '@playwright/test';

/**
 * Sample extension demonstrating the extension pattern.
 * Add your own extensions following this pattern.
 */
export class SampleExtension {
  constructor(private page: Page) {}

  /**
   * Example utility method
   */
  async clickAndWait(selector: string, timeout?: number): Promise<void> {
    await this.page.click(selector, { timeout });
  }

  /**
   * Example utility method to wait for network idle
   */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}

/**
 * Factory function to attach extension to a page
 */
export function useSampleExtension(page: Page): SampleExtension {
  return new SampleExtension(page);
}

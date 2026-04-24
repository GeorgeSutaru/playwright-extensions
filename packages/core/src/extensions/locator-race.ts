import type { Locator } from 'playwright';

/**
 * Visibility mode for determining which locator wins the race.
 * - `default`: Element must be visible (not hidden by CSS).
 * - `visible`: Element must be visible (same as default, explicit naming).
 * - `presence`: Element must exist in the DOM (not removed/disconnected).
 */
export type VisibilityMode = 'default' | 'visible' | 'presence';

/**
 * Options for the LocatorRace.race() static method.
 */
export interface LocatorRaceOptions {
  /**
   * Maximum time in milliseconds to wait for a locator to become visible.
   * Defaults to 0 (no timeout).
   */
  timeout?: number;

  /**
   * Visibility mode for determining which locator wins.
   * - `default`: Element must be visible (not hidden by CSS).
   * - `visible`: Element must be visible (same as default).
   * - `presence`: Element must exist in the DOM.
   * Defaults to `'default'`.
   */
  visibilityMode?: VisibilityMode;
}

/**
 * Checks if a locator satisfies the given visibility mode.
 */
async function isSatisfied(locator: Locator, mode: VisibilityMode): Promise<boolean> {
  switch (mode) {
    case 'presence':
      return await locator.count() > 0;
    case 'visible':
    case 'default':
    default:
      return await locator.isVisible();
  }
}

/**
 * Combines multiple locators using Playwright's or() method, waits for
 * any to satisfy the visibility condition, then returns the first one
 * that actually matches.
 *
 * If multiple locators match simultaneously, throws a strict mode error.
 *
 * @example
 * ```typescript
 * const winner = await LocatorRace.race([
 *   page.locator('#a'),
 *   page.locator('#b'),
 * ]);
 * await winner.click();
 * ```
 */
export class LocatorRace {
  static async race(
    locators: Locator[],
    options?: LocatorRaceOptions,
  ): Promise<Locator> {
    const visibilityMode = options?.visibilityMode ?? 'default';
    const timeout = options?.timeout ?? 0;

    if (locators.length === 0) {
      throw new Error('No locators provided to race()');
    }

    if (locators.length === 1) {
      const state = visibilityMode === 'presence' ? 'attached' : 'visible';
      await locators[0].waitFor({ state, timeout });
      return locators[0];
    }

    const state = visibilityMode === 'presence' ? 'attached' : 'visible';

    // Combine all locators with or() and wait for any to satisfy the condition.
    // Playwright's strict mode will fire if multiple elements resolve, which
    // is expected — we catch it and determine which locator(s) satisfy the
    // condition ourselves.
    const compound = locators.reduce((acc, loc) => acc.or(loc));

    try {
      await compound.waitFor({ state, timeout });
    } catch (err: any) {
      // If Playwright throws strict mode, multiple elements resolved.
      // Check which locator(s) satisfy our visibility condition.
      if (err.message.includes('strict mode violation')) {
        const matching = await this.findMatching(locators, visibilityMode);
        if (matching.length === 1) return matching[0];
        if (matching.length > 1) {
          throw new Error(
            `Strict mode violation: multiple locators matched:\n  ${matching.map((l) => l.toString()).join('\n  ')}`,
          );
        }
        throw new Error('No locator satisfied the visibility condition');
      }
      // Timeout or other error — rethrow
      throw err;
    }

    // Playwright resolved exactly one element — find which locator it was
    for (const loc of locators) {
      if (await isSatisfied(loc, visibilityMode)) {
        return loc;
      }
    }

    throw new Error('No locator satisfied the visibility condition');
  }

  /**
   * Finds which locators satisfy the given visibility mode.
   */
  private static async findMatching(locators: Locator[], mode: VisibilityMode): Promise<Locator[]> {
    const matching: Locator[] = [];
    for (const loc of locators) {
      if (await isSatisfied(loc, mode)) {
        matching.push(loc);
      }
    }
    return matching;
  }
}

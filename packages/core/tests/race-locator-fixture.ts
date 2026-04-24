import { test as base } from '@playwright/test';
import { LocatorRace, LocatorRaceOptions } from '../src/extensions/locator-race';
import type { Page, Locator } from '@playwright/test';

interface RacePage extends Page {
  raceLocator: (locators: Locator[], options?: LocatorRaceOptions) => Promise<Locator>;
}

export const test = base.extend<{ page: RacePage }>({
  page: async ({ page }, use) => {
    (page as RacePage).raceLocator = async (
      locators: Locator[],
      options?: LocatorRaceOptions,
    ) => {
      return await LocatorRace.race(locators, options);
    };
    await use(page);
  },
});

export { expect } from '@playwright/test';

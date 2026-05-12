import { test as base, expect as pwExpect, Page, Locator } from '@playwright/test';
import { JSONPath } from 'jsonpath-plus';
import { XMLParser } from 'fast-xml-parser';

export interface QueryResponseLocator extends Promise<any> {
    first(): QueryResponseLocator;
    last(): QueryResponseLocator;
    nth(index: number): QueryResponseLocator;
}

declare module '@playwright/test' {
  interface Locator {
    locator(urlFilter: string | RegExp, filterPath: string, responseType?: 'json' | 'xml' | 'regex', locatorOptions?: { exact?: boolean }): Locator;
  }
  interface Page {
    locator(urlFilter: string | RegExp, filterPath: string, responseType?: 'json' | 'xml' | 'regex', locatorOptions?: { exact?: boolean }): Locator;
    queryResponse(urlFilter: string | RegExp, filterPath: string, responseType?: 'json' | 'xml' | 'regex'): QueryResponseLocator;
  }
}



function applyAction(action: string, errorMsg: string) {
  if (action === 'fail') {
    pwExpect(errorMsg, errorMsg).toBeNull();
  } else if (action === 'soft-fail') {
    pwExpect.soft(errorMsg, errorMsg).toBeNull();
  } else if (action === 'log') {
    console.error(errorMsg);
  }
}

function matchUrl(url: string, patterns: string[]) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some(p => {
    if (url.includes(p)) return true;
    if (p.includes('*')) {
      const regexStr = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      if (new RegExp(`^${regexStr}$`).test(url)) return true;
    }
    if (p.startsWith('/') && p.endsWith('/')) {
      try {
        return new RegExp(p.slice(1, -1)).test(url);
      } catch (e) {
        return false;
      }
    }
    return false;
  });
}

function matchStatusCode(status: number, codes: (number | string)[]) {
  if (!codes || codes.length === 0) return false;
  return codes.some(code => {
    if (typeof code === 'number') return status === code;
    if (typeof code === 'string' && code.toLowerCase() === '5xx') return status >= 500 && status < 600;
    if (typeof code === 'string' && code.toLowerCase() === '4xx') return status >= 400 && status < 500;
    if (typeof code === 'string' && code.toLowerCase() === '3xx') return status >= 300 && status < 400;
    return status.toString() === code.toString();
  });
}

export type ExtendedTestOptions = {
  interceptors: any;
};

export type ExtendedLocator = Locator;

export type ExtendedPage = Page;

export const test = base.extend<ExtendedTestOptions & { _autoInterceptors: void, page: ExtendedPage }>({
  interceptors: [{}, { option: true }],
  
  page: async ({ page }, use) => {
    const apiResponses: { url: string, status: number, body: Promise<string> }[] = [];
    
    page.on('response', (res) => {
        // Only track API like responses
        apiResponses.push({ url: res.url(), status: res.status(), body: res.text().catch(() => '') });
    });

    const originalLocator = page.locator.bind(page);

    
    function createQueryResponseProxy(urlFilter: any, filterPath: string, responseType: string, index?: number): any {
        const resolveQuery = async () => {
            const checkMatch = (rUrl: string) => {
                if (typeof urlFilter === 'string') return matchUrl(rUrl, [urlFilter]);
                return urlFilter.test(rUrl);
            };

            const matchedResponses = apiResponses.filter(r => checkMatch(r.url));
            
            if (matchedResponses.length === 0) {
                throw new Error(`queryResponse: No intercepted responses matched the URL filter: ${urlFilter}`);
            }

            let allResults: any[] = [];
            let responseCountWithResults = 0;

            for (const r of matchedResponses) {
                const body = await r.body;
                let resultsForThisResponse: any[] = [];
                try {
                    if (responseType === 'json') {
                        const parsed = JSON.parse(body);
                        const res = JSONPath({ path: filterPath, json: parsed });
                        if (Array.isArray(res)) resultsForThisResponse = res;
                        else if (res !== undefined) resultsForThisResponse = [res];
                    } else if (responseType === 'xml') {
                        const parser = new XMLParser();
                        const parsed = parser.parse(body);
                        const res = JSONPath({ path: filterPath, json: parsed });
                        if (Array.isArray(res)) resultsForThisResponse = res;
                        else if (res !== undefined) resultsForThisResponse = [res];
                    } else if (responseType === 'regex') {
                        const reg = new RegExp(filterPath, 'g');
                        let m;
                        while ((m = reg.exec(body)) !== null) {
                            resultsForThisResponse.push(m[1] !== undefined ? m[1] : m[0]);
                        }
                    }
                } catch(e) {
                     continue;
                }
                
                if (resultsForThisResponse.length > 0) {
                    responseCountWithResults++;
                    allResults.push(...resultsForThisResponse);
                }
            }

            if (allResults.length === 0) {
                throw new Error(`queryResponse: Found ${matchedResponses.length} responses matching ${urlFilter}, but no results found for path "${filterPath}".`);
            }

            if (index === undefined) {
                if (allResults.length > 1) {
                    throw new Error(`queryResponse strict mode violation: Multiple results found.\n- ${matchedResponses.length} responses matched the URL filter.\n- ${responseCountWithResults} of those responses contained matching results.\n- Total results extracted: ${allResults.length}.\nUse .first(), .last(), or .nth(index) to handle multiple results.`);
                }
                return allResults[0];
            } else {
                let actualIndex = index < 0 ? allResults.length + index : index;
                if (actualIndex < 0 || actualIndex >= allResults.length) {
                    throw new Error(`queryResponse: Index ${index} out of bounds for ${allResults.length} results.`);
                }
                return allResults[actualIndex];
            }
        };

        const obj: any = {};
        obj.then = (onfulfilled: any, onrejected: any) => resolveQuery().then(onfulfilled, onrejected);
        obj.first = () => createQueryResponseProxy(urlFilter, filterPath, responseType, 0);
        obj.last = () => createQueryResponseProxy(urlFilter, filterPath, responseType, -1);
        obj.nth = (n: number) => createQueryResponseProxy(urlFilter, filterPath, responseType, n);
        return obj;
    }

    (page as any).queryResponse = function(urlFilter: any, filterPath: string, responseType: string = 'json') {
      return createQueryResponseProxy(urlFilter, filterPath, responseType);
    };

    function createApiLocatorProxy(parentEngine: () => Promise<Locator | Page>, urlFilter: any, filterPath: string, responseType: string, locatorOptions: any): ExtendedLocator {
        const resolveActualLocator = async (): Promise<Locator> => {
          const checkMatch = (rUrl: string) => {
            if (typeof urlFilter === 'string') return matchUrl(rUrl, [urlFilter]);
            return urlFilter.test(rUrl);
          };

          let matchedBody = '';
          let matchedStatus = 200;
          const existing = [...apiResponses].reverse().find(r => checkMatch(r.url));
          if (existing) {
            matchedBody = await existing.body;
            matchedStatus = existing.status;
          } else {
            const res = await page.waitForResponse(r => checkMatch(r.url()));
            matchedBody = await res.text();
            matchedStatus = res.status();
          }

          let extractedText: string | undefined;
          try {
            if (responseType === 'json') {
              const parsed = JSON.parse(matchedBody);
              const result = JSONPath({ path: filterPath, json: parsed });
              extractedText = result && result.length > 0 ? String(result[0]) : undefined;
            } else if (responseType === 'xml') {
              const parser = new XMLParser();
              const parsed = parser.parse(matchedBody);
              const result = JSONPath({ path: filterPath, json: parsed });
              extractedText = result && result.length > 0 ? String(result[0]) : undefined;
            } else if (responseType === 'regex') {
              const r = new RegExp(filterPath);
              const match = matchedBody.match(r);
              extractedText = match ? (match[1] || match[0]) : undefined;
            }
          } catch(e) {
            throw new Error(`locator: Failed to parse body for url ${urlFilter} (Status: ${matchedStatus}).\nMatched Body:\n${matchedBody}\nError: ${e}`);
          }

          if (matchedStatus >= 400 && !extractedText) {
            throw new Error(`locator: Request to ${urlFilter} failed with HTTP Status ${matchedStatus}. Could not extract path "${filterPath}".\nMatched Body:\n${matchedBody}`);
          }

          if (!extractedText) {
            throw new Error(`locator: Could not extract value for path "${filterPath}" from response matching ${urlFilter}.\nMatched Body:\n${matchedBody}`);
          }

          const parentObj = await parentEngine();
          return parentObj.getByText(extractedText, locatorOptions);
        };

        const createProxy = (resolveEngine: () => Promise<Locator>): ExtendedLocator => {
          const dummy = originalLocator('__api_locator_pending__');
          const syncLocators = new Set([
            'locator', 'getByAltText', 'getByLabel', 'getByPlaceholder',
            'getByRole', 'getByTestId', 'getByText', 'getByTitle',
            'first', 'last', 'nth', 'filter', 'and', 'or'
          ]);

          return new Proxy(dummy, {
            get(target, prop, receiver) {
              if (prop === 'then') return undefined; // Preempt Promise.resolve checks
              if (prop === 'page') return () => page;
              
              const value = Reflect.get(target, prop, receiver);
              if (typeof value === 'function') {
                if (prop === 'constructor' || typeof prop === 'symbol') {
                  return value;
                }
                if (prop === 'toString') return value.bind(target);
                return (...args: any[]) => {
                  if (prop === 'locator' && typeof args[1] === 'string') {
                      // Nested apiLocator call via proxy!
                      return createApiLocatorProxy(resolveEngine, args[0], args[1], args[2] || 'json', args[3]);
                  }
                  if (typeof prop === 'string' && syncLocators.has(prop)) {
                    return createProxy(async () => {
                      const actual = await resolveEngine();
                      return (actual as any)[prop](...args);
                    });
                  }
                  return resolveEngine().then(actual => (actual as any)[prop](...args));
                };
              }
              return value;
            }
          });
        };

        return createProxy(resolveActualLocator);
    }

    function recursiveWrap(locator: Locator): ExtendedLocator {
        if ((locator as any).__isWrappedApiLocatorProxy) return locator as unknown as ExtendedLocator;
        const proxy = new Proxy(locator, {
            get(target, prop, receiver) {
                if (prop === 'then') return undefined;
                if (prop === '__isWrappedApiLocatorProxy') return true;
                if (prop === 'locator') {
                    return function(arg1: any, arg2?: any, arg3?: any, arg4?: any) {
                        if (typeof arg2 === 'string') {
                            return createApiLocatorProxy(async () => target, arg1, arg2, arg3 || 'json', arg4);
                        }
                        return recursiveWrap((target as any).locator(arg1, arg2));
                    };
                }
                const value = Reflect.get(target, prop, receiver);
                if (typeof value === 'function') {
                    if (prop === 'constructor' || typeof prop === 'symbol') {
                        return value;
                    }
                    if (prop === 'toString') return value.bind(target);
                    const syncLocators = new Set([
                        'getByAltText', 'getByLabel', 'getByPlaceholder',
                        'getByRole', 'getByTestId', 'getByText', 'getByTitle',
                        'first', 'last', 'nth', 'filter', 'and', 'or'
                    ]);
                    if (typeof prop === 'string' && syncLocators.has(prop)) {
                        return (...args: any[]) => {
                            const res = value.apply(target, args);
                            return recursiveWrap(res);
                        };
                    }
                    return value.bind(target);
                }
                return value;
            }
        });
        return proxy as unknown as ExtendedLocator;
    }

    (page as any).locator = function(arg1: any, arg2?: any, arg3?: any, arg4?: any) {
      if (typeof arg2 === 'string') {
        return createApiLocatorProxy(async () => page, arg1, arg2, arg3 || 'json', arg4);
      }
      return recursiveWrap(originalLocator(arg1, arg2));
    };

    await use(page as ExtendedPage);
  },

  _autoInterceptors: [async ({ page, interceptors }, use) => {
    let config: any = {};
    const user = interceptors || {};
    const reqObj = typeof user.requests === 'boolean' ? { enabled: user.requests } : user.requests || {};
    const conObj = typeof user.console === 'boolean' ? { enabled: user.console } : user.console || {};
    const errObj = typeof user.errors === 'boolean' ? { enabled: user.errors } : user.errors || {};

    config = {
      requests: {
        enabled: reqObj.enabled ?? true,
        action: reqObj.action ?? 'fail',
        statusCodes: reqObj.statusCodes ?? ['5xx'],
        include: reqObj.include ?? [],
        exclude: reqObj.exclude ?? []
      },
      console: {
        enabled: conObj.enabled ?? true,
        action: conObj.action ?? 'fail'
      },
      errors: {
        enabled: errObj.enabled ?? true,
        action: errObj.action ?? 'fail'
      }
    };

    if (config.requests?.enabled) {
      page.on('response', response => {
        const url = response.url();
        const status = response.status();
        if (config.requests.include && config.requests.include.length > 0 && !matchUrl(url, config.requests.include)) return;
        if (config.requests.exclude && config.requests.exclude.length > 0 && matchUrl(url, config.requests.exclude)) return;
        if (matchStatusCode(status, config.requests.statusCodes)) {
          const err = `[Request Error] ${response.request().method()} ${url} - Status ${status}`;
          if (config.requests.action !== 'log') console.error(err);
          applyAction(config.requests.action, err);
        }
      });
      
      page.on('requestfailed', request => {
        const url = request.url();
        if (config.requests.include && config.requests.include.length > 0 && !matchUrl(url, config.requests.include)) return;
        if (config.requests.exclude && config.requests.exclude.length > 0 && matchUrl(url, config.requests.exclude)) return;
        const err = `[Request Failed] ${request.method()} ${url} - ${request.failure()?.errorText}`;
        if (config.requests.action !== 'log') console.error(err);
        applyAction(config.requests.action, err);
      });
    }

    if (config.console?.enabled) {
      page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (text.includes('Failed to load resource: the server responded with a status of')) return;
        if (type === 'error' || type === 'warning') {
            const err = `[Console ${type}] ${text}`;
            if (config.console.action !== 'log') console.error(err);
            applyAction(config.console.action, err);
        } else {
            console.log(`[Console ${type}] ${text}`);
        }
      });
    }

    if (config.errors?.enabled) {
      page.on('pageerror', exception => {
        const err = `[Page Error] ${exception.message}`;
        if (config.errors.action !== 'log') console.error(err);
        applyAction(config.errors.action, err);
      });
    }

    await use();
  }, { auto: true }],
});

export const expect = pwExpect;

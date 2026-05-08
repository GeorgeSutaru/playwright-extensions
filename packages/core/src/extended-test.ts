import { test as base, expect as pwExpect } from '@playwright/test';

function applyAction(action: string, errorMsg: string) {
  if (action === 'fail') {
    pwExpect(true, errorMsg).toBe(false);
  } else if (action === 'soft-fail') {
    pwExpect.soft(true, errorMsg).toBe(false);
  } else if (action === 'log') {
    console.error(errorMsg);
  }
}

function matchUrl(url: string, patterns: string[]) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some(p => {
    // Exact match or substring
    if (url.includes(p)) return true;
    
    // Support wildcards (* -> .*)
    if (p.includes('*')) {
      const regexStr = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      if (new RegExp(`^${regexStr}$`).test(url)) return true;
    }
    
    // Check if it's already a valid regex
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

export const test = base.extend<ExtendedTestOptions & { _autoInterceptors: void }>({
  interceptors: [{}, { option: true }],
  
  _autoInterceptors: [async ({ page, interceptors }, use) => {
    let config: any = {};
    
    // Merge provided interceptor options with defaults
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
        
        // Filter include/exclude
        if (config.requests.include && config.requests.include.length > 0 && !matchUrl(url, config.requests.include)) return;
        if (config.requests.exclude && config.requests.exclude.length > 0 && matchUrl(url, config.requests.exclude)) return;

        // Check status code errors
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
        
        // Ignore browser-generated network request console errors so they don't double-trigger 
        // conflicts alongside the explicit request interceptors
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

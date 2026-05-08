import { PlaywrightTestConfig, defineConfig as pwDefineConfig } from '@playwright/test';

export interface InterceptorOptions {
  /** Intercept and log all webservice requests and soft fail on request failures */
  requests?: boolean;
  /** Intercept and log all console messages */
  console?: boolean;
  /** Intercept and log all page errors */
  errors?: boolean;
  /** Whether to soft fail the test when an error or failed request is intercepted */
  softFail?: boolean;
}

export type ExtendedPlaywrightTestConfig = PlaywrightTestConfig & {
  interceptors?: InterceptorOptions;
};

export function defineConfig(config: ExtendedPlaywrightTestConfig | ExtendedPlaywrightTestConfig[]) {
  const cfg = Array.isArray(config) ? config[0] : config;
  
  // Inject the configuration into environment variables so the extended test can read them
  if (cfg.interceptors) {
    if (cfg.interceptors.requests) process.env.PW_EXT_INTERCEPT_REQUESTS = 'true';
    if (cfg.interceptors.console) process.env.PW_EXT_INTERCEPT_CONSOLE = 'true';
    if (cfg.interceptors.errors) process.env.PW_EXT_INTERCEPT_ERRORS = 'true';
    if (cfg.interceptors.softFail) process.env.PW_EXT_SOFT_FAIL = 'true';
  }

  return pwDefineConfig(config as any);
}

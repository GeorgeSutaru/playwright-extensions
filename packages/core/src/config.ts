import { PlaywrightTestConfig, defineConfig as pwDefineConfig } from '@playwright/test';

export enum InterceptorAction {
  Fail = 'fail',
  SoftFail = 'soft-fail',
  Log = 'log',
  Ignore = 'ignore'
}

export interface BaseInterceptorOptions {
  enabled?: boolean;
  action?: InterceptorAction;
}

export interface RequestInterceptorOptions extends BaseInterceptorOptions {
  include?: string[]; // substrings or regex strings
  exclude?: string[]; // substrings or regex strings
  statusCodes?: (number | string)[]; // e.g. [404, 500, '5xx']
}

export interface InterceptorConfig {
  requests?: boolean | RequestInterceptorOptions;
  console?: boolean | BaseInterceptorOptions;
  errors?: boolean | BaseInterceptorOptions;
}

export type ExtendedPlaywrightTestConfig = PlaywrightTestConfig;

// Export regular define config without environment mapping
export const defineConfig = pwDefineConfig;

import { describe, it, expect } from 'vitest';
import { ReporterConfig, DefaultReporterConfig } from '../src/config';

describe('ReporterConfig', () => {
  it('has sensible defaults', () => {
    expect(DefaultReporterConfig.serverUrl).toBe('http://localhost:8400');
    expect(DefaultReporterConfig.artifacts).toEqual(['video', 'screenshot', 'trace']);
    expect(DefaultReporterConfig.indexTraces).toBe(true);
    expect(DefaultReporterConfig.fallbackDir).toBe('./.playwright-reporter');
  });

  it('accepts partial configuration', () => {
    const config: ReporterConfig = {
      serverUrl: 'http://custom-server:9999',
      artifacts: ['trace'],
    };

    expect(config.serverUrl).toBe('http://custom-server:9999');
    expect(config.artifacts).toEqual(['trace']);
    expect(config.apiKey).toBeUndefined();
  });

  it('accepts full configuration', () => {
    const config: ReporterConfig = {
      serverUrl: 'http://localhost:8400',
      apiKey: 'secret-key',
      artifacts: ['video', 'screenshot', 'trace'],
      indexTraces: true,
      fallbackDir: './custom-fallback',
    };

    expect(config.apiKey).toBe('secret-key');
    expect(config.fallbackDir).toBe('./custom-fallback');
  });
});

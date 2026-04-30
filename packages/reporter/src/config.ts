export interface ReporterConfig {
  serverUrl?: string;
  apiKey?: string;
  projectName?: string;
  runTitle?: string;
  artifacts?: ('video' | 'screenshot' | 'trace')[];
  indexTraces?: boolean;
  fingerprintActions?: boolean;
  fallbackDir?: string;
}

export const DefaultReporterConfig: Required<Omit<ReporterConfig, 'apiKey' | 'projectName' | 'runTitle'>> = {
  serverUrl: 'http://localhost:8400',
  artifacts: ['video', 'screenshot', 'trace'],
  indexTraces: true,
  fingerprintActions: true,
  fallbackDir: './.playwright-reporter',
};

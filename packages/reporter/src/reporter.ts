import { Reporter, FullConfig, FullResult, TestError } from '@playwright/test/reporter';
import { ReporterConfig, DefaultReporterConfig } from './config.js';
import { ReporterClient } from './client.js';
import { computeFingerprint, ActionFingerprint } from './fingerprint.js';

interface TestContext {
  testId: string;
  startTime: number;
  actionIndex: number;
  actions: Array<Record<string, unknown>>;
}

const testContexts = new Map<string, TestContext>();

export class ExtendedReporter implements Reporter {
  private config: Required<Omit<ReporterConfig, 'apiKey' | 'projectName' | 'runTitle'>> & Pick<ReporterConfig, 'projectName' | 'runTitle'>;
  private client: ReporterClient;
  private runId: string | null = null;
  private errors: TestError[] = [];

  constructor(userConfig?: ReporterConfig) {
    this.config = {
      ...DefaultReporterConfig,
      ...userConfig,
    };
    this.client = new ReporterClient(this.config);
  }

  onBegin(config: FullConfig): void {
    const rawProjectName = this.config.projectName || process.env.REPORTER_PROJECT_NAME || 'default';
    const runName = this.config.runTitle || process.env.REPORTER_RUN_TITLE || `${rawProjectName} - ${new Date().toISOString()}`;

    const metadata: Record<string, unknown> = {
      title: runName,
      project: rawProjectName,
      configHash: this.computeConfigHash(config),
      environmentTags: {
        os: process.platform,
        nodeVersion: process.version,
        playwrightVersion: 'unknown',
      },
    };

    this.client.createRun(metadata).then((id) => {
      this.runId = id;
    });
  }

  onTestBegin(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): void {
    const key = this.getTestKey(test, result);
    testContexts.set(key, {
      testId: '',
      startTime: Date.now(),
      actionIndex: 0,
      actions: [],
    });
  }

  onTestEnd(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): void {
    if (!this.runId) return;

    const key = this.getTestKey(test, result);
    const ctx = testContexts.get(key);
    if (!ctx) return;

    const duration = result.duration;
    const status = this.mapStatus(result.status, test.outcome());

    const testData: Record<string, unknown> = {
      title: test.titlePath().slice(1).join(' >> '),
      file: test.titlePath().slice(-2)[0] || '',
      line: test.location?.line,
      status,
      durationMs: duration,
      errorText: result.errors.map((e) => e.message).join('\n') || undefined,
      errorStack: result.errors.map((e) => e.stack).join('\n') || undefined,
      retryNum: result.retry,
      metadata: {
        annotations: test.annotations,
        tags: test.tags,
        project: '',
      },
    };

    this.client.recordTest(this.runId!, testData).then((testId) => {
      ctx.testId = testId;

      for (const attachment of result.attachments) {
        if (attachment.body && this.config.artifacts.includes(attachment.name as 'video' | 'screenshot' | 'trace')) {
          const buffer = Buffer.from(attachment.body);
          this.client.uploadArtifact(this.runId!, testId, attachment.name, attachment.path || `${attachment.name}.${this.getExtension(attachment.contentType || '')}`, buffer);
        }
      }

      if (this.config.indexTraces && ctx.actions.length > 0) {
        this.client.uploadTrace(this.runId!, testId, ctx.actions);
      }
    });

    testContexts.delete(key);
  }

  onError(error: TestError): void {
    this.errors.push(error);
  }

  onEnd(result: FullResult): void {
    // Finalize run
    if (this.errors.length > 0) {
      console.log(`[reporter] ${this.errors.length} error(s) during test run`);
    }
  }

  recordAction(action: ActionFingerprint): void {
    // Called from extended fixtures to record actions
  }

  private getTestKey(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): string {
    return `${test.id}-${result.retry}`;
  }

  private mapStatus(status: string, outcome: 'skipped' | 'expected' | 'unexpected' | 'flaky'): string {
    if (status === 'failed') return 'failed';
    if (status === 'timedOut') return 'timedout';
    if (status === 'skipped') return 'skipped';
    if (outcome === 'flaky') return 'flaky';
    return 'passed';
  }

  private computeConfigHash(config: FullConfig): string {
    const { createHash } = require('crypto');
    const str = JSON.stringify({
      globalTimeout: config.globalTimeout,
      workers: config.workers,
      projects: config.projects.map((p) => p.name),
    });
    return createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'video/webm': 'webm',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'application/zip': 'zip',
      'text/plain': 'txt',
    };
    return map[mimeType] || 'bin';
  }
}

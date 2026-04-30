import { ReporterConfig, DefaultReporterConfig } from './config.js';
import { LocalStorage } from './local-storage.js';

export class ReporterClient {
  private serverUrl: string;
  private apiKey?: string;
  private fallback?: LocalStorage;
  private runId: string | null = null;

  constructor(config: ReporterConfig) {
    this.serverUrl = (config.serverUrl || DefaultReporterConfig.serverUrl).replace(/\/+$/, '');
    this.apiKey = config.apiKey;

    if (config.fallbackDir || DefaultReporterConfig.fallbackDir) {
      this.fallback = new LocalStorage(config.fallbackDir || DefaultReporterConfig.fallbackDir);
    }
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      h['X-API-Key'] = this.apiKey;
    }
    return h;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response | null> {
    const url = `${this.serverUrl}${path}`;
    try {
      return await fetch(url, {
        headers: this.headers(),
        ...options,
      });
    } catch {
      return null;
    }
  }

  async createRun(metadata: Record<string, unknown>): Promise<string> {
    const runId = crypto.randomUUID();

    try {
      const res = await this.request('/api/v1/runs', {
        method: 'POST',
        body: JSON.stringify(metadata),
      });

      if (res && res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        this.runId = (data.id as string) || runId;
        return this.runId;
      }
    } catch {
      // Fall through to local
    }

    if (this.fallback) {
      await this.fallback.initRun(runId, metadata);
      this.runId = runId;
      return runId;
    }

    this.runId = runId;
    return runId;
  }

  async recordTest(runId: string, testData: Record<string, unknown>): Promise<string> {
    const testId = crypto.randomUUID();

    try {
      const res = await this.request(`/api/v1/runs/${runId}/tests`, {
        method: 'POST',
        body: JSON.stringify(testData),
      });

      if (res && res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        return ((data.test as Record<string, unknown>)?.id as string) || testId;
      }
    } catch {
      // Fall through to local
    }

    if (this.fallback) {
      await this.fallback.saveTest(testId, runId, testData);
      return testId;
    }

    return testId;
  }

  async uploadArtifact(
    runId: string,
    testId: string,
    type: string,
    filename: string,
    content: Buffer
  ): Promise<void> {
    try {
      const formData = new FormData();
      const blob = new Blob([content as unknown as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' });
      formData.append('file', blob, filename);
      formData.append('type', type);

      const res = await this.request(`/api/v1/runs/${runId}/tests/${testId}/artifacts`, {
        method: 'POST',
        headers: {},
        body: formData,
      });

      if (!(res && res.ok)) {
        throw new Error('Upload failed');
      }
    } catch {
      if (this.fallback) {
        await this.fallback.saveArtifact(testId, runId, type, filename, content);
      }
    }
  }

  async uploadTrace(runId: string, testId: string, entries: Array<Record<string, unknown>>): Promise<void> {
    try {
      const res = await this.request(`/api/v1/runs/${runId}/tests/${testId}/trace`, {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });

      if (!(res && res.ok)) {
        throw new Error('Upload failed');
      }
    } catch {
      if (this.fallback) {
        await this.fallback.saveActions(testId, runId, entries);
      }
    }
  }

  get currentRunId(): string | null {
    return this.runId;
  }
}

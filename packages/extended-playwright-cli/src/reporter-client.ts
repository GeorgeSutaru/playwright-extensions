export class ReporterApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl || process.env.REPORTER_SERVER_URL || 'http://localhost:8400').replace(/\/+$/, '');
    this.apiKey = apiKey || process.env.REPORTER_API_KEY;
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

  async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as Record<string, string>).error || res.statusText);
    }
    return res.json();
  }

  async getRuns(params?: Record<string, string>): Promise<unknown> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/v1/runs${qs}`);
  }

  async getRun(id: string): Promise<unknown> {
    return this.request(`/api/v1/runs/${id}`);
  }

  async getTestHistory(testId: string): Promise<unknown> {
    return this.request(`/api/v1/tests/${testId}/history`);
  }

  async getTraceEntries(testId: string): Promise<unknown> {
    return this.request(`/api/v1/tests/${testId}/trace-entries`);
  }

  async searchTraces(params: Record<string, string>): Promise<unknown> {
    const qs = '?' + new URLSearchParams(params).toString();
    return this.request(`/api/v1/traces/search${qs}`);
  }

  async getDiff(params: Record<string, string>): Promise<unknown> {
    const qs = '?' + new URLSearchParams(params).toString();
    return this.request(`/api/v1/traces/diff${qs}`);
  }

  async getTrends(params?: Record<string, string>): Promise<unknown> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/v1/trends${qs}`);
  }

  async getRecurringFailures(params?: Record<string, string>): Promise<unknown> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/api/v1/trends/recurring-failures${qs}`);
  }

  async importRun(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/api/v1/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

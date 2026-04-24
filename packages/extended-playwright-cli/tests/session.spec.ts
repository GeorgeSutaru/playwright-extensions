import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClientInfo } from '../src/playwright-internals';
import { PlaywrightSession, sessionConfigFromArgs } from '../src/session';
import { findSession } from '../src/registry';

const TEST_SESSION = 'test-session';

describe('session management', () => {
  let session: PlaywrightSession | null = null;
  let clientInfo: ReturnType<typeof createClientInfo>;

  beforeAll(async () => {
    clientInfo = createClientInfo();
  }, 10000);

  afterAll(async () => {
    if (session) {
      try {
        await session.stop(true);
      } catch { /* ignore */ }
    }
  }, 10000);

  it('creates and starts a new session', async () => {
    const entry = await findSession(clientInfo, TEST_SESSION);
    if (entry) {
      const existing = new PlaywrightSession(clientInfo, entry.config);
      if (await existing.canConnect()) {
        await existing.stop(true);
      }
    }

    const config = sessionConfigFromArgs(clientInfo, TEST_SESSION, {});
    session = new PlaywrightSession(clientInfo, config);
    await session.startDaemon();
    expect(session).toBeDefined();
  }, 30000);

  it('can connect to the running session', async () => {
    const entry = await findSession(clientInfo, TEST_SESSION);
    expect(entry).toBeDefined();
    expect(entry!.config.name).toBe(TEST_SESSION);

    const s = new PlaywrightSession(clientInfo, entry!.config);
    expect(await s.canConnect()).toBe(true);
  }, 10000);

  it('can execute a goto command', async () => {
    const entry = await findSession(clientInfo, TEST_SESSION);
    expect(entry).toBeDefined();

    const s = new PlaywrightSession(clientInfo, entry!.config);
    const result = await s.run({ _: ['goto', 'https://example.com'] });
    expect(result.text).toContain('example.com');
  }, 15000);

  it('can execute a snapshot command', async () => {
    const entry = await findSession(clientInfo, TEST_SESSION);
    const s = new PlaywrightSession(clientInfo, entry!.config);
    const result = await s.run({ _: ['snapshot'] });
    expect(result.text).toContain('Snapshot');
  }, 10000);

  it('can execute run-code', async () => {
    const entry = await findSession(clientInfo, TEST_SESSION);
    const s = new PlaywrightSession(clientInfo, entry!.config);
    const result = await s.run({ _: ['run-code', 'async page => page.title()'] });
    expect(result.text).toContain('Result');
  }, 10000);

  it('can execute eval', async () => {
    const entry = await findSession(clientInfo, TEST_SESSION);
    const s = new PlaywrightSession(clientInfo, entry!.config);
    const result = await s.run({ _: ['eval', '1 + 1'] });
    expect(result.text).toContain('2');
  }, 10000);
});

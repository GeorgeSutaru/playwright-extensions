import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { raceLocatorCommand } from '../src/commands/race-locator';
import * as daemon from '../src/daemon';

describe('race-locator command integration', () => {
  let exitCode: number | null = null;
  let errorOutput: string[] = [];
  let consoleErrorSpy: any;
  let originalExit: any;

  beforeEach(() => {
    exitCode = null;
    errorOutput = [];

    originalExit = process.exit;
    process.exit = ((code?: number) => {
      exitCode = code ?? 0;
    }) as any;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errorOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.exit = originalExit;
  });

  it('exits with error when no selectors provided', () => {
    raceLocatorCommand.execute([]);

    expect(exitCode).toBe(1);
    expect(errorOutput[0]).toContain('Usage:');
  });

  it('executes successfully with active session', async () => {
    // Navigate to a page with content first using real daemon
    const realSocket = await daemon.connectToSession('default');
    try {
      await daemon.daemonCall(realSocket, 'run', {
        args: { _: ['goto', 'https://example.com'] },
      });
    } finally {
      realSocket.destroy();
    }

    // Now test the command with real daemon - just verify it doesn't crash
    const realSocket2 = await daemon.connectToSession('default');
    try {
      await raceLocatorCommand.execute(['p', 'h1']);
    } finally {
      realSocket2.destroy();
    }
  }, 20000);

  it('handles session option correctly', async () => {
    const commandDone = raceLocatorCommand.execute(['#a', '#b', '--session', 'custom-session']);
    
    try {
      await commandDone;
    } catch (err: any) {
      expect(err.message).not.toContain('unknown option');
    }
    
    expect(errorOutput.some(msg => msg.includes('Race locator failed'))).toBe(true);
  });

  it('handles short session option (-s) correctly', async () => {
    const commandDone = raceLocatorCommand.execute(['#a', '#b', '-s', 'custom-session']);
    
    try {
      await commandDone;
    } catch (err: any) {
      expect(err.message).not.toContain('unknown option');
    }
    
    expect(errorOutput.some(msg => msg.includes('Race locator failed'))).toBe(true);
  });
});

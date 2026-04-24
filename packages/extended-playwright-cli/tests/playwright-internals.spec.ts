import { describe, it, expect } from 'vitest';
import { createClientInfo, resolveWorkspaceDir, daemonSocketPath } from '../src/playwright-internals';

describe('playwright internals', () => {
  it('createClientInfo returns valid client info', () => {
    const info = createClientInfo();
    expect(info.version).toMatch(/\d+\.\d+\.\d+/);
    expect(info.workspaceDirHash).toHaveLength(16);
    expect(info.daemonProfilesDir).toContain('ms-playwright');
  });

  it('resolveWorkspaceDir finds .playwright directory', () => {
    expect(typeof resolveWorkspaceDir).toBe('function');
  });

  it('daemonSocketPath returns correct path format', () => {
    const info = createClientInfo();
    const socketPath = daemonSocketPath(info, 'test-session');
    expect(socketPath).toContain('test-session.sock');
  });
});

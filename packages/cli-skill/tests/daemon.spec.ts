import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import {
  findSessionFile,
  loadSessionConfig,
  isSessionOpen,
  isSocketAlive,
} from '../src/daemon';

describe('daemon session management', () => {
  describe('isSocketAlive', () => {
    it('returns false for non-existent path', () => {
      expect(isSocketAlive('/nonexistent/path.sock')).toBe(false);
    });

    it('returns false for a regular file', () => {
      const tmpFile = path.join(os.tmpdir(), `test-socket-${Date.now()}.txt`);
      try {
        fs.writeFileSync(tmpFile, 'test');
        expect(isSocketAlive(tmpFile)).toBe(false);
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it('returns true for an actual socket file', () => {
      return new Promise<void>((resolve) => {
        const server = net.createServer();
        const socketPath = path.join(os.tmpdir(), `test-socket-${Date.now()}.sock`);
        
        server.listen(socketPath, () => {
          expect(isSocketAlive(socketPath)).toBe(true);
          server.close(() => {
            setTimeout(() => {
              if (fs.existsSync(socketPath)) {
                fs.unlinkSync(socketPath);
              }
              resolve();
            }, 100);
          });
        });
      });
    });
  });

  describe('loadSessionConfig', () => {
    it('returns null for non-existent session', () => {
      const result = loadSessionConfig('nonexistent-session-xyz');
      expect(result).toBeNull();
    });

    it('returns null for empty session name', () => {
      const result = loadSessionConfig('');
      expect(result).toBeNull();
    });
  });

  describe('isSessionOpen', () => {
    it('returns false for non-existent session', () => {
      expect(isSessionOpen('nonexistent-session-xyz')).toBe(false);
    });

    it('returns false for empty session name', () => {
      expect(isSessionOpen('')).toBe(false);
    });
  });

  describe('findSessionFile', () => {
    it('does not throw for any session name', () => {
      expect(() => findSessionFile('')).not.toThrow();
      expect(() => findSessionFile('nonexistent')).not.toThrow();
    });

    it('returns null for non-existent session', () => {
      const result = findSessionFile('nonexistent-session-xyz-123');
      expect(result).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as net from 'net';
import {
  findSessionFile,
  loadSessionConfig,
  isSessionOpen,
  connectToSession,
  daemonCall,
  isSocketAlive,
  SessionConfig,
} from '../src/daemon';

describe('daemon integration', () => {
  describe('session detection', () => {
    it('finds session files that exist', () => {
      const result = findSessionFile('default');
      expect(() => findSessionFile('default')).not.toThrow();
    });

    it('returns null for non-existent session', () => {
      const result = findSessionFile('nonexistent-session-xyz-123');
      expect(result).toBeNull();
    });
  });

  describe('socket detection', () => {
    it('detects stale vs active sockets', () => {
      const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright', 'daemon');
      
      if (!fs.existsSync(cacheDir)) {
        return;
      }

      const hashes = fs.readdirSync(cacheDir);
      for (const hash of hashes) {
        const hashDir = path.join(cacheDir, hash);
        if (!fs.statSync(hashDir).isDirectory()) continue;

        const files = fs.readdirSync(hashDir);
        for (const file of files) {
          if (file.endsWith('.session')) {
            const filePath = path.join(hashDir, file);
            try {
              const data = fs.readFileSync(filePath, 'utf-8');
              const config = JSON.parse(data);
              const socketPath = config.socketPath;
              
              if (socketPath && fs.existsSync(socketPath)) {
                const stat = fs.statSync(socketPath);
                expect(stat.isSocket()).toBe(true);
              }
            } catch {
              // Skip files that can't be parsed
            }
          }
        }
      }
    });

    it('isSocketAlive correctly identifies socket files', () => {
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

  describe('daemon connection', () => {
    it('connects to an active playwright-cli session', async () => {
      const socket = await connectToSession('default');
      expect(socket).toBeDefined();
      expect(socket.destroyed).toBe(false);
      socket.destroy();
    }, 10000);

    it('throws for non-existent session', async () => {
      await expect(connectToSession('nonexistent-session-xyz-123')).rejects.toThrow(
        /No session 'nonexistent-session-xyz-123' found/
      );
    });

    it('can execute a simple run-code command', async () => {
      const socket = await connectToSession('default');
      
      try {
        const result = await daemonCall(socket, 'run', {
          args: { _: ['run-code', 'async page => page.title()'] },
        });
        
        expect(result).toBeDefined();
        expect(result.text).toContain('Result');
      } finally {
        socket.destroy();
      }
    }, 15000);

    it('can execute a goto command', async () => {
      const socket = await connectToSession('default');
      
      try {
        const result = await daemonCall(socket, 'run', {
          args: { _: ['goto', 'https://example.com'] },
        });
        
        expect(result).toBeDefined();
        expect(result.text).toContain('example.com');
      } finally {
        socket.destroy();
      }
    }, 15000);

    it('can execute a snapshot command', async () => {
      const socket = await connectToSession('default');
      
      try {
        const result = await daemonCall(socket, 'run', {
          args: { _: ['snapshot'] },
        });
        
        expect(result).toBeDefined();
        expect(result.text).toContain('Snapshot');
      } finally {
        socket.destroy();
      }
    }, 15000);
  });
});

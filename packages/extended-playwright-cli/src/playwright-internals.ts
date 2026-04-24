import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

interface PlaywrightPaths {
  cliBin: string;
  cliPkgDir: string;
  playwrightDir: string;
  cliJs: string;
}

function resolvePlaywrightPaths(): PlaywrightPaths | null {
  try {
    const result = spawnSync('which', ['playwright-cli'], { encoding: 'utf-8', shell: true });
    if (result.status !== 0 || !result.stdout.trim()) return null;

    const cliBin = result.stdout.trim();
    const resolvedBin = fs.realpathSync(cliBin);
    const cliPkgDir = path.dirname(resolvedBin);
    const playwrightDir = path.join(cliPkgDir, 'node_modules', 'playwright');
    const cliJs = path.join(playwrightDir, 'cli.js');

    if (!fs.existsSync(cliJs)) return null;

    return { cliBin, cliPkgDir, playwrightDir, cliJs };
  } catch {
    return null;
  }
}

const playwrightPaths = resolvePlaywrightPaths();

export interface ClientInfo {
  version: string;
  workspaceDir: string | undefined;
  workspaceDirHash: string;
  daemonProfilesDir: string;
}

export function resolvePlaywrightPath(subPath: string): string | null {
  if (!playwrightPaths) return null;
  return path.join(playwrightPaths.playwrightDir, subPath);
}

export function resolveCliJs(): string | null {
  return playwrightPaths?.cliJs ?? null;
}

export function resolveWorkspaceDir(startDir: string): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.playwright'))) {
      return dir;
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }
  return undefined;
}

export function createClientInfo(): ClientInfo {
  const crypto = require('crypto');

  if (!playwrightPaths) {
    throw new Error('playwright-cli not found. Install with: npm install -g @playwright/cli');
  }

  const packageJSON = require(path.join(playwrightPaths.playwrightDir, 'package.json'));
  const workspaceDir = resolveWorkspaceDir(process.cwd());
  const version = process.env.PLAYWRIGHT_CLI_VERSION_FOR_TEST || packageJSON.version;

  const hash = crypto.createHash('sha1');
  hash.update(workspaceDir || packageJSON.version);
  const workspaceDirHash = hash.digest('hex').substring(0, 16);

  const baseDaemonDir = (() => {
    if (process.env.PLAYWRIGHT_DAEMON_SESSION_DIR) {
      return process.env.PLAYWRIGHT_DAEMON_SESSION_DIR;
    }
    let localCacheDir: string;
    if (process.platform === 'linux') {
      localCacheDir = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
    } else if (process.platform === 'darwin') {
      localCacheDir = path.join(os.homedir(), 'Library', 'Caches');
    } else if (process.platform === 'win32') {
      localCacheDir = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    } else {
      throw new Error('Unsupported platform: ' + process.platform);
    }
    return path.join(localCacheDir, 'ms-playwright', 'daemon');
  })();

  return {
    version,
    workspaceDir,
    workspaceDirHash,
    daemonProfilesDir: path.join(baseDaemonDir, workspaceDirHash),
  };
}

export function daemonSocketPath(clientInfo: ClientInfo, sessionName: string): string {
  const socketName = `${sessionName}.sock`;
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\${clientInfo.workspaceDirHash}-${socketName}`;
  }
  const socketsDir = process.env.PLAYWRIGHT_DAEMON_SOCKETS_DIR || path.join(os.tmpdir(), 'playwright-cli');
  return path.join(socketsDir, clientInfo.workspaceDirHash, socketName);
}

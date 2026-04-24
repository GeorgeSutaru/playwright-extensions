import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClientInfo } from './playwright-internals';
import { SessionConfig } from './session';

export interface SessionEntry {
  file: string;
  config: SessionConfig;
}

function getBaseDaemonDir(): string {
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
}

export async function loadSessionEntry(file: string): Promise<SessionEntry | undefined> {
  try {
    const data = await fs.promises.readFile(file, 'utf-8');
    const config = JSON.parse(data) as SessionConfig;
    if (!config.name) {
      config.name = path.basename(file, '.session');
    }
    if (!config.timestamp) {
      config.timestamp = 0;
    }
    return { file, config };
  } catch {
    return undefined;
  }
}

export async function loadAllSessions(): Promise<Map<string, SessionEntry[]>> {
  const baseDir = getBaseDaemonDir();
  const sessions = new Map<string, SessionEntry[]>();

  const hashDirs = await fs.promises.readdir(baseDir).catch(() => []);
  for (const workspaceDirHash of hashDirs) {
    const hashDir = path.join(baseDir, workspaceDirHash);
    const stat = await fs.promises.stat(hashDir).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const files = await fs.promises.readdir(hashDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('.session')) continue;
      const filePath = path.join(hashDir, file);
      const entry = await loadSessionEntry(filePath);
      if (!entry) continue;

      const key = entry.config.workspaceDir || workspaceDirHash;
      let list = sessions.get(key);
      if (!list) {
        list = [];
        sessions.set(key, list);
      }
      list.push(entry);
    }
  }

  return sessions;
}

export async function findSession(clientInfo: ClientInfo, sessionName: string): Promise<SessionEntry | undefined> {
  const sessions = await loadAllSessions();
  const key = clientInfo.workspaceDir || clientInfo.workspaceDirHash;
  const entries = sessions.get(key) || [];
  return entries.find(e => e.config.name === sessionName);
}

export async function listSessionsForWorkspace(clientInfo: ClientInfo): Promise<SessionEntry[]> {
  const sessions = await loadAllSessions();
  const key = clientInfo.workspaceDir || clientInfo.workspaceDirHash;
  return sessions.get(key) || [];
}

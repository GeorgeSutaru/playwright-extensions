import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';

export interface SessionConfig {
  name: string;
  socketPath: string;
  version: string;
  [key: string]: any;
}

function isSocketAlive(socketPath: string): boolean {
  if (!fs.existsSync(socketPath)) {
    return false;
  }
  try {
    const stat = fs.statSync(socketPath);
    return stat.isSocket();
  } catch {
    return false;
  }
}

export function findSessionFile(sessionName: string): string | null {
  const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright', 'daemon');
  if (!fs.existsSync(cacheDir)) {
    return null;
  }

  const hashes = fs.readdirSync(cacheDir);
  const candidates: { filePath: string; socketPath: string | null }[] = [];

  for (const hash of hashes) {
    const hashDir = path.join(cacheDir, hash);
    if (!fs.statSync(hashDir).isDirectory()) continue;

    const files = fs.readdirSync(hashDir);
    for (const file of files) {
      if (file === `${sessionName}.session` || file.startsWith(`${sessionName}.`)) {
        const filePath = path.join(hashDir, file);
        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const config = JSON.parse(data);
          candidates.push({ filePath, socketPath: config.socketPath || null });
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0].filePath;
  }

  const active = candidates.find(c => c.socketPath && isSocketAlive(c.socketPath));
  if (active) {
    return active.filePath;
  }

  const lastModified = candidates
    .map(c => {
      try {
        return { ...c, mtime: fs.statSync(c.filePath).mtimeMs };
      } catch {
        return { ...c, mtime: 0 };
      }
    })
    .sort((a, b) => b.mtime - a.mtime)[0];

  return lastModified?.filePath || candidates[0].filePath;
}

export { isSocketAlive };

export function loadSessionConfig(sessionName: string): SessionConfig | null {
  const sessionFile = findSessionFile(sessionName);
  if (!sessionFile) {
    return null;
  }

  try {
    const data = fs.readFileSync(sessionFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function isSessionOpen(sessionName: string): boolean {
  const config = loadSessionConfig(sessionName);
  if (!config) return false;
  return fs.existsSync(config.socketPath);
}

export async function connectToSession(sessionName: string): Promise<net.Socket> {
  const config = loadSessionConfig(sessionName);
  if (!config) {
    throw new Error(`No session '${sessionName}' found`);
  }
  if (!fs.existsSync(config.socketPath)) {
    throw new Error(`Session '${sessionName}' is not open`);
  }

  return new Promise<net.Socket>((resolve, reject) => {
    const socket = net.createConnection(config.socketPath, () => {
      resolve(socket);
    });
    socket.on('error', reject);
  });
}

export async function daemonCall(
  socket: net.Socket,
  method: string,
  params: Record<string, any>,
  version: string = '1.49.1',
): Promise<any> {
  const messageId = Math.floor(Math.random() * 1000000);
  const message = {
    id: messageId,
    method,
    params: { cwd: process.cwd(), ...params },
    version,
  };

  const responsePromise = new Promise<any>((resolve, reject) => {
    const handler = (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === messageId) {
          socket.off('data', handler);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };
    socket.on('data', handler);
  });

  socket.write(JSON.stringify(message) + '\n');
  return responsePromise;
}

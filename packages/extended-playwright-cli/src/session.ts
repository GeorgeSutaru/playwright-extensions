import net from 'net';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { ClientInfo, daemonSocketPath, resolvePlaywrightPath } from './playwright-internals';

export interface SessionConfig {
  name: string;
  version: string;
  timestamp: number;
  socketPath: string;
  cli: {
    headed?: boolean;
    extension?: boolean;
    browser?: string;
    persistent?: boolean;
    profile?: string | null;
    config?: string;
  };
  userDataDirPrefix: string;
  workspaceDir: string | undefined;
  resolvedConfig?: Record<string, any>;
}

export interface CommandResult {
  isError: boolean;
  text: string;
}

class SocketConnection {
  private _socket: net.Socket;
  private _version: string;
  private _buffer = '';
  private _callbacks = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private _nextId = 1;

  constructor(socket: net.Socket, version: string) {
    this._socket = socket;
    this._version = version;
    socket.on('data', (data: Buffer) => this._onData(data.toString()));
    socket.on('error', () => this._cleanup(new Error('Socket error')));
    socket.on('close', () => this._cleanup(new Error('Session closed')));
  }

  async send(message: { id: number; method: string; params: Record<string, any> }): Promise<void> {
    return new Promise<void>((resolve) => {
      this._socket.write(`${JSON.stringify({ ...message, version: this._version })}\n`, () => resolve());
    });
  }

  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = this._nextId++;
    const promise = new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject });
    });
    await this.send({ id, method, params });
    return promise;
  }

  close() {
    this._cleanup(new Error('Session closed'));
  }

  private _onData(data: string) {
    this._buffer += data;
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.id && this._callbacks.has(message.id)) {
          const cb = this._callbacks.get(message.id)!;
          this._callbacks.delete(message.id);
          if (message.error) cb.reject(new Error(message.error));
          else cb.resolve(message.result);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  private _cleanup(error: Error) {
    for (const cb of this._callbacks.values()) {
      cb.reject(error);
    }
    this._callbacks.clear();
    this._socket.destroy();
  }
}

export class PlaywrightSession {
  private _connection: SocketConnection | undefined;
  private _clientInfo: ClientInfo;
  public config: SessionConfig;

  constructor(clientInfo: ClientInfo, config: SessionConfig) {
    this._clientInfo = clientInfo;
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  private _sessionFile(suffix: string): string {
    return path.resolve(this._clientInfo.daemonProfilesDir, `${this.name}${suffix}`);
  }

  async canConnect(): Promise<boolean> {
    try {
      const socket = net.createConnection(this.config.socketPath);
      return new Promise<boolean>((resolve) => {
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
      });
    } catch {
      return false;
    }
  }

  async run(args: Record<string, any>, cwd?: string): Promise<CommandResult> {
    const conn = await this._ensureConnection();
    const result = await conn.call('run', { args, cwd: cwd || process.cwd() });
    this.disconnect();
    return result;
  }

  async stop(quiet = false): Promise<void> {
    if (!await this.canConnect()) {
      if (!quiet) console.log(`Browser '${this.name}' is not open.`);
      return;
    }
    try {
      const conn = await this._ensureConnection();
      await conn.call('stop');
    } catch {
      // ignore stop errors
    }
    if (os.platform() !== 'win32') {
      await fs.promises.unlink(this.config.socketPath).catch(() => {});
    }
    this.disconnect();
    if (!this.config.cli.persistent) {
      await this.deleteSessionConfig();
    }
    if (!quiet) console.log(`Browser '${this.name}' closed\n`);
  }

  async startDaemon(): Promise<void> {
    await fs.promises.mkdir(this._clientInfo.daemonProfilesDir, { recursive: true });
    const sessionConfigFile = this._sessionFile('.session');
    this.config.version = this._clientInfo.version;
    this.config.timestamp = Date.now();
    await fs.promises.writeFile(sessionConfigFile, JSON.stringify(this.config, null, 2));

    const errLog = this._sessionFile('.err');
    const errFd = fs.openSync(errLog, 'w');

    const cliPath = resolvePlaywrightPath('cli.js');
    if (!cliPath) {
      throw new Error('Cannot resolve playwright cli.js path');
    }

    const child = spawn(process.execPath, [
      cliPath,
      'run-cli-server',
      `--daemon-session=${sessionConfigFile}`,
    ], {
      detached: true,
      stdio: ['ignore', 'pipe', errFd],
      cwd: process.cwd(),
    });

    let signalled = false;
    const sigintHandler = () => { signalled = true; child.kill('SIGINT'); };
    const sigtermHandler = () => { signalled = true; child.kill('SIGTERM'); };
    process.on('SIGINT', sigintHandler);
    process.on('SIGTERM', sigtermHandler);

    let outLog = '';
    await new Promise<void>((resolve, reject) => {
      child.stdout!.on('data', (data: Buffer) => {
        outLog += data.toString();
        if (!outLog.includes('<EOF>')) return;

        const errorMatch = outLog.match(/### Error\n([\s\S]*)<EOF>/);
        if (errorMatch) {
          const error = errorMatch[1].trim();
          const errContent = fs.readFileSync(errLog, 'utf-8');
          reject(new Error(error + (errContent ? '\n' + errContent : '')));
          return;
        }

        const successMatch = outLog.match(/### Success\nDaemon listening on (.*)\n<EOF>/);
        if (successMatch) {
          resolve();
        }
      });
      child.on('close', (code: number) => {
        if (!signalled) reject(new Error(`Daemon process exited with code ${code}`));
      });
    });

    process.off('SIGINT', sigintHandler);
    process.off('SIGTERM', sigtermHandler);
    child.stdout!.destroy();
    child.unref();

    const canConn = await this.canConnect();
    if (!canConn) {
      console.error(`Failed to connect to daemon at ${this.config.socketPath}`);
      process.exit(1);
    }

    console.log(`### Browser \`${this.name}\` opened with pid ${child.pid}.`);
    const resolvedConfig = parseResolvedConfig(outLog);
    if (resolvedConfig) {
      this.config.resolvedConfig = resolvedConfig;
      console.log(`- ${this.name}:`);
      console.log(renderResolvedConfig(resolvedConfig).join('\n'));
    }
    console.log(`---`);

    this.config.timestamp = Date.now();
    await fs.promises.writeFile(sessionConfigFile, JSON.stringify(this.config, null, 2));
  }

  disconnect() {
    if (!this._connection) return;
    this._connection.close();
    this._connection = undefined;
  }

  async deleteSessionConfig(): Promise<void> {
    await fs.promises.rm(this._sessionFile('.session')).catch(() => {});
  }

  private async _ensureConnection(): Promise<SocketConnection> {
    if (this._connection) return this._connection;
    const socket = net.createConnection(this.config.socketPath);
    this._connection = new SocketConnection(socket, this.config.version);
    return this._connection;
  }
}

function renderResolvedConfig(resolvedConfig: Record<string, any>): string[] {
  const channel = resolvedConfig.browser?.launchOptions?.channel ?? resolvedConfig.browser?.browserName;
  const lines: string[] = [];
  if (channel) lines.push(`  - browser-type: ${channel}`);
  if (resolvedConfig.browser?.isolated) {
    lines.push(`  - user-data-dir: <in-memory>`);
  } else {
    lines.push(`  - user-data-dir: ${resolvedConfig.browser?.userDataDir}`);
  }
  lines.push(`  - headed: ${!resolvedConfig.browser?.launchOptions?.headless}`);
  return lines;
}

function parseResolvedConfig(log: string): Record<string, any> | null {
  const marker = '### Config\n```json\n';
  const idx = log.indexOf(marker);
  if (idx === -1) return null;
  const jsonStart = idx + marker.length;
  const jsonEnd = log.indexOf('\n```', jsonStart);
  if (jsonEnd === -1) return null;
  const jsonStr = log.substring(jsonStart, jsonEnd).trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function sessionConfigFromArgs(clientInfo: ClientInfo, sessionName: string, args: Record<string, any>): SessionConfig {
  const fs = require('fs');
  let config = args.config ? path.resolve(args.config) : undefined;
  try {
    if (!config && fs.existsSync(path.resolve('.playwright', 'cli.config.json'))) {
      config = path.resolve('.playwright', 'cli.config.json');
    }
  } catch { /* ignore */ }

  if (!args.persistent && args.profile) {
    args.persistent = true;
  }

  return {
    name: sessionName,
    version: clientInfo.version,
    timestamp: 0,
    socketPath: daemonSocketPath(clientInfo, sessionName),
    cli: {
      headed: args.headed,
      extension: args.extension,
      browser: args.browser,
      persistent: args.persistent,
      profile: args.profile,
      config,
    },
    userDataDirPrefix: path.resolve(clientInfo.daemonProfilesDir, `ud-${sessionName}`),
    workspaceDir: clientInfo.workspaceDir,
  };
}

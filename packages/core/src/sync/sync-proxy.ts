const { Worker } = require('worker_threads');
const { resolve, dirname } = require('path');

const dispatcherPath = resolve(dirname(__filename), 'worker.js');

// ── Shared buffer protocol ───────────────────────────────────────
// Layout (Int32Array view):
//   [0]  status  - 0=waiting, 1=ok, -1=error
//   [1]  dataLen - JSON bytes in data region
//   [4+] data    - raw JSON bytes (Uint8Array view)

const HEADER_SIZE = 8;
const DATA_SIZE = 1 * 1024 * 1024; // 1 MB

function createSharedBuffer() {
  return new SharedArrayBuffer(HEADER_SIZE + DATA_SIZE);
}

function readResult(sab: SharedArrayBuffer): unknown {
  const header = new Int32Array(sab, 0, 2);
  const dataLen = Atomics.load(header, 1);
  const buf8 = new Uint8Array(sab, HEADER_SIZE);
  const json = Buffer.from(buf8).slice(0, dataLen).toString('utf8');
  return JSON.parse(json);
}

function clearSignal(sab: SharedArrayBuffer) {
  const header = new Int32Array(sab, 0, 2);
  Atomics.store(header, 0, 0);
  Atomics.store(header, 1, 0);
}

// ── SyncWorker ───────────────────────────────────────────────────
export class SyncWorker {
  private dispatcher: Worker;
  private sab: SharedArrayBuffer;

  constructor() {
    this.sab = createSharedBuffer();
    const header = new Int32Array(this.sab, 0, 2);

    this.dispatcher = new Worker(dispatcherPath);

    // Send SAB to worker via postMessage (SABs are shared, not transferred)
    this.dispatcher.postMessage({ type: 'init', sab: this.sab });

    // Wait for worker to acknowledge SAB received
    while (Atomics.load(header, 0) === 0) {
      Atomics.wait(header, 0, 0, 1);
    }
    clearSignal(this.sab);

    (this.dispatcher as any).on('error', (err: Error) => {
      throw err;
    });
  }

  sendSync(request: Record<string, unknown>): unknown {
    const header = new Int32Array(this.sab, 0, 2);

    this.dispatcher.postMessage({ type: 'request', request });

    // Spin-wait with Atomics.wait for result
    while (true) {
      const status = Atomics.load(header, 0);
      if (status !== 0) {
        const result = readResult(this.sab);
        clearSignal(this.sab);

        if (status === -1) {
          const typed = result as Record<string, unknown>;
          const msg = typed.message as string || 'Unknown worker error';
          const ctx = typed.context as Record<string, unknown> | undefined;
          if (ctx?.stack) {
            throw Object.assign(new Error(msg), { stack: ctx.stack });
          }
          throw new Error(msg);
        }
        return result;
      }
      Atomics.wait(header, 0, 0, 1);
    }
  }

  close() {
    this.dispatcher.terminate();
  }
}

// ── Result unwrapping ────────────────────────────────────────────
function unwrapResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (typeof result !== 'object') return result;
  if (Array.isArray(result)) return result.map(unwrapResult);
  if ('__pw_sync_type' in result) {
    const typed = result as Record<string, unknown>;
    switch (typed.__pw_sync_type) {
      case 'undefined': return undefined;
      case 'bigint': return BigInt(typed.value as string);
      case 'error': return new Error(typed.message as string);
      default: return result;
    }
  }
  const unwrapped: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(result as Record<string, unknown>)) {
    unwrapped[key] = unwrapResult(val);
  }
  return unwrapped;
}

export function createSyncProxy(objectId: string, worker: SyncWorker): SyncProxy {
  // Cache for resolved properties (avoids repeated worker round-trips)
  const propCache = new Map<string, unknown>();

  const target = new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === '_objectId') return objectId;
      if (prop === '__worker') return worker;
      if (typeof prop === 'symbol') return undefined;

      const propStr = prop as string;

      // Return cached value if available
      if (propCache.has(propStr)) {
        return propCache.get(propStr)!;
      }

      // Ask worker whether this property is a function or a value
      const raw = worker.sendSync({ type: 'get', objectId, property: propStr });
      const typed = raw as Record<string, unknown>;

      if (typed && typeof typed === 'object' && typed.__pw_sync_type === 'isFunction') {
        // It's a method — return a callable
        const fn = (...args: unknown[]) => {
          const serializedArgs = serializeArgs(args);
          return syncCall(worker, objectId, propStr, serializedArgs, target);
        };
        propCache.set(propStr, fn);
        return fn;
      }

      // It's a property value — unwrap (may be a Playwright object → sync proxy)
      const value = unwrapSyncResult(raw, worker);
      propCache.set(propStr, value);
      return value;
    },
    has(_t, prop) {
      return syncHas(worker, objectId, prop as string);
    },
  });
  return target as any;
}

// ── Argument serialization ───────────────────────────────────────
function serializeArg(arg: unknown, seen: WeakSet<any> = new WeakSet()): unknown {
  if (arg === null || arg === undefined) return arg;
  if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') return arg;
  if (typeof arg === 'function') {
    // Serialize function as source string for eval in worker
    return { __pw_sync_type: 'function', value: arg.toString() };
  }
  if (typeof arg !== 'object') return arg;

  // Detect sync proxy via get trap (not has trap which round-trips to worker)
  const id = (arg as any)._objectId;
  const wrk = (arg as any).__worker;
  if (typeof id === 'string' && wrk) {
    return { __pw_sync_type: 'objectId', id };
  }

  if (Array.isArray(arg)) {
    return arg.map(item => serializeArg(item, seen));
  }

  // Circular reference protection
  if (seen.has(arg)) return null;
  seen.add(arg);

  const serialized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(arg as Record<string, unknown>)) {
    serialized[key] = serializeArg(val, seen);
  }
  return serialized;
}

function serializeArgs(args: unknown[]): unknown[] {
  return args.map(arg => serializeArg(arg));
}

function syncCall(worker: SyncWorker, objectId: string, method: string, args: unknown[], proxyTarget: object): unknown {
  const raw = worker.sendSync({ type: 'call', objectId, method, args });
  const unwrapped = unwrapSyncResult(raw, worker);
  // Return the proxy itself for void results to enable chaining
  if (unwrapped === undefined) return proxyTarget as unknown;
  return unwrapped;
}

function syncHas(worker: SyncWorker, objectId: string, property: string): boolean {
  const raw = worker.sendSync({ type: 'has', objectId, property });
  return raw as boolean;
}

function unwrapSyncResult(result: unknown, worker: SyncWorker): unknown {
  const unwrapped = unwrapResult(result);
  if (unwrapped && typeof unwrapped === 'object' && '__pw_sync_type' in unwrapped) {
    const typed = unwrapped as Record<string, unknown>;
    if (typed.__pw_sync_type === 'objectId') {
      return createSyncProxy(typed.id as string, worker);
    }
  }
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((item: unknown) => unwrapSyncResult(item, worker));
  }
  if (unwrapped && typeof unwrapped === 'object' && !('__pw_sync_type' in unwrapped)) {
    const obj = unwrapped as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      obj[key] = unwrapSyncResult(val, worker);
    }
  }
  return unwrapped;
}

export class SyncProxy {
  // Interface marker
}

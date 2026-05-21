const { parentPort } = require('worker_threads');
const playwright = require('playwright');

// ── Shared buffer protocol ───────────────────────────────────────
// Layout:
//   [0]     int32  status   - 0=waiting, 1=ok, -1=error
//   [4]     int32  dataLen  - length of JSON data in bytes
//   [8+]    bytes  data     - JSON result or error object

const HEADER_SIZE = 8;

let sab: SharedArrayBuffer | null = null;

function writeResult(result: unknown) {
  if (!sab) return;
  const header = new Int32Array(sab, 0, 2);
  const buf8 = new Uint8Array(sab, HEADER_SIZE);
  const json = JSON.stringify(result);
  const bytes = Buffer.from(json, 'utf8');
  const len = Math.min(bytes.length, buf8.length);
  for (let i = 0; i < len; i++) buf8[i] = bytes[i];
  Atomics.store(header, 0, 1);
  Atomics.store(header, 1, bytes.length);
  Atomics.notify(header, 0, 1);
}

function writeError(message: string, stack?: string, context?: { method?: string; objectId?: string }) {
  if (!sab) return;
  const header = new Int32Array(sab, 0, 2);
  const buf8 = new Uint8Array(sab, HEADER_SIZE);
  const enriched = context
    ? `[SyncWorker] ${context.method ? `Method "${context.method}" on ${context.objectId}: ` : ''}${message}`
    : `[SyncWorker] ${message}`;
  const json = JSON.stringify({ __pw_sync_type: 'error', message: enriched, stack, context });
  const bytes = Buffer.from(json, 'utf8');
  const len = Math.min(bytes.length, buf8.length);
  for (let i = 0; i < len; i++) buf8[i] = bytes[i];
  Atomics.store(header, 0, -1);
  Atomics.store(header, 1, bytes.length);
  Atomics.notify(header, 0, 1);
}

// ── Object registry ──────────────────────────────────────────────
const objects = new Map<string, unknown>();
let idCounter = 0;

function assignId(obj: unknown): string {
  const id = `obj_${++idCounter}`;
  objects.set(id, obj);
  return id;
}

function isPlaywrightObject(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  // Playwright internal type tag
  const tag = (value as any)?._type?.tag;
  if (tag) return true;
  // Has Playwright-like methods
  if (typeof (value as any).locator === 'function') return true;
  if (typeof (value as any).newPage === 'function') return true;
  if (typeof (value as any).newContext === 'function') return true;
  if (typeof (value as any).browser === 'function') return true;
  if (typeof (value as any).frames === 'function') return true;
  if (typeof (value as any).evaluateHandle === 'function') return true;
  if (typeof (value as any).status === 'function' && typeof (value as any).headers === 'function') return true;
  if (typeof (value as any).jsonValue === 'function') return true;
  if (typeof (value as any).asElement === 'function') return true;
  // Keyboard/mouse/touchscreen/accessibility/coverage
  if (typeof (value as any).press === 'function' && typeof (value as any).type === 'function') return true;
  if (typeof (value as any).click === 'function' && typeof (value as any).move === 'function') return true;
  if (typeof (value as any).tap === 'function' && typeof (value as any).move !== 'function') return true;
  if (typeof (value as any).snapshot === 'function') return true;
  if (typeof (value as any).startJSCoverage === 'function') return true;
  if (typeof (value as any).start === 'function' && typeof (value as any).stop === 'function' && typeof (value as any).stopTraceChunk === 'function') return true;
  return false;
}

function serializeResult(result: unknown, seen: WeakSet<any> = new WeakSet()): unknown {
  if (result === undefined) return { __pw_sync_type: 'undefined' };
  if (result === null) return null;
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') return result;
  if (typeof result === 'bigint') return { __pw_sync_type: 'bigint', value: result.toString() };
  if (Array.isArray(result)) {
    return result.map(item => {
      if (isPlaywrightObject(item)) return { __pw_sync_type: 'objectId', id: assignId(item) };
      return serializeResult(item, seen);
    });
  }
  if (isPlaywrightObject(result)) {
    return { __pw_sync_type: 'objectId', id: assignId(result) };
  }
  if (result instanceof Error) {
    return { __pw_sync_type: 'error', message: result.message, stack: result.stack };
  }
  if (typeof result === 'object') {
    // Circular reference protection
    if (seen.has(result)) return null;
    seen.add(result);

    const serialized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(result as Record<string, unknown>)) {
      if (isPlaywrightObject(val)) {
        serialized[key] = { __pw_sync_type: 'objectId', id: assignId(val) };
      } else {
        serialized[key] = serializeResult(val, seen);
      }
    }
    return serialized;
  }
  return result;
}

function deserializeArg(arg: unknown): unknown {
  if (arg === null || arg === undefined) return arg;
  if (typeof arg !== 'object') return arg;
  if (Array.isArray(arg)) return arg.map(deserializeArg);
  const typed = arg as Record<string, unknown>;
  if (typed.__pw_sync_type === 'objectId') return objects.get(typed.id as string);
  if (typed.__pw_sync_type === 'undefined') return undefined;
  if (typed.__pw_sync_type === 'bigint') return BigInt(typed.value as string);
  if (typed.__pw_sync_type === 'error') return new Error(typed.message as string);
  if (typed.__pw_sync_type === 'function') {
    // Deserialize function from source string
    try {
      return new Function('return ' + typed.value as string)();
    } catch {
      return typed.value;
    }
  }
  const deserialized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(arg as Record<string, unknown>)) {
    deserialized[key] = deserializeArg(val);
  }
  return deserialized;
}

// ── Playwright operations ────────────────────────────────────────
const browserTypes: Record<string, typeof playwright.chromium> = {
  chromium: playwright.chromium,
  firefox: playwright.firefox,
  webkit: playwright.webkit,
};

async function handleRequest(request: {
  type: string;
  objectId?: string;
  method?: string;
  property?: string;
  args?: unknown[];
  data?: unknown;
  launchOptions?: unknown;
  connectOptions?: unknown;
}): Promise<unknown> {
  switch (request.type) {
    case 'launch': {
      const browserType = browserTypes[request.data as string];
      if (!browserType) throw new Error(`Unknown browser type: ${request.data}`);
      const opts = deserializeArg(request.launchOptions) || {};
      const browser = await browserType.launch(opts as any);
      const id = assignId(browser);
      return { __pw_sync_type: 'objectId', id };
    }
    case 'connect': {
      const url = request.data as string;
      const opts = deserializeArg(request.connectOptions) || {};
      const browser = await playwright.chromium.connect(url, opts as any);
      const id = assignId(browser);
      return { __pw_sync_type: 'objectId', id };
    }
    case 'call': {
      const obj = objects.get(request.objectId!);
      if (!obj) throw new Error(`Object ${request.objectId} not found in registry. The object may have been closed or never registered.`);
      const method = request.method!;
      const args = (request.args || []).map(deserializeArg);
      const fn = (obj as any)[method];
      if (typeof fn !== 'function') throw new Error(`"${method}" is not a function on object ${request.objectId}. Check the method name and that the object is the expected type.`);
      const result = await fn.apply(obj, args);
      return serializeResult(result);
    }
    case 'get': {
      const obj = objects.get(request.objectId!);
      if (!obj) throw new Error(`Object ${request.objectId} not found when accessing property "${request.property}". The object may have been closed.`);
      const value = (obj as any)[request.property!];
      if (typeof value === 'function') {
        return { __pw_sync_type: 'isFunction', value: true };
      }
      return serializeResult(value);
    }
    case 'has': {
      const obj = objects.get(request.objectId!);
      if (!obj) throw new Error(`Object ${request.objectId} not found when checking property "${request.property}".`);
      return request.property! in (obj as object);
    }
    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// ── Init & request handling ─────────────────────────────────────
parentPort?.on('message', async (msg: { type: string; sab?: SharedArrayBuffer; request?: Record<string, unknown> }) => {
  if (msg.type === 'init') {
    sab = msg.sab!;
    const header = new Int32Array(sab, 0, 2);
    Atomics.store(header, 0, 1);
    Atomics.notify(header, 0, 1);
    return;
  }

  if (msg.type === 'request') {
    try {
      const result = await handleRequest(msg.request as any);
      writeResult(result);
    } catch (err: any) {
      const ctx = {
        method: msg.request?.method as string | undefined,
        objectId: msg.request?.objectId as string | undefined,
      };
      writeError(err.message, err.stack, ctx);
    }
  }
});

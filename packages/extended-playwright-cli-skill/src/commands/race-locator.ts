import { CliCommand } from './types';
import { connectToSession, daemonCall } from '../daemon';

export function buildScript(selectors: string[], timeout: number, visibilityMode: string): string {
  const locatorsCode = selectors.map(s => {
    const escaped = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    return `page.locator('${escaped}')`;
  }).join(',\n    ');

  return `async page => {
  const locators = [${locatorsCode}];
  const timeout = ${timeout};
  const visibilityMode = '${visibilityMode}';
  const state = visibilityMode === 'presence' ? 'attached' : 'visible';

  if (locators.length === 1) {
    await locators[0].waitFor({ state, timeout });
    return { selector: locators[0].toString(), text: await locators[0].textContent() };
  }

  const compound = locators.reduce((acc, loc) => acc.or(loc));
  await compound.waitFor({ state, timeout });

  for (const loc of locators) {
    try {
      const visible = visibilityMode === 'presence'
        ? await loc.count() > 0
        : await loc.isVisible();
      if (visible) {
        return { selector: loc.toString(), text: await loc.textContent() };
      }
    } catch {}
  }

  throw new Error('No locator satisfied the visibility condition');
}`;
}

export function parseArgs(args: string[]): {
  selectors: string[];
  timeout: number;
  visibilityMode: string;
  session: string;
} {
  const result: {
    selectors: string[];
    timeout: number;
    visibilityMode: string;
    session: string;
  } = {
    selectors: [],
    timeout: 0,
    visibilityMode: 'default',
    session: process.env.PLAYWRIGHT_CLI_SESSION || 'default',
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--timeout' && i + 1 < args.length) {
      result.timeout = parseInt(args[++i], 10);
    } else if (arg === '--visibility' && i + 1 < args.length) {
      result.visibilityMode = args[++i];
    } else if (arg === '--session' && i + 1 < args.length) {
      result.session = args[++i];
    } else if (arg === '-s' && i + 1 < args.length) {
      result.session = args[++i];
    } else if (!arg.startsWith('-')) {
      result.selectors.push(arg);
    }
    i++;
  }

  return result;
}

export const raceLocatorCommand: CliCommand = {
  name: 'race-locator',
  description: 'Race multiple locators and return the visible one',
  async execute(args: string[]): Promise<void> {
    const result = parseArgs(args);

    if (result.selectors.length === 0) {
      console.error('Usage: pw-ext race-locator <selector1> <selector2> ... [--timeout ms] [--visibility mode] [--session name]');
      process.exit(1);
    }

    const script = buildScript(result.selectors, result.timeout, result.visibilityMode);

    try {
      const socket = await connectToSession(result.session);
      try {
        const result2 = await daemonCall(socket, 'run', {
          args: { _: ['run-code', script] },
        });

        if (result2 && result2.text) {
          console.log(result2.text);
        }
      } finally {
        socket.destroy();
      }
    } catch (err: any) {
      console.error(`Race locator failed: ${err.message}`);
      process.exit(1);
    }
  },
};

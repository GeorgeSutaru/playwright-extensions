import minimist from 'minimist';
import { createClientInfo } from './playwright-internals';
import { PlaywrightSession, sessionConfigFromArgs } from './session';
import { findSession, listSessionsForWorkspace } from './registry';
import { commandNames, getCommand } from './commands';

const customCommands = new Set(commandNames);
const globalOptions = ['browser', 'config', 'extension', 'headed', 'help', 'persistent', 'profile', 'session', 'version'];

function printHelp(): void {
  console.log(`extended-playwright-cli - Extended Playwright CLI with additional commands

Usage:
  extended-playwright-cli <command> [args] [options]

Built-in commands:
  open [url]                       Open browser session
  close                            Close browser session
  goto <url>                       Navigate to URL
  type <text>                      Type text
  click <ref>                      Click element
  snapshot                         Capture page snapshot
  eval <func>                      Evaluate JavaScript
  screenshot [ref]                 Take screenshot
  tab-list                         List tabs
  tab-new [url]                    New tab
  tab-close [index]                Close tab
  tab-select <index>               Select tab
  go-back                          Navigate back
  go-forward                       Navigate forward
  reload                           Reload page
  list                             List browser sessions
  close-all                        Close all sessions
  install                          Initialize workspace
  show                             Show DevTools

Extended commands:
  race-locator <selectors...>      Race multiple locators, return the visible one
    --timeout <ms>                 Timeout in milliseconds
    --visibility <mode>            Visibility mode: default, visible, presence
    --session <name>               Session name (default: default)

Global options:
  -s, --session <name>             Session name (default: default)
  --headed                         Run in headed mode
  --browser <name>                 Browser name
  --persistent                     Use persistent context
  --profile <dir>                  Profile directory
  --config <file>                  Config file path
  --help, -h                       Show help
  --version                        Show version

Examples:
  extended-playwright-cli open https://example.com
  extended-playwright-cli snapshot
  extended-playwright-cli race-locator "#a" "#b" --timeout 5000
`);
}

function printCommandHelp(commandName: string): void {
  if (commandName === 'race-locator') {
    console.log(`Usage: extended-playwright-cli race-locator <selector1> [selector2 ...] [options]

Race multiple locators and return the first one that becomes visible.

Arguments:
  selector1, selector2, ...   CSS selectors to race

Options:
  --timeout <ms>              Timeout in milliseconds (default: 0, no timeout)
  --visibility <mode>         Visibility mode: default, visible, presence
  --session <name>            Session name (default: default)
  -s <name>                   Short form of --session

Examples:
  extended-playwright-cli race-locator "#variant-a" "#variant-b"
  extended-playwright-cli race-locator "button:has-text(Pay)" "button:has-text(Checkout)" --timeout 5000
  extended-playwright-cli race-locator "#login-form" "#signup-form" --visibility presence
`);
  }
}

function resolveSessionName(args: Record<string, any>): string {
  if (args.session) return args.session;
  if (args.s) return args.s;
  if (process.env.PLAYWRIGHT_CLI_SESSION) return process.env.PLAYWRIGHT_CLI_SESSION;
  return 'default';
}

async function handleOpen(clientInfo: any, args: Record<string, any>): Promise<void> {
  const sessionName = resolveSessionName(args);
  const entry = await findSession(clientInfo, sessionName);

  if (entry) {
    const session = new PlaywrightSession(clientInfo, entry.config);
    if (await session.canConnect()) {
      await session.stop(true);
    }
  }

  const sessionConfig = sessionConfigFromArgs(clientInfo, sessionName, args);
  const session = new PlaywrightSession(clientInfo, sessionConfig);

  if (await session.canConnect()) {
    await session.stop(true);
  }

  for (const opt of globalOptions) {
    delete args[opt];
  }

  await session.startDaemon();

  if (args._ && args._.length > 0) {
    const runSession = new PlaywrightSession(clientInfo, sessionConfig);
    const result = await runSession.run(args);
    console.log(result.text);
  }
}

async function handleClose(clientInfo: any, args: Record<string, any>): Promise<void> {
  const sessionName = resolveSessionName(args);
  const entry = await findSession(clientInfo, sessionName);
  if (!entry) {
    console.log(`Browser '${sessionName}' is not open.`);
    return;
  }
  const session = new PlaywrightSession(clientInfo, entry.config);
  if (!await session.canConnect()) {
    console.log(`Browser '${sessionName}' is not open.`);
    return;
  }
  await session.stop();
}

async function handleList(clientInfo: any, args: Record<string, any>): Promise<void> {
  const entries = await listSessionsForWorkspace(clientInfo);
  if (entries.length === 0) {
    console.log('  (no browsers)');
    return;
  }

  console.log('### Browsers');
  for (const entry of entries) {
    const session = new PlaywrightSession(clientInfo, entry.config);
    const canConnect = await session.canConnect();
    console.log(`- ${entry.config.name}:`);
    console.log(`  - status: ${canConnect ? 'open' : 'closed'}`);
  }
}

async function handleCloseAll(clientInfo: any): Promise<void> {
  const entries = await listSessionsForWorkspace(clientInfo);
  for (const entry of entries) {
    const session = new PlaywrightSession(clientInfo, entry.config);
    await session.stop(true);
  }
}

async function handleDefaultCommand(clientInfo: any, commandName: string, args: Record<string, any>): Promise<void> {
  const sessionName = resolveSessionName(args);
  const entry = await findSession(clientInfo, sessionName);

  if (!entry) {
    console.log(`The browser '${sessionName}' is not open, please run open first`);
    console.log('');
    console.log(`  extended-playwright-cli${sessionName !== 'default' ? ` -s=${sessionName}` : ''} open [params]`);
    process.exit(1);
  }

  for (const opt of globalOptions) {
    delete args[opt];
  }

  const session = new PlaywrightSession(clientInfo, entry.config);
  const result = await session.run(args);
  console.log(result.text);
}

export async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = minimist(argv, {
    boolean: ['all', 'help', 'version', 'headed', 'persistent', 'extension'],
    string: ['_'],
  });

  for (const [key, value] of Object.entries(args)) {
    if (key !== '_' && typeof value !== 'boolean') {
      args[key] = String(value);
    }
  }

  const clientInfo = createClientInfo();
  const commandName = args._?.[0];

  if (args.version || args.v) {
    console.log(clientInfo.version);
    process.exit(0);
  }

  if (args.help || args.h) {
    if (commandName && commandName !== 'open') {
      printCommandHelp(commandName);
    } else {
      printHelp();
    }
    process.exit(0);
  }

  if (!commandName) {
    printHelp();
    process.exit(1);
  }

  if (customCommands.has(commandName)) {
    const cmd = getCommand(commandName);
    if (cmd) {
      await cmd.execute(argv.slice(1));
      return;
    }
  }

  switch (commandName) {
    case 'open':
      await handleOpen(clientInfo, args);
      break;
    case 'close':
      await handleClose(clientInfo, args);
      break;
    case 'list':
      await handleList(clientInfo, args);
      break;
    case 'close-all':
      await handleCloseAll(clientInfo);
      break;
    case 'install': {
      const fs = require('fs');
      const path = require('path');
      const cwd = process.cwd();
      const playwrightDir = path.join(cwd, '.playwright');
      await fs.promises.mkdir(playwrightDir, { recursive: true });
      console.log(`✅ Workspace initialized at \`${cwd}.\``);
      break;
    }
    case 'show': {
      const { spawn } = require('child_process');
      const path = require('path');
      const cliDir = path.dirname(require.resolve('playwright/package.json'));
      const daemonScript = path.join(cliDir, 'lib/cli/client/devtoolsApp.js');
      const child = spawn(process.execPath, [daemonScript], {
        detached: true,
        stdio: 'ignore' as const,
      });
      child.unref();
      break;
    }
    default:
      await handleDefaultCommand(clientInfo, commandName, args);
      break;
  }
}

run().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});

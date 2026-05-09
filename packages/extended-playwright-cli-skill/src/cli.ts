import { commands, getCommand } from './commands';
import { proxyToPlaywrightCli } from './proxy';

const customCommands = new Set(commands);

function printHelp(): void {
  console.log(`pw-ext - Playwright CLI extension with race locator

Usage:
  pw-ext <command> [args]
  pw-ext <playwright-cli command> [args]  # pass-through to playwright-cli

Custom commands:
  race-locator <selectors...>   Race multiple locators, return the visible one

Options:
  --timeout <ms>                Timeout in milliseconds (default: 0, no timeout)
  --visibility <mode>           Visibility mode: default, visible, presence
  --session <name>              Playwright CLI session name (default: default)
  --help, -h                    Show this help

Examples:
  pw-ext race-locator "#variant-a" "#variant-b"
  pw-ext race-locator "button:has-text(Pay)" "button:has-text(Checkout)" --timeout 5000
  pw-ext open https://example.com   # delegates to playwright-cli
  pw-ext snapshot                    # delegates to playwright-cli
`);
}

export async function run(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
      printHelp();
      return;
    }
    printHelp();
    process.exit(1);
  }

  const commandName = argv[0];
  const remainingArgs = argv.slice(1);

  if (customCommands.has(commandName)) {
    const cmd = getCommand(commandName);
    if (cmd) {
      await cmd.execute(remainingArgs);
      return;
    }
  }

  proxyToPlaywrightCli(argv);
}

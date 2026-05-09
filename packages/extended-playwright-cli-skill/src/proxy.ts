import { spawnSync } from 'child_process';

export function findPlaywrightCliBin(): string | null {
  const result = spawnSync('which', ['playwright-cli'], { encoding: 'utf-8', shell: true });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return null;
}

export function proxyToPlaywrightCli(args: string[]): void {
  const cliBin = findPlaywrightCliBin();

  const cmd = cliBin || 'npx';
  const cmdArgs = cliBin ? args : ['playwright-cli', ...args];

  const result = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  process.exit(result.status ?? 0);
}

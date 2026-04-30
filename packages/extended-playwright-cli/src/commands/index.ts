import { CliCommand } from './types';
import { raceLocatorCommand } from './race-locator';
import { reporterHistoryCommand } from './reporter-history';
import { reporterDiffCommand } from './reporter-diff';
import { reporterTrendsCommand } from './reporter-trends';
import { reporterImportCommand } from './reporter-import';

const commandsList: CliCommand[] = [
  raceLocatorCommand,
  reporterHistoryCommand,
  reporterDiffCommand,
  reporterTrendsCommand,
  reporterImportCommand,
];

export const commandNames = commandsList.map(c => c.name);

export function getCommand(name: string): CliCommand | undefined {
  return commandsList.find(c => c.name === name);
}

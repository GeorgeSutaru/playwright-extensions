import { CliCommand } from './types';
import { raceLocatorCommand } from './race-locator';

const commandsList: CliCommand[] = [
  raceLocatorCommand,
];

export const commandNames = commandsList.map(c => c.name);

export function getCommand(name: string): CliCommand | undefined {
  return commandsList.find(c => c.name === name);
}

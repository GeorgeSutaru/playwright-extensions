import { raceLocatorCommand } from './race-locator';
import { CliCommand } from './types';

const commandsList: CliCommand[] = [
  raceLocatorCommand,
];

export const commands = commandsList.map(c => c.name);

export function getCommand(name: string): CliCommand | undefined {
  return commandsList.find(c => c.name === name);
}

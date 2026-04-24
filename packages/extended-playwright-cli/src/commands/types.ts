export interface CliCommand {
  name: string;
  description: string;
  execute(args: string[]): void | Promise<void>;
}

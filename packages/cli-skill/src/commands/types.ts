export interface CliCommand {
  name: string;
  description: string;
  execute(args: string[]): Promise<void>;
}

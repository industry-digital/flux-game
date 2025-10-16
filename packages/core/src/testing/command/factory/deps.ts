import { createActorCommand } from '~/lib/intent';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';

export type CommandFactoryDependencies = {
  createActorCommand: typeof createActorCommand;
  uniqid: () => string;
  timestamp: () => number;
};

export const DEFAULT_COMMAND_FACTORY_DEPS: Readonly<CommandFactoryDependencies> = Object.freeze({
  createActorCommand,
  uniqid: () => 'test-command-id',
  timestamp: () => DEFAULT_TIMESTAMP,
});

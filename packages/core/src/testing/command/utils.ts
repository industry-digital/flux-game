import { CommandInput, CommandType } from '~/types/intent';
import { EntityType } from '~/types/entity/entity';
import { Command } from '~/types/intent';
import { createEntityUrn } from '~/lib/taxonomy';

/**
 * Hook-style utility for creating mock commands with sensible defaults
 * Pure function that returns a new mock command each time
 */
export const createCommand = <T extends CommandType>(
  type: T,
  overrides?: Partial<Command>
): Command => {
  const defaults: CommandInput = {
    id: 'test-command-id',
    ts: 1234567890,
    type,
    actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
    args: {}
  };

  return {
    __type: 'command',
    ...defaults,
    ...overrides,
    type,
  } as Command;
};

/**
 * Hook-style utility for creating batch of commands
 * Pure function that returns array of mock commands
 */
export const createCommandBatch = (
  count: number,
  commandFactory: () => Command
): Command[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...commandFactory(),
    id: `test-command-${index}`
  }));
};

/**
 * Hook-style utility for testing command handlers
 * Pure function that provides common test patterns
 */
export const createHandlerTest = <T extends Command>(
  handler: { handles: (input: any) => boolean; reduce?: (context: any, input: T) => any },
  command: T,
  context?: any
) => {
  return {
    testHandles: () => {
      return {
        shouldHandleValidCommand: () => handler.handles(command),
        shouldRejectInvalidCommand: (invalidCommand: any) => handler.handles(invalidCommand),
        shouldRejectNonCommand: (nonCommand: any) => handler.handles(nonCommand)
      };
    },
    testReduce: (mockContext: any) => {
      return handler.reduce ? handler.reduce(mockContext, command) : mockContext;
    }
  };
};

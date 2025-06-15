export * from '@flux';
export * from '~/lib/taxonomy';
export * from '~/worldkit/entity/util';

export { CreateActorCommand } from '~/command/CREATE_ACTOR/handler';
export { CreatePlaceCommand } from '~/command/CREATE_PLACE/handler';

export {
  parseEntityUrn,
  parseEntityUrnOrFail,
  parseEntityUrnAs,
  getEntityUrn,
  getEntityUrnOrFail,
  isValidEntityUrn,
} from '~/lib/urn';

// Command type guards and utilities
export {
  isCommand,
  isCommandInput,
  isCommandOfType,
  isValidatedCommandOfType,
  createCommandTypeGuard,
  ignoreFailedCommands,
} from '~/lib/intent';

import { Command, PureHandlerImplementation, TransformerContext } from '@flux';
import { MOVE } from '~/command/MOVE/handler';
import { safeTopologicalSort } from '~/lib/dag';

/**
 * The Flux World Server literally spreads this array into the Transformation stage.
 * We perform a topological sort right here to ensure handler dependencies aren't problematic; if there is a cycle,
 * this line will throw an error. Please preserve this behavior so that we catch dependency issues early.
 */
// @ts-expect-error: this type problem defeats me
export const PURE_GAME_LOGIC_HANDLERS: PureHandlerImplementation<TransformerContext, Command>[]
= safeTopologicalSort(
  [
    MOVE,
    // Add more handler implementations here...
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

export * from '@flux';
export * from '~/lib/taxonomy';
export * from '~/worldkit/entity/util';

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
  isIntent,
  isCommand,
  isCommandInput,
  isCommandOfType,
  isValidatedCommandOfType,
  createCommandTypeGuard,
  ignoreFailedCommands,
} from '~/lib/intent';

import { Command, PureHandlerImplementation, TransformerContext } from '@flux';
import { safeTopologicalSort } from '~/lib/dag';


export { CreateActorCommand } from '~/command/CREATE_ACTOR/handler';
export { CreatePlaceCommand } from '~/command/CREATE_PLACE/handler';
export { MaterializeActorCommand } from '~/command/MATERIALIZE_ACTOR/handler';
export { DematerializeActorCommand } from '~/command/DEMATERIALIZE_ACTOR/handler';

import { MOVE } from '~/command/MOVE/handler';
import { CREATE_ACTOR } from '~/command/CREATE_ACTOR/handler';
import { CREATE_PLACE } from '~/command/CREATE_PLACE/handler';
import { MATERIALIZE_ACTOR } from '~/command/MATERIALIZE_ACTOR/handler';
import { DEMATERIALIZE_ACTOR } from '~/command/DEMATERIALIZE_ACTOR/handler';

/**
 * The Flux World Server literally spreads this array into the Transformation stage.
 * We perform a topological sort right here to ensure handler dependencies aren't problematic; if there is a cycle,
 * this line will throw an error. Please preserve this behavior so that we catch dependency issues immediately.
 */
// @ts-expect-error: this type problem defeats me
export const PURE_GAME_LOGIC_HANDLERS: PureHandlerImplementation<TransformerContext, Command>[]
= safeTopologicalSort(
  [
    MOVE,
    CREATE_ACTOR,
    CREATE_PLACE,
    MATERIALIZE_ACTOR,
    DEMATERIALIZE_ACTOR,
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

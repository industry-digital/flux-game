export * from '~/types';
export * from '~/lib/taxonomy';
export * from '~/worldkit/entity';
export * from '~/worldkit/view';
export * from '~/worldkit/event';
export * from '~/template';

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
} from '~/lib/intent';


// Export command types
export {
  CreateActorCommand,
  CreatePlaceCommand,
  MaterializeActorCommand,
  DematerializeActorCommand,
  MoveCommand,
  MoveCommandArgs,
} from '~/command';

export {
  validateActor,
  validateActorURN,
  validateActorStats,
  validateSkills,
  validateInjuryDescriptor,
  validateEquipment,
  validateSkillState,
  validateInventory,
  validateActorStat,
} from '~/validation/actor';

export {
  validatePlace,
  validatePlaceURN,
  validateExit,
} from '~/validation/place';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { PureHandlerImplementation, TransformerContext } from '~/types/handler';
import { safeTopologicalSort } from '~/lib/dag';
import { MOVE } from '~/command/MOVE/handler';
import { CREATE_ACTOR } from '~/command/CREATE_ACTOR/handler';
import { CREATE_PLACE } from '~/command/CREATE_PLACE/handler';
import { MATERIALIZE_ACTOR } from '~/command/MATERIALIZE_ACTOR/handler';
import { DEMATERIALIZE_ACTOR } from '~/command/DEMATERIALIZE_ACTOR/handler';
import { MUTATE_WEATHER } from '~/command/MUTATE_WEATHER/handler';

/**
 * The Flux World Server literally spreads this array into the Transformation stage.
 * We perform a topological sort right here to ensure handler dependencies aren't problematic; if there is a cycle,
 * this line will throw an error. Please preserve this behavior so that we catch dependency issues immediately.
 */
export const PURE_GAME_LOGIC_HANDLERS: PureHandlerImplementation<TransformerContext, any>[]
= safeTopologicalSort(
  [
    MOVE,
    CREATE_ACTOR,
    CREATE_PLACE,
    MATERIALIZE_ACTOR,
    DEMATERIALIZE_ACTOR,
    MUTATE_WEATHER,
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

import { createActorCommandReducer } from '~/command/CREATE_ACTOR/handler';
import { createPlaceCommandReducer } from '~/command/CREATE_PLACE/handler';
import { materializeActorReducer } from '~/command/MATERIALIZE_ACTOR/handler';
import { dematerializeActorReducer } from '~/command/DEMATERIALIZE_ACTOR/handler';
import { mutateWeatherReducer } from '~/command/MUTATE_WEATHER/handler';
import { mutateResourcesReducer } from '~/command/MUTATE_RESOURCES/handler';
import { lookReducer } from '~/command/LOOK/handler';
import { PureReducer, TransformerContext } from '~/types/handler';
import { CommandType, Command, CommandTypeGuard } from '~/types/intent';
import { actorMovementReducer } from '~/command/MOVE/handler';

/**
 * Helper function to create a command type guard for any command type (system or actor)
 */
export function createCommandGuard<T extends CommandType, A extends Record<string, any> = Record<string, any>>(
  type: T
): CommandTypeGuard<T, A> {
  return (input: any): input is Command<T, A> => {
    return input?.__type === 'command' && input.type === type;
  };
}

// Registry mapping CommandType to transformer (reducer) functions
export const COMMAND_TRANSFORMERS: Partial<Record<CommandType, PureReducer<TransformerContext, any>>> = {
  [CommandType.CREATE_ACTOR]: createActorCommandReducer,
  [CommandType.CREATE_PLACE]: createPlaceCommandReducer,
  [CommandType.MATERIALIZE_ACTOR]: materializeActorReducer,
  [CommandType.DEMATERIALIZE_ACTOR]: dematerializeActorReducer,
  [CommandType.MUTATE_WEATHER]: mutateWeatherReducer,
  [CommandType.MUTATE_RESOURCES]: mutateResourcesReducer,
  [CommandType.LOOK]: lookReducer,
  [CommandType.MOVE]: actorMovementReducer,
};

/**
 * Given a command type, return the transformer (reducer) function for that command type.
 */
export const getTransformerForCommandType = (commandType: CommandType): PureReducer<TransformerContext, unknown> => {
  const reducer = COMMAND_TRANSFORMERS[commandType]!;
  if (!reducer) {
    throw new Error(`No transformer found for command type ${commandType}`);
  }
  return reducer;
};

// Re-export command handlers
export { CREATE_ACTOR, CreateActorCommand as CreateActorCommand } from './CREATE_ACTOR/handler';
export { CREATE_PLACE, CreatePlaceCommand as CreatePlaceCommand } from './CREATE_PLACE/handler';
export { MATERIALIZE_ACTOR, MaterializeActorCommand } from './MATERIALIZE_ACTOR/handler';
export { DEMATERIALIZE_ACTOR, DematerializeActorCommand } from './DEMATERIALIZE_ACTOR/handler';
export { MUTATE_WEATHER, MutateWeatherCommand } from './MUTATE_WEATHER/handler';
export { MUTATE_RESOURCES, MutateResourcesCommand } from './MUTATE_RESOURCES/handler';
export { LOOK, LookCommand, LookCommandArgs } from './LOOK/handler';
export { MOVE, MoveCommand, MoveCommandArgs } from './MOVE/handler';

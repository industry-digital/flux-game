import { createActorCommandReducer } from '~/command/CREATE_ACTOR';
import { createPlaceCommandReducer } from '~/command/CREATE_PLACE';
import { materializeActorReducer } from '~/command/MATERIALIZE_ACTOR';
import { dematerializeActorReducer } from '~/command/DEMATERIALIZE_ACTOR';
import { mutateWeatherReducer } from '~/command/MUTATE_WEATHER';
import { mutateResourcesReducer } from '~/command/MUTATE_RESOURCES';
import { lookReducer } from '~/command/LOOK';
import { actorMovementReducer } from '~/command/MOVE';
import { strikeReducer } from '~/command/STRIKE';
import { cleaveReducer } from '~/command/CLEAVE';
import { doneReducer } from '~/command/DONE';
import { attackReducer } from '~/command/ATTACK';
import { advanceReducer } from '~/command/ADVANCE';
import { defendReducer } from '~/command/DEFEND';
import { retreatReducer } from '~/command/RETREAT';
import { targetReducer } from '~/command/TARGET';
import { useWorkbenchReducer } from '~/command/USE_WORKBENCH';
import { equipReducer } from '~/command/EQUIP';
import { PureReducer, TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';

// Registry mapping CommandType to transformer (reducer) functions
export const COMMAND_TRANSFORMERS: Partial<Record<CommandType, PureReducer<TransformerContext, any>>> = {
  [CommandType.ATTACK]: attackReducer,
  [CommandType.CREATE_ACTOR]: createActorCommandReducer,
  [CommandType.CREATE_PLACE]: createPlaceCommandReducer,
  [CommandType.MATERIALIZE_ACTOR]: materializeActorReducer,
  [CommandType.DEMATERIALIZE_ACTOR]: dematerializeActorReducer,
  [CommandType.MUTATE_WEATHER]: mutateWeatherReducer,
  [CommandType.MUTATE_RESOURCES]: mutateResourcesReducer,
  [CommandType.LOOK]: lookReducer,
  [CommandType.MOVE]: actorMovementReducer,
  [CommandType.STRIKE]: strikeReducer,
  [CommandType.CLEAVE]: cleaveReducer,
  [CommandType.DONE]: doneReducer,
  [CommandType.ADVANCE]: advanceReducer,
  [CommandType.DEFEND]: defendReducer,
  [CommandType.RETREAT]: retreatReducer,
  [CommandType.TARGET]: targetReducer,
  [CommandType.USE_WORKBENCH]: useWorkbenchReducer,
  [CommandType.EQUIP]: equipReducer,
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
export { CREATE_ACTOR, CreateActorCommand as CreateActorCommand } from './CREATE_ACTOR';
export { CREATE_PLACE, CreatePlaceCommand as CreatePlaceCommand } from './CREATE_PLACE';
export { MATERIALIZE_ACTOR, MaterializeActorCommand } from './MATERIALIZE_ACTOR';
export { DEMATERIALIZE_ACTOR, DematerializeActorCommand } from './DEMATERIALIZE_ACTOR';
export { MUTATE_WEATHER, MutateWeatherCommand } from './MUTATE_WEATHER';
export { MUTATE_RESOURCES, MutateResourcesCommand } from './MUTATE_RESOURCES';
export { LOOK, LookCommand, LookCommandArgs } from './LOOK';
export { MOVE, MoveCommand, MoveCommandArgs } from './MOVE';
export { STRIKE, StrikeCommand, StrikeCommandArgs } from './STRIKE';
export { CLEAVE, CleaveCommand, CleaveCommandArgs } from './CLEAVE';
export { DONE, DoneCommand, DoneCommandArgs } from './DONE';
export { ATTACK, AttackCommand, AttackCommandArgs } from './ATTACK';
export { ADVANCE, AdvanceCommand, AdvanceCommandArgs } from './ADVANCE';
export { DEFEND, DefendCommand, DefendCommandArgs } from './DEFEND';
export { RETREAT, RetreatCommand, RetreatCommandArgs } from './RETREAT';
export { TARGET, TargetCommand, TargetCommandArgs } from './TARGET';
export { USE_WORKBENCH, UseWorkbenchCommand, UseWorkbenchCommandArgs } from './USE_WORKBENCH';
export { EQUIP, EquipCommand, EquipCommandArgs } from './EQUIP';

import { PureReducer, TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';

// Re-export utilities
export { withCommandType } from './withCommandType';
export { withCombatCost } from './withCombatCost';

// Registry mapping CommandType to transformer (reducer) functions
export const COMMAND_TRANSFORMERS: Partial<Record<CommandType, PureReducer<TransformerContext, any>>> =
  PURE_GAME_LOGIC_HANDLERS.reduce((acc, HandlerClass) => {
    const handler = new HandlerClass();
    acc[handler.type] = handler.reduce;
    return acc;
  }, {} as Partial<Record<CommandType, PureReducer<TransformerContext, any>>>);

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
export { WORKBENCH_USE as USE_WORKBENCH, UseWorkbenchCommand, UseWorkbenchCommandArgs } from './WORKBENCH_USE';
export { EQUIP, EquipCommand, EquipCommandArgs } from './EQUIP';
export { PARTY_INVITE, PartyInviteCommand, PartyInviteCommandArgs } from './PARTY_INVITE';
export { PARTY_INVITE_ACCEPT, AcceptPartyInvitationCommand } from './PARTY_INVITE_ACCEPT';
export { PARTY_INVITE_REJECT, RejectPartyInvitationCommand } from './PARTY_INVITE_REJECT';
export { PARTY_KICK, PartyKickCommand } from './PARTY_KICK';
export { PARTY_LEAVE, PartyLeaveCommand } from './PARTY_LEAVE';
export { PARTY_DISBAND, PartyDisbandCommand } from './PARTY_DISBAND';
export { PARTY_STATUS as PARTY_INSPECT, PartyStatusCommand as PartyInspectCommand } from './PARTY_STATUS';

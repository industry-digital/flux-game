import { createActor } from '~/worldkit/entity/actor';
import { isCommandOfType } from '~/lib/intent';
import {
  ActorInput,
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  EventType,
} from '@flux';
import { Command, SystemCommand } from '~/types/intent';

export type CreateActorCommand = SystemCommand<CommandType.CREATE_ACTOR, ActorInput>;

export const createActorCommandReducer: PureReducer<TransformerContext, CreateActorCommand> = (
  context,
  command,
) => {
  const { declareEvent, declareError } = context;
  const { actors } = context.world;
  const actor = createActor(command.args);

  if (actors[actor.id]) {
    declareError(`Actor ${actor.id} already exists in world projection`);
    return context;
  }

  // Add the new actor to the world projection
  actors[actor.id] = actor;

  declareEvent({
    type: EventType.ACTOR_WAS_CREATED,
    actor: actor.id,
    location: actor.location,
    payload: {},
    trace: command.id,
  });

  return context;
};

export class CREATE_ACTOR implements PureHandlerInterface<TransformerContext, CreateActorCommand> {
  reduce = createActorCommandReducer;
  dependencies = [];
  handles = (command: Command): command is CreateActorCommand => {
    return isCommandOfType<CommandType.CREATE_ACTOR, ActorInput>(command, CommandType.CREATE_ACTOR);
  };
};

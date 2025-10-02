import { createActor } from '~/worldkit/entity/actor';
import { isCommandOfType } from '~/lib/intent';
import { ActorInput } from '~/types/entity/actor';
import { CommandType, SystemCommand } from '~/types/intent';
import {
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
} from '~/types/handler';
import { EventType } from '~/types/event';
import { WellKnownPlace } from '~/types/world/space';

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

  // All actors materialize at the world origin by default
  actor.location ??= WellKnownPlace.ORIGIN;

  // Add the actor to the world
  actors[actor.id] = actor;

  declareEvent({
    trace: command.id,
    type: EventType.ACTOR_WAS_CREATED,
    actor: actor.id,
    location: actor.location,
    payload: {},
  });

  return context;
};

export class CREATE_ACTOR implements PureHandlerInterface<TransformerContext, CreateActorCommand> {
  reduce = createActorCommandReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is CreateActorCommand => {
    return isCommandOfType<CommandType.CREATE_ACTOR, ActorInput>(command, CommandType.CREATE_ACTOR);
  };
};

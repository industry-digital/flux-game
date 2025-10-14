import { PureReducer, TransformerContext } from '~/types/handler';
import { CreateActorCommand } from './types';
import { createActor } from '~/worldkit/entity/actor';
import { EventType } from '~/types/event';
import { WellKnownPlace } from '~/types/world/space';

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

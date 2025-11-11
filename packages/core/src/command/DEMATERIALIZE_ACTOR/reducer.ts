import { PureReducer, TransformerContext } from '~/types/handler';
import { DematerializeActorCommand } from './types';
import { EventType } from '~/types/event';
import { CommandType } from '~/types/intent';
import { withCommandType } from '~/command/withCommandType';
import { withBasicWorldStateValidation } from '~/command/validation';


export const EMPTY_PAYLOAD: Readonly<Record<string, never>> = Object.freeze({});

const reducerCore: PureReducer<TransformerContext, DematerializeActorCommand> = (context, command) => {
  const actor = context.world.actors[command.actor];
  const place = context.world.places[actor.location];

  // Remove the actor from the place
  delete place.entities[actor.id];

  context.declareEvent({
    type: EventType.ACTOR_DID_DEMATERIALIZE,
    actor: actor.id,
    location: place.id,
    payload: EMPTY_PAYLOAD,
    trace: command.id,
  });

  return context;
};

export const dematerializeActorReducer: PureReducer<TransformerContext, DematerializeActorCommand> =
  withCommandType(CommandType.DEMATERIALIZE_ACTOR,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );

import { PureReducer, TransformerContext } from '~/types/handler';
import { MaterializeActorCommand } from './types';
import { SpecialVisibility } from '~/types/world/visibility';
import { EventType } from '~/types/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { PlaceEntityDescriptor } from '~/types/entity/place';

const EMPTY_PAYLOAD: Readonly<Record<string, never>> = Object.freeze({});
const DEFAULT_VISIBILITY: Readonly<PlaceEntityDescriptor> = Object.freeze({
  vis: SpecialVisibility.VISIBLE_TO_EVERYONE,
});

const reducerCore: PureReducer<TransformerContext, MaterializeActorCommand> = (context, command) => {
  const { world, declareEvent } = context;
  const actor = world.actors[command.args.actorId];
  const place = world.places[actor.location];

  place.entities[actor.id] = DEFAULT_VISIBILITY;

  declareEvent({
    type: EventType.ACTOR_DID_MATERIALIZE,
    actor: actor.id,
    location: place.id,
    trace: command.id,
    payload: EMPTY_PAYLOAD,
  });

  return context;
};

export const materializeActorReducer: PureReducer<TransformerContext, MaterializeActorCommand> =
  withCommandType(CommandType.MATERIALIZE_ACTOR,
    reducerCore,
  );

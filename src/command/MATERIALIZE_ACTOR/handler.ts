import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  Command,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
  SpecialVisibility,
} from '@flux';

export type MaterializeActorCommand = Command<CommandType.MATERIALIZE_ACTOR>;

export const materializeActorCommandReducer: PureReducer<TransformerContext, MaterializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { self, actors, places } = context.world;
  const actor = actors[self];

  if (!actor) {
    declareError('Actor not found in world projection');
    return context;
  }

  const place = places[actor.location.id];

  place.entities[actor.id] = { entity: actor, visibility: SpecialVisibility.VISIBLE_TO_EVERYONE };

  declareEvent({
    type: EventType.ACTOR_DID_MATERIALIZE,
    payload: {
      actorId: actor.id,
      placeId: place.id,
    },
  });

  return context;
};

export class MATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, MaterializeActorCommand> {
  reduce = materializeActorCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is MaterializeActorCommand => {
    return isCommandOfType<CommandType.MATERIALIZE_ACTOR>(input, CommandType.MATERIALIZE_ACTOR);
  };
};

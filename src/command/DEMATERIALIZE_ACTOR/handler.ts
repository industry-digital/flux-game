import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  Command,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
} from '@flux';

export type DematerializeActorCommand = Command<CommandType.DEMATERIALIZE_ACTOR>;

export const dematerializeActorCommandReducer: PureReducer<TransformerContext, DematerializeActorCommand> = (
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
  delete place.entities[actor.id];

  declareEvent({
    type: EventType.ACTOR_DID_DEMATERIALIZE,
    payload: {
      actorId: actor.id,
      placeId: place.id,
    },
  });

  return context;
};

export class DEMATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, DematerializeActorCommand> {
  reduce = dematerializeActorCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is DematerializeActorCommand => {
    return isCommandOfType<CommandType.MATERIALIZE_ACTOR>(input, CommandType.MATERIALIZE_ACTOR);
  };
};

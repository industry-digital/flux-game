import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
  SpecialVisibility,
  ActorCommand,
} from '@flux';

export type MaterializeActorCommand = ActorCommand<CommandType.MATERIALIZE_ACTOR>;

export const materializeActorCommandReducer: PureReducer<TransformerContext, MaterializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { actors, places } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Command `actor` not found in world projection');
    return context;
  }

  const place = places[actor.location.id];

  // Materialize the actor in its location
  place.entities[actor.id] = {
    entity: actor,
    visibility: SpecialVisibility.VISIBLE_TO_EVERYONE,
  };

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

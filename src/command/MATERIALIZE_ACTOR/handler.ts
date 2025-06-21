import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
  SpecialVisibility,
  ActorURN,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type MaterializeActorCommand = SystemCommand<CommandType.MATERIALIZE_ACTOR, {
  actorId: ActorURN;
}>;

export const materializeActorCommandReducer: PureReducer<TransformerContext, MaterializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { actors, places } = context.world;
  const actor = actors[command.args.actorId];

  if (!actor) {
    declareError('Actor not found in `actors` projection. Did you remember to load it?');
    return context;
  }

  const place = places[actor.location.id];

  // Materialize the actor in its current location
  place.entities[actor.id] =  {
    // TODO: Need to handle visibility properly.
    // What if the actor materialized while hidden, for example?
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

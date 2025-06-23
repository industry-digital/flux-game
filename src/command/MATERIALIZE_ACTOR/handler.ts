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
  ActorDidMaterializeInput,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type MaterializeActorCommand = SystemCommand<CommandType.MATERIALIZE_ACTOR, {
  actorId: ActorURN;
}>;

export const materializeActorCommandReducer: PureReducer<TransformerContext, MaterializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent, debug } = context;
  const { actors, places } = context.world;

  debug(`MATERIALIZE_ACTOR transformation: Processing command ${command.id}`);

  const actor = actors[command.args.actorId];
  if (!actor) {
    declareError('Actor not found in `actors` projection. Did you remember to load it?');
    return context;
  }

  const place = places[actor.location.id];
  if (!place) {
    declareError('Place not found in `places` projection. Did you remember to load it?');
    return context;
  }

  // Materialize the actor in its current location using Immer-compatible utility
  place.entities[actor.id] = { visibility: SpecialVisibility.VISIBLE_TO_EVERYONE };

  const eventInput: ActorDidMaterializeInput = {
    type: EventType.ACTOR_DID_MATERIALIZE,
    actor: actor.id,
    location: place.id,
    payload: {},
    trace: command.id,
  };

  debug(`MATERIALIZE_ACTOR transformation: Declaring event with trace=${command.id}:`, JSON.stringify(eventInput));
  declareEvent(eventInput);

  return context;
};

export class MATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, MaterializeActorCommand> {
  reduce = materializeActorCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is MaterializeActorCommand => {
    return isCommandOfType<CommandType.MATERIALIZE_ACTOR>(input, CommandType.MATERIALIZE_ACTOR);
  };
};

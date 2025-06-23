import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
  ActorURN,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type DematerializeActorCommand = SystemCommand<CommandType.DEMATERIALIZE_ACTOR, {
  actorId: ActorURN;
}>;

export const dematerializeActorCommandReducer: PureReducer<TransformerContext, DematerializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { actors, places } = context.world;
  const actor = actors[command.args.actorId];

  if (!actor) {
    declareError('Actor not found in world projection');
    return context;
  }

  const place = places[actor.location.id];
  if (!place) {
    declareError('Place not found in `places` projection. Did you remember to load it?');
    return context;
  }

  // Remove the actor from the place
  delete place.entities[actor.id];

  declareEvent({
    type: EventType.ACTOR_DID_DEMATERIALIZE,
    actor: actor.id,
    location: place.id,
    payload: {},
  });

  return context;
};

export class DEMATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, DematerializeActorCommand> {
  reduce = dematerializeActorCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is DematerializeActorCommand => {
    return isCommandOfType<CommandType.DEMATERIALIZE_ACTOR>(input, CommandType.DEMATERIALIZE_ACTOR);
  };
};

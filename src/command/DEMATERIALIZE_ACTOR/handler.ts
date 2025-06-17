import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  EventType,
  ActorCommand,
} from '@flux';

export type DematerializeActorCommand = ActorCommand<CommandType.DEMATERIALIZE_ACTOR>;

export const dematerializeActorCommandReducer: PureReducer<TransformerContext, DematerializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { actors, places } = context.world;
  const actor = actors[command.actor];

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
    return isCommandOfType<CommandType.DEMATERIALIZE_ACTOR>(input, CommandType.DEMATERIALIZE_ACTOR);
  };
};

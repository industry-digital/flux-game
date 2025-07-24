import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  SystemCommand,
} from '~/types/intent';
import {
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
} from '~/types/handler';
import { EventType } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';

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

  const place = places[actor.location];
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
    trace: command.id,
  });

  return context;
};

export class DEMATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, DematerializeActorCommand> {
  reduce = dematerializeActorCommandReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is DematerializeActorCommand => {
    return isCommandOfType<CommandType.DEMATERIALIZE_ACTOR, { actorId: ActorURN } >(
      command,
      CommandType.DEMATERIALIZE_ACTOR,
    );
  };
};

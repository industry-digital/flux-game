import { isCommandOfType } from '~/lib/intent';
import { SystemCommand } from '~/types/intent';
import {
  CommandType
} from '~/types/intent';
import {
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
} from '~/types/handler';
import { SpecialVisibility } from '~/types/world/visibility';
import { ActorURN } from '~/types/taxonomy';
import { lookAtPlace } from '~/worldkit/narrative/place';

export type MaterializeActorCommand = SystemCommand<CommandType.MATERIALIZE_ACTOR, {
  actorId: ActorURN;
}>;

export const materializeActorReducer: PureReducer<TransformerContext, MaterializeActorCommand> = (
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

  const place = places[actor.location];
  if (!place) {
    declareError('Place not found in `places` projection. Did you remember to load it?');
    return context;
  }

  // This materializes the actor in its current location
  // FIXME: How do we handle the case where the actor is in stealth? What should be the actor's visibility then?
  place.entities[actor.id] = { vis: SpecialVisibility.VISIBLE_TO_EVERYONE };

  // After materialization, generate a look event using the reusable function
  return lookAtPlace(context, actor.id, place.id, command.id);
};

export class MATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, MaterializeActorCommand> {
  reduce = materializeActorReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is MaterializeActorCommand => {
    return isCommandOfType<CommandType.MATERIALIZE_ACTOR, { actorId: ActorURN }>(
      command,
      CommandType.MATERIALIZE_ACTOR,
    );
  };
}

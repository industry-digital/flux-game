import { isCommandOfType } from '~/lib/intent';
import { ActorInput } from '~/types/entity/actor';
import { ActorCommand, CommandType, SystemCommand } from '~/types/intent';
import { PureReducer, TransformerContext, PureHandlerInterface } from '~/types/handler';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';
import { lookAtActorReducer, lookAtPlaceReducer, lookAtItemReducer } from './reducers';

export type LookCommandArgs =
  | { type: EntityType.ACTOR, id: ActorURN }
  | { type: EntityType.PLACE, id: PlaceURN }
  | { type: EntityType.ITEM, id: ItemURN, self: boolean };

export type LookCommand = ActorCommand<CommandType.LOOK, LookCommandArgs>;

export const lookReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  const { declareError } = context;
  const { places, actors } = context.world;
  const place = places[command.args.id as PlaceURN];

  if (!place) {
    declareError('Could not find place in world projection', command.id);
    return context;
  }

  const actor = actors[command.actor!];

  if (!actor) {
    declareError('Could not find actor in world project', command.id);
    return context;
  }

  // Dispatch to appropriate focused reducer
  switch (command.args.type) {
    case EntityType.ACTOR:
      return lookAtActorReducer(context, command);

    case EntityType.PLACE:
      return lookAtPlaceReducer(context, command);

    case EntityType.ITEM:
      return lookAtItemReducer(context, command);

    default: // This is never supposed to happen
      declareError('Invalid look command arguments', command.id);
      return context;
  }
};

export class LOOK implements PureHandlerInterface<TransformerContext, LookCommand> {
  reduce = lookReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is LookCommand => {
    return isCommandOfType<CommandType.LOOK, ActorInput>(command, CommandType.LOOK);
  };
}

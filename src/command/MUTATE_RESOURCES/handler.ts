import { isCommandOfType } from '~/lib/intent';
import { ResourceNodes } from '~/types/entity/resource';
import {
  Command,
  CommandType,
  SystemCommand
} from '~/types/intent';
import {
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
} from '~/types/handler';
import { PlaceURN } from '~/types/taxonomy';
import { EventType, ResourcesDidChangeInput } from '~/types/event';

export type MutateResourcesArgs = {
  placeId: PlaceURN;
  resources: ResourceNodes;
};

/**
 * Change the `weather` in specific Place
 */
export type MutateResourcesCommand = SystemCommand<CommandType.MUTATE_RESOURCES, MutateResourcesArgs>;

export const mutateResourcesReducer: PureReducer<TransformerContext, MutateResourcesCommand> = (context, command) => {
  const { declareEvent, declareError } = context;
  const { places } = context.world;
  const { placeId, resources } = command.args;

  const place = places[placeId];

  if (!place) {
    declareError(`Place ${placeId} not found`);
    return context;
  }

  const previous = place.resources;

  place.resources = resources;

  const event: ResourcesDidChangeInput = {
    type: EventType.RESOURCES_DID_CHANGE,
    trace: command.id,
    location: placeId,
    payload: {
      from:  previous,
      to: resources,
    },
  };

  declareEvent(event);

  return context;
};

export class MUTATE_RESOURCES implements PureHandlerInterface<TransformerContext, MutateResourcesCommand> {
  reduce = mutateResourcesReducer;
  dependencies = [];
  handles =   (command: Command): command is MutateResourcesCommand => {
    return isCommandOfType<CommandType.MUTATE_RESOURCES, MutateResourcesArgs>(command, CommandType.MUTATE_RESOURCES);
  };
}

import { SystemCommand, CommandType } from '~/types/intent';
import { ResourceNodes } from '~/types/entity/resource';
import { PlaceURN } from '~/types/taxonomy';

export type MutateResourcesArgs = {
  placeId: PlaceURN;
  resources: ResourceNodes;
};

export type MutateResourcesCommand = SystemCommand<CommandType.MUTATE_RESOURCES, MutateResourcesArgs>;

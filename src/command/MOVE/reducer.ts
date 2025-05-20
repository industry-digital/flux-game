import {
  Command,
  ContextualWorldState,
  Place,
  PureReducer,
  PureReducerContext,
  PlaceEntities,
  Entity,
  EntityType,
} from '~/types/domain';
import { CommandType } from '~/types/intent';
import { useActorMovement } from '~/lib/movement/actor';

export interface ExpectedWorldState extends ContextualWorldState {
  actor: Entity<EntityType>;
  origin: Place;
  originEntities: PlaceEntities;
  destination: Place;
  destinationEntities: PlaceEntities;
}

export const MoveCommandReducer: PureReducer<PureReducerContext<ExpectedWorldState>> = (
  context,
  command: Command<CommandType.MOVE>,
) => {
  const { world } = context;
  const { actor, origin, originEntities, destination, destinationEntities } = world;
  const { moveTo } = useActorMovement(context, { actor, origin, originEntities });

  moveTo(destination, destinationEntities);

  return context;
};

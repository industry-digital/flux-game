import {
  Command,
  CommandType,
  Entity,
  PureReducer,
  PureReducerContext,
  Place,
  PlaceEntities,
} from '~/types/domain';

export type ExpectedWorldState = {
  actor: Entity<any>;
  origin: Place;
  destination: Place;
  originEntities: PlaceEntities
  destinationEntities: PlaceEntities;
};

type ExpectedContext = PureReducerContext<ExpectedWorldState> & {
  actor: Entity<any>;
  origin: Place;
  destination: Place;
  originEntities: PlaceEntities;
  destinationEntities: PlaceEntities;
};

export const MoveReducer: PureReducer<ExpectedContext> = (context: ExpectedContext, command: Command<CommandType.MOVE>) => {
  return context;
};

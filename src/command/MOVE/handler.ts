import { usePlaceEntities } from '~/lib/place';
import { createSymbolicLink } from '~/worldkit/entity/util';
import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  EventType,
  EntityType,
  SymbolicLink,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  ActorCommand,
  Place,
  PlaceURN,
} from '@flux';

export type MoveCommandArgs = {
  dest: PlaceURN;
};

export type MoveCommand = ActorCommand<CommandType.MOVE, MoveCommandArgs>;

/**
 * Reducer for MOVE commands
 * Handles actor movement between places using direct world state access
 */
export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> = (context, command) => {
  const { world, declareEvent, declareError } = context;
  const { dest } = command.args;
  const { actors, places } = world;

  // Ensure actor exists
  const actor = actors[command.actor];
  if (!actor) {
    declareError('Actor not found in `actors` projection');
    return context;
  }

  // Ensure actor has a location
  if (!actor.location) {
    declareError('Actor does not have a `location`');
    return context;
  }

  // Ensure movement origin is a valid place
  const origin: Place = places[actor.location.id];
  if (!origin) {
    declareError('Actor `location` not found in `places` projection');
    return context;
  }

  // Ensure an exit connects origin to destination
  const exit = Object.values(origin.exits).find(exit => exit.to === dest);
  if (!exit) {
    declareError('There is no exit that connects the origin and destination.');
    return context;
  }

  // Ensure destination is a valid place
  const destination = places[dest];
  if (!destination) {
    declareError('Movement destination not found in `places` projection');
    return context;
  }

  const { moveEntity } = usePlaceEntities(context, origin);
  const didMove = moveEntity(actor, destination);

  if (!didMove) {
    declareError('Failed to move actor between places');
    return context;
  }

  // Update actor's location
  actor.location = createSymbolicLink(EntityType.PLACE, Array.from(destination.path)) as SymbolicLink<EntityType.PLACE>;

  declareEvent({
    type: EventType.ACTOR_DID_MOVE,
    payload: {
      actorId: actor.id,
      originId: origin.id,
      destinationId: destination.id,
    }
  });

  return context;
};

/**
 * Handler for MOVE commands
 * Processes an actor's movement in the world
 */
export class MOVE implements PureHandlerInterface<TransformerContext, MoveCommand> {
  reduce = actorMovementReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is MoveCommand => {
    return isCommandOfType(input, CommandType.MOVE);
  };
}

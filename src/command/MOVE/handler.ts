import { usePlaceEntities } from '~/lib/place';
import { createSymbolicLink } from '~/worldkit/entity/util';
import {
  CommandType,
  Command,
  TransformerInterface,
  Direction,
  Transformer,
  EventType,
  EntityType,
  SymbolicLink,
} from '@flux';
import { isCommandOfType } from '~/lib/intent';

export type MoveCommandArgs = {
  direction: Direction;
};

export type MoveCommand = Command<CommandType.MOVE, MoveCommandArgs>;

/**
 * Reducer for MOVE commands
 * Handles actor movement between places using direct world state access
 */
export const MoveCommandReducer: Transformer<CommandType.MOVE, MoveCommandArgs> = (context, command) => {
  const { world, declareEvent, declareError } = context;
  const { direction } = command.args;
  const { self, actors, places } = world;

  const defaultErrorMessage = "You can't go that way.";

  // Get the actor
  const actor = actors[self];
  if (!actor) {
    declareError('Actor not found in `actors` projection');
    return context;
  }

  if (!actor.location) {
    declareError('Actor does not have a `location`');
    return context;
  }

  // Get current place
  const currentPlace = places[actor.location.id];
  if (!currentPlace) {
    declareError('Actor `location` not found in `places` projection');
    return context;
  }

  // Check for exit in the specified direction
  const exit = currentPlace.exits[direction];
  if (!exit) {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actorId: actor.id,
        originId: currentPlace.id,
        direction,
        reason: 'There is no exit in the specified direction.',
        message: defaultErrorMessage,
      }
    });
    return context;
  }

  // Get destination place
  const destination = places[exit.to];
  if (!destination) {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actorId: actor.id,
        originId: currentPlace.id,
        direction,
        reason: 'Movement destination not found in `places` projection',
        message: defaultErrorMessage,
      }
    });
    return context;
  }

  // Use place hook to move the entity
  const { moveEntity } = usePlaceEntities(context, currentPlace);
  const moveSuccess = moveEntity(actor, destination);

  if (!moveSuccess) {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actorId: actor.id,
        originId: currentPlace.id,
        direction,
        reason: 'Failed to move actor between places',
        message: defaultErrorMessage,
      }
    });
    return context;
  }

  // Update actor's location
  actor.location = createSymbolicLink(EntityType.PLACE, Array.from(destination.path)) as SymbolicLink<EntityType.PLACE>;

  // Declare successful movement
  declareEvent({
    type: EventType.ACTOR_MOVEMENT_DID_SUCCEED,
    payload: {
      actorId: actor.id,
      direction,
      originId: currentPlace.id,
      destinationId: exit.to,
    }
  });

  return context;
};

/**
 * Handler for MOVE commands
 * Processes an actor's movement in the world
 */
export class MOVE implements TransformerInterface<
  Command<CommandType.MOVE, MoveCommandArgs>
> {
  reduce = MoveCommandReducer;
  dependencies = [];
  handles = (input: Command): input is Command<CommandType.MOVE, MoveCommandArgs> => {
    return isCommandOfType(input, CommandType.MOVE);
  };
}

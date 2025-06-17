import { usePlaceEntities } from '~/lib/place';
import { createSymbolicLink } from '~/worldkit/entity/util';
import {
  CommandType,
  Direction,
  EventType,
  EntityType,
  SymbolicLink,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  ActorCommand,
  Place,
} from '@flux';
import { isCommandOfType } from '~/lib/intent';

export type MoveCommandArgs = {
  direction: Direction;
};

export type MoveCommand = ActorCommand<CommandType.MOVE, MoveCommandArgs>;

/**
 * Reducer for MOVE commands
 * Handles actor movement between places using direct world state access
 */
export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> = (context, command) => {
  const { world, declareEvent, declareError } = context;
  const { direction } = command.args;
  const { actors, places } = world;

  const defaultErrorMessage = "You can't go that way.";

  // Get the current actor
  const actor = actors[command.actor];
  if (!actor) {
    declareError('Actor not found in `actors` projection');
    return context;
  }

  if (!actor.location) {
    declareError('Actor does not have a `location`');
    return context;
  }

  // Get current place
  const origin: Place = places[actor.location.id];
  if (!origin) {
    declareError('Actor `location` not found in `places` projection');
    return context;
  }

  // Check for exit in the specified direction
  const exit = origin.exits[direction];
  if (!exit) {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actorId: actor.id,
        originId: origin.id,
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
        originId: origin.id,
        direction,
        reason: 'Movement destination not found in `places` projection',
        message: defaultErrorMessage,
      }
    });
    return context;
  }

  // Use place hook to move the entity
  const { moveEntity } = usePlaceEntities(context, origin);
  const moveSuccess = moveEntity(actor, destination);

  if (!moveSuccess) {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actorId: actor.id,
        originId: origin.id,
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
      originId: origin.id,
      destinationId: exit.to,
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

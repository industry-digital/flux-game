import { createSymbolicLink } from '~/worldkit/entity/util';
import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  EventType,
  EntityType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  ActorCommand,
  Place,
  PlaceURN,
  SpecialVisibility,
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

  // Ensure destination is a valid place
  const destination = places[dest];
  if (!destination) {
    declareError('Movement destination not found in `places` projection');
    return context;
  }

  // Ensure an Exit connects origin to destination
  const exit = Object.values(origin.exits).find(exit => exit.to === dest);
  if (!exit) {
    declareError('There is no exit that connects the origin and destination.');
    return context;
  }

  // Move actor from origin to destination
  // First check if actor is actually in the origin place
  if (!origin.entities?.[actor.id]) {
    declareError('Actor not found in origin place entities');
    return context;
  }

  // Get the actor's descriptor from the origin place
  const actorDescriptor = origin.entities[actor.id] ?? { vis: SpecialVisibility.VISIBLE_TO_EVERYONE };

  // Ensure destination has an entities object
  if (!destination.entities) {
    destination.entities = {};
  }

  // Move the actor by adding to destination and removing from origin
  destination.entities[actor.id] = actorDescriptor;
  delete origin.entities[actor.id];

  // Update actor's location
  actor.location = createSymbolicLink(EntityType.PLACE, destination.path);

  declareEvent({
    type: EventType.ACTOR_DID_MOVE,
    actor: actor.id,
    location: origin.id,
    payload: {
      destination: destination.id,
    },
    trace: command.id,
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

import { isCommandOfType } from '~/lib/intent';
import {
  CommandType,
  EventType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
  ActorCommand,
  Place,
  PlaceURN,
  SpecialVisibility,
  Exit,
} from '@flux';

export type MoveCommandArgs = {
  destination: PlaceURN;
};

export type MoveCommand = ActorCommand<CommandType.MOVE, MoveCommandArgs>;

/**
 * Reducer for MOVE commands
 * Handles actor movement between places using direct world state access
 */
export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> = (context, command) => {
  const { world, declareEvent, declareError } = context;
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
  const origin: Place = places[actor.location];
  if (!origin) {
    declareError('Actor `location` not found in `places` projection');
    return context;
  }

  // Ensure destination is a valid place
  const destination: Place = places[command.args.destination];
  if (!destination) {
    declareError('Movement destination not found in `places` projection');
    return context;
  }

  // Ensure an Exit connects origin to destination
  const exit: Exit = Object.values(origin.exits).find(exit => exit.to === destination.id)!;
  if (!exit) {
    declareError('There is no exit that connects the origin and destination.');
    return context;
  }

  // Get the actor's descriptor from the origin place
  const actorDescriptor = origin.entities[actor.id] ?? { vis: SpecialVisibility.VISIBLE_TO_EVERYONE };

  // Ensure destination has an entities object
  destination.entities ??= {};

  // Move the actor by adding to destination and removing from origin
  destination.entities[actor.id] = actorDescriptor;
  delete origin.entities[actor.id];

  // Update actor's location
  actor.location = destination.id;

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

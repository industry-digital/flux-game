import { isCommandOfType } from '~/lib/intent';
import { CommandType, ActorCommand, Command } from '~/types/intent';
import { EventType } from '~/types/event';
import {
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
} from '~/types/handler';
import { Place, Exit } from '~/types/entity/place';
import { PlaceURN } from '~/types/taxonomy';
import { SpecialVisibility } from '~/types/world/visibility';
import { Direction } from '~/types';

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
  const origin: Place = places[actor.location];
  if (!origin) {
    declareError('Actor `location` not found in `places` projection');
    return context;
  }

  // Ensure destination is a valid place
  const destination: Place = places[dest];
  if (!destination) {
    declareError('Movement destination not found in `places` projection');
    return context;
  }

  let exit: Exit | null = null;

  for (let direction in origin.exits) {
    const potentialExit = origin.exits[direction as Direction]!;
    if (dest === potentialExit.to) {
      exit = potentialExit;
      break;
    }
  }

  if (!exit) {
    declareError('There is no exit that connects the origin and destination.');
    return context;
  }

  // Get the actor's descriptor from the origin place
  const actorDescriptor = origin.entities[actor.id] ?? { vis: SpecialVisibility.VISIBLE_TO_EVERYONE };

  // Ensure destination has an entities object
  destination.entities ??= {};

  // Move the actor descriptor from origin to destination
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
    // TODO: Add `narrative`
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
  handles = (input: Command): input is MoveCommand => {
    return isCommandOfType(input, CommandType.MOVE);
  };
}

import { PureReducer, TransformerContext } from '~/types/handler';
import { MoveCommand } from './types';
import { EventType } from '~/types/event';
import { Place, Exit } from '~/types/entity/place';
import { SpecialVisibility } from '~/types/world/visibility';
import { Direction } from '~/types';
import { withBasicWorldStateValidation } from '../validation';

/**
 * Reducer for MOVE commands
 * Handles actor movement between places using direct world state access
 */

export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const { world, declareEvent, declareError } = context;
    const { dest } = command.args;
    const { actors, places } = world;
    const actor = actors[command.actor];

    // Actor existence and location already validated by withBasicWorldStateValidation
    const origin: Place = places[actor.location];

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
    trace: command.id,
    type: EventType.ACTOR_DID_MOVE,
    actor: actor.id,
    location: origin.id,
    payload: {
      origin: origin.id,
      destination: destination.id,
    },
  });

    return context;
  }
);

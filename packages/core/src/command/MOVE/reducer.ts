import { PureReducer, TransformerContext } from '~/types/handler';
import { MoveCommand } from './types';
import { EventType } from '~/types/event';
import { Place, Exit, PlaceEntityDescriptor } from '~/types/entity/place';
import { SpecialVisibility } from '~/types/world/visibility';
import { CommandType } from '~/types/intent';
import { Direction } from '~/types/world/space';
import { withBasicWorldStateValidation } from '../validation';
import { withCommandType } from '~/command/withCommandType';
import { ErrorCode } from '~/types/error';

const DEFAULT_VISIBILITY: Readonly<PlaceEntityDescriptor> = Object.freeze({
  vis: SpecialVisibility.VISIBLE_TO_EVERYONE,
});

const reducerCore: PureReducer<TransformerContext, MoveCommand> = (context, command) => {
  const { world, failed, declareEvent } = context;
  const { dest } = command.args;
  const actor = world.actors[command.actor];

  // Actor existence and location already validated by withBasicWorldStateValidation
  const origin: Place = world.places[actor.location];

  // Ensure destination is a valid place
  const destination: Place = world.places[dest];
  if (!destination) {
    return failed(command.id, ErrorCode.PLACE_NOT_FOUND);
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
    return failed(command.id, ErrorCode.PRECONDITION_FAILED);
  }

  // Get the actor's descriptor from the origin place
  const actorDescriptor = origin.entities[actor.id] ?? DEFAULT_VISIBILITY;

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
};

/**
 * Reducer for MOVE commands
 * Handles actor movement between places using direct world state access
 */
export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> =
  withCommandType(CommandType.MOVE,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );

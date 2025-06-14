import { Direction, EventType, PlaceURN, TransformerContext, Character, EntityType, SymbolicLink } from '@flux';
import { createSymbolicLink } from '~/worldkit/entity/util';

export type ActorMovementHook = {
  move: (direction: Direction) => MoveResult;
};

export type MoveResult =
  | { success: true }
  | { success: false; reason: string; message?: string };

const createDummyActorMovementHook = (reason: string): ActorMovementHook => ({
  move: () => ({ success: false, reason }),
});

export const useActor = (context: TransformerContext): Character => {
  const { world, declareError } = context;
  const { self, actors } = world;
  const actor = actors[self] as Character;

  if (!actor) {
    throw new Error('Actor not found in `actors` projection');
  }

  return actor;
};

export const useActorMovement = (
  context: TransformerContext,
): ActorMovementHook => {
  const { world, declareError, declareEvent } = context;
  const { places } = world;
  const actor = useActor(context);

  if (!actor) {
    return createDummyActorMovementHook('Actor not found in `actors` projection');
  }

  if (!actor.location) {
    return createDummyActorMovementHook('Actor does not have a location');
  }

  const origin = places[actor.location.id as keyof typeof places];
  if (!origin) {
    return createDummyActorMovementHook('Actor `location` not found in `places`');
  }

  const DEFAULT_ERROR_MESSAGE = "You can't go that way.";

  const declareMovementFailure = (direction: Direction, reason: string, message = DEFAULT_ERROR_MESSAGE): MoveResult => {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actor: actor.id,
        origin: origin.id,
        direction,
        reason,
        message,
      }
    });

    return {
      success: false,
      reason,
      message,
    };
  };

  const declareMovementSuccess = (direction: Direction, destination: PlaceURN): MoveResult => {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_SUCCEED,
      payload: {
        actor: actor.id,
        direction,
        origin: origin.id,
        destination,
      }
    });

    return { success: true };
  };

  const move = (direction: Direction): MoveResult => {
    const exit = origin.exits[direction];
    if (!exit) {
      return declareMovementFailure(direction, 'No exit in that direction');
    }

    const destination = places[exit.to];
    if (!destination) {
      return declareMovementFailure(direction, 'Destination place not found in `places` projection');
    }

    // Now all we have to do is "transfer" actor's representation from the origin to the destination.
    const descriptor = origin.entities[actor.id];
    if (!descriptor) {
      return declareMovementFailure(direction, 'Actor not found at `origin`');
    }

    // Transfer actor's descriptor from origin to destination
    destination.entities[actor.id] = descriptor;
    delete origin.entities[actor.id];

    // Update actor's location
    actor.location = createSymbolicLink(EntityType.PLACE, Array.from(destination.path)) as SymbolicLink<EntityType.PLACE>;

    return declareMovementSuccess(direction, exit.to);
  };

  return { move };
};

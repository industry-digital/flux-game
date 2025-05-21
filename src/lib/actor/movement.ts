import { SpecialVisibility } from 'flux-types';
import { Entity, EntityURN, Place, PlaceURN, PureReducerContext, Taxonomy } from '~/types/domain';
import { EventType } from '~/types/event';

export type ActorMovementHookArgs = {
  actor: Entity<any>;
  origin: Place;
}

export type ActorMovementHook = {
  move: (direction: Taxonomy.Directions) => MoveResult;
};

export type MoveResult =
  | { success: true, reason?: '', message?: '' }
  | { success: false; reason: string, message?: string };

export const useActorMovement = <ActorEntityType>(
  context: PureReducerContext
): ActorMovementHook => {
  const { actors, places, self } = context.world;
  const actor = actors[self];

  if (!actor) {
    throw new Error('Actor not found in `world.actors`');
  }

  const origin = places[actor.location as PlaceURN];
  if (!origin) {
    throw new Error('Origin place not found in `world.places`');
  }

  const defaultErrorMessage = `You can't go that way.`;

  const movementFailure = ({ reason, message }: { reason: string, message?: string }): MoveResult => {
    context.declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actor: actor.id,
        origin: origin.id,
        reason,
        message
      }
    });

    return {
      success: false,
      reason,
      message: message || defaultErrorMessage,
    };
  };

  const movementSuccess = (newLocation: PlaceURN, direction: Taxonomy.Directions): MoveResult => {
    context.declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_SUCCEED,
      payload: {
        actor: actor.id,
        direction,
        origin: origin.id,
        destination: newLocation,
      }
    });

    return { success: true };
  };

  const move = (direction: Taxonomy.Directions): MoveResult => {
    const exit = origin.attributes.exits[direction];
    if (!exit) {
      return movementFailure({
        reason: 'No exit in that direction',
        message: defaultErrorMessage,
      });
    }

    const destination = places[exit.to];
    if (!destination) {
      return movementFailure({
        reason: 'Destination place not found in `world.places`',
        message: defaultErrorMessage,
      });
    }

    // Assign a new location to the actor
    actor.location = exit.to;

    // Remove the actor's reprsentation from origin
    delete origin.attributes.entities[actor.id as EntityURN];

    // Add the actor's representation to destination
    destination.attributes.entities[actor.id as EntityURN] = {
      visibility: SpecialVisibility.VISIBLE_TO_EVERYONE,
    };

    return movementSuccess(destination.id as PlaceURN, direction);
  };

  return { move };
};

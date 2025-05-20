import {
  Effect,
  Entity,
  EntityType,
  Place,
  PlaceEntities,
  Taxonomy,
  PureReducerContext,
  Character,
  SpecialVisibility,
  EventType,
  Command,
  CommandType,
} from '~/types/domain';

/**
 * Checks if a place is directly connected to another place via exits
 */
const isPlaceConnectedToOrigin = (origin: Place, destinationId: string): boolean => {
  if (!origin.attributes.exits) {
    return false;
  }

  for (const exit of Object.values(origin.attributes.exits)) {
    if (exit.to === destinationId) {
      return true;
    }
  }

  return false;
};

export interface ActorMovementHookArgs<T extends EntityType> {
  /**
   * The actor that is moving
   */
  actor: Entity<T>;
  /**
   * The Place the actor is moving from
   */
  origin: Place;
  /**
   * The entities present in `origin`
   */
  originEntities: PlaceEntities;
  /**
   * The reducer context for declaring events and side effects
   */
  context: PureReducerContext;
}

export interface MoveAllowedSpecification {
  allowed: boolean;
  reason?: string;
}

export interface ActorMovementHook {
  /**
   * Move the actor to a new place
   * @returns true if movement was successful, false otherwise
   */
  moveTo: (destination: Place, destinationEntities: PlaceEntities) => boolean;

  /**
   * Check if the actor can move to a given destination
   * @returns boolean indicating if movement is possible, and reason if not
   */
  isMoveAllowed: (destination: Place, destinationEntities: PlaceEntities) => MoveAllowedSpecification;
}

/**
 * Utility for handling actor movement between places
 *
 * @param args - Movement configuration
 * @returns Movement operations
 */
export const useActorMovement = <T extends EntityType>(
  args: ActorMovementHookArgs<T>,
  command: Command<CommandType.MOVE>
): ActorMovementHook => {
  const { actor, origin, originEntities, context } = args;

  /**
   * Helper: Get the direction of the exit used to reach a destination
   */
  const getExitDirection = (place: Place, destinationId: string): Taxonomy.Directions | undefined => {
    if (!place.attributes.exits) {
      return undefined;
    }

    for (const [direction, exit] of Object.entries(place.attributes.exits)) {
      if (exit.to === destinationId) {
        return direction as Taxonomy.Directions;
      }
    }

    return undefined;
  };

  /**
   * Check if the actor can move to the specified destination
   */
  const isMoveAllowed = (destination: Place, destinationEntities: PlaceEntities): MoveAllowedSpecification => {
    // Check if the destination is connected to the origin
    if (!isPlaceConnectedToOrigin(origin, destination.id)) {
      return { allowed: false, reason: 'not_connected' };
    }

    if (!actor.type === EntityType.CHARACTER) {
      return { allowed: true };
    }

    const character = actor as unknown as Character;

    if (isActorImmobilized(character)) {
      return { allowed: false, reason: 'You are immobilized and cannot move.' };
    }

    return { allowed: true };
  };

  /**
   * Move the actor to the specified destination
   */
  const moveTo = (destination: Place, destinationEntities: PlaceEntities): boolean => {
    const { allowed, reason } = isMoveAllowed(destination, destinationEntities);

    if (!allowed) {
      context.declareEvent({
        type: EventType.ACTOR_MOVEMENT_DID_FAIL,
        payload: {
          actor: actor.id,
          origin: origin.id,
          destination: destination.id,
          reason,
        },
      });

      return false;
    }

    // Remove actor from origin entities
    delete originEntities[actor.id];

    // Add the actor to the destination entities with a default visibility
    // Let other systems handle visibility computation in response to events
    destinationEntities[actor.id] = {
      ...actor,
      visibility: SpecialVisibility.VISIBLE_TO_EVERYONE,
    };

    actor.location = destination.id;

    context.declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_SUCCEED,
      payload: {
        actor: actor.id,
        origin: origin.id,
        destination: destination.id,
      }
    });

    return true;
  };

  return { moveTo, isMoveAllowed };
};

/**
 * Return true if the supplied actor is not able to move due to an incapacitating condition
 * or effect.
 */
export const isActorImmobilized = (entity: Entity): boolean => {
  if (entity.type !== EntityType.CHARACTER) {
    return false;
  }

  const character = entity as Character;
  const { effects = {}, condition } = character.attributes;

  if (!condition || condition === CharacterCondition.ALIVE) {
    return false;
  }

  if (!effects) {
    return false;
  }

  return Object.keys(effects).some((effect) => {
    const effectType = effects[effect].type;
    return (
      effectType === Effect.STUNNED ||
      effectType === Effect.PARALYZED ||
      effectType === Effect.ENTANGLED ||
      effectType === Effect.RESTRAINED ||
      effectType === Effect.FROZEN ||
      effectType === Effect.PETRIFIED
    );
  });
};

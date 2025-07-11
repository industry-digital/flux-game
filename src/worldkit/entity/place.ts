import { EntityType } from '~/types/entity/entity';
import { Place, Exit, PlaceEntityDescriptor } from '~/types/entity/place';
import { PlaceURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { SpecialVisibility } from '~/types/world/visibility';
import { Direction } from '~/types/world/space';
import { createEntity, FactoryOptions } from './util';
import { extractPathFromUrn } from '~/lib/taxonomy';
import { ExitInput, Exits, PlaceInput } from '~/types/entity/place';
import lodash from 'lodash';

const { merge } = lodash;

const identity = <T>(x: T): T => x;

export const createPlace = (
  input: PlaceInput,
  transform: (place: Place) => Place = identity,
  options: FactoryOptions = {},
): Place => {
  const base = createEntity<EntityType.PLACE, Place>(
    EntityType.PLACE,
    (entity) => {
      const exits = input.exits || {};

      const defaults: Partial<Place> = {
        id: entity.id,
        name: entity.name || '',
        description: entity.description || '',
        entities: {},
        exits,
      };

      // Create a copy of input without the exits to avoid any conflicts
      const { exits: _, ...inputWithoutExits } = input;

      const result = merge({}, entity, defaults, inputWithoutExits) as Place;

      // Derive correct path from input id if provided
      return input.id && input.id !== entity.id
        ? { ...result, path: extractPathFromUrn(input.id) }
        : result;
    },
    options,
  );

  return transform(base);
};

export enum WellKnownPlace {
  NOWHERE = 'flux:place:nowhere',
}

/**
 * Factory function to create an Exit with standard defaults
 */
export const createExit = (
  input: ExitInput,
  transform: (exit: Exit) => Exit = identity,
): Exit => {
  return transform({
    direction: input.direction,
    label: input.label || '',
    to: input.to || WellKnownPlace.NOWHERE,
  });
};

export type PlaceDictionary = Record<PlaceURN, Place>;

/**
 * Given a list of place inputs, create a dictionary of places
 */
export const createPlaces = (
  inputs: PlaceInput[]
): PlaceDictionary => {
  const out: PlaceDictionary = {};

  for (const input of inputs) {
    const place = createPlace(input);
    out[place.id] = place;
  }

  return out;
};

export const addActorToPlace = (
  actor: Actor,
  place: Place,
  visibility: PlaceEntityDescriptor['vis'] = SpecialVisibility.VISIBLE_TO_EVERYONE,
): Place => {
  return {
    ...place,
    entities: {
      ...place.entities,
      [actor.id]: { vis: visibility },
    },
  };
};

export const removeActorFromPlace = (
  actor: Actor,
  place: Place,
): Place => {
  const { [actor.id]: _, ...rest } = place.entities;
  return { ...place, entities: rest };
};

export const getExitDirection = (
  exitsAtOrigin: Exits,
  destination: PlaceURN
): Direction => {
  const entries = Object.entries(exitsAtOrigin) as [Direction, Exit][];
  for (const [direction, exit] of entries) {
    if (exit.to === destination) {
      return direction;
    }
  }

  return Direction.UNKNOWN;
};

import { AbstractEntity, EntityType } from '~/types/entity/entity';
import { Place, Exit, PlaceEntityDescriptor } from '~/types/entity/place';
import { PlaceURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { SpecialVisibility } from '~/types/world/visibility';
import { Direction } from '~/types/world/space';
import { createEntity, FactoryOptions } from './util';
import { isUrnOfVocabulary } from '~/lib/taxonomy';
import { ExitInput, Exits, PlaceInput } from '~/types/entity/place';
import { WellKnownPlace } from '~/types/world/space';
import lodash from 'lodash';

const { merge } = lodash;

const identity = <T>(x: T): T => x;


/**
 * Type guard for Place
 */
export const isPlace = (place: AbstractEntity<EntityType>): place is Place => {
  return place.type === EntityType.PLACE;
};

export const isPlaceUrn = (urn: string): urn is PlaceURN => isUrnOfVocabulary(urn, 'place');

export const createPlace = (
  input: PlaceInput,
  transform: (place: Place) => Place = identity,
  options: FactoryOptions = {},
): Place => {
  const base = createEntity<EntityType.PLACE, Place>(
    EntityType.PLACE,
    (entity) => {
      const exits = input.exits || {};

      const defaults: Place = {
        id: entity.id,
        type: EntityType.PLACE,
        name: entity.name || '',
        description: entity.description || '',
        ecosystem: 'flux:eco:forest:temperate',
        coordinates: [0, 0],
        entities: {},
        resources: {
          ts: 0,
          nodes: {},
        },
        weather: {
          seed: 0,
          temperature: { position: 0.5, value: 20 },
          pressure: { position: 0.5, value: 1013 },
          humidity: { position: 0.5, value: 60 },
          precipitation: 0,
          ppfd: 0,
          clouds: 0,
          fog: 0,
          ts: 0,
        },
        exits,
      };

      // Create a copy of input without the exits to avoid any conflicts
      const { exits: _, ...inputWithoutExits } = input;

      return merge({}, entity, defaults, inputWithoutExits) as Place;
    },
    options,
  );

  return transform(base);
};

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

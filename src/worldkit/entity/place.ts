import { EntityType, Place, Exit, PlaceURN } from '@flux';
import { createEntity, FactoryOptions } from './util';
import { merge } from 'lodash';
import { ExitInput, PlaceInput } from '~/types/entity/place';

const identity = <T>(x: T): T => x;

export const createPlace = (
  input: PlaceInput,
  transform: (place: Place) => Place = identity,
  options: FactoryOptions = {},
): Place => {
  const base = createEntity<EntityType.PLACE, Place>(
    EntityType.PLACE,
    (entity) => {
      const defaults: Partial<Place> = {
        id: entity.id,
        name: entity.name || '',
        description: entity.description || '',
        exits: {},
        entities: {}
      };

      return merge({}, entity, defaults, input) as Place;
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
    const place = createPlace({
      id: input.id,
      name: input.name,
      description: input.description,
      exits: input.exits || [],
    });

    out[place.id] = place;
  }

  return out;
};

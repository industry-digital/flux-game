import { EntityType, Place, Exit, RootNamespace, PlaceURN } from '@flux';
import { createEntity, FactoryOptions } from './util';
import { createPlaceUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import { merge } from 'lodash';
import { PlaceInput } from '~/types/entity/place';
import { createTranslationUrn, Translatable } from '~/i18n';

const identity = <T>(x: T): T => x;

export const createPlace = (
  transform: (place: Place) => Place = identity,
  options: FactoryOptions = {},
): Place => {
  const base = createEntity<EntityType.PLACE, Place>(
    EntityType.PLACE,
    (entity) => {
      const defaults: Partial<Place> = {
        name: entity.name || '',
        description: entity.description || '',
        exits: {},
        entities: {}
      };

      return merge({}, entity, defaults) as Place;
    },
    options,
  );

  return transform(base);
};

/**
 * Factory function to create an Exit with standard defaults
 */
export const createExit = (
  transform: (exit: Exit) => Exit = identity,
  { uuid = randomUUID }: FactoryOptions = {},
): Exit => {
  return transform({
    label: '',
    to: createPlaceUrn(uuid()) as `${RootNamespace}:${EntityType.PLACE}:${string}`,
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

  inputs.forEach(input => {
    const place = createPlace((defaults) => ({
      ...defaults,
      name: input.name ? createTranslationUrn(defaults.id, Translatable.NAME) : '',
      description: input.description ? createTranslationUrn(defaults.id, Translatable.DESCRIPTION) : '',
      exits: input.exits || {},
      entities: input.entities || {}
    }));

    out[place.id] = place;
  });

  return out;
};

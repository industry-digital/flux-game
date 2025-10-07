import { AbstractEntity, EntityType } from '~/types/entity/entity';
import { Place, Exit, PlaceEntityDescriptor } from '~/types/entity/place';
import { PlaceURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { SpecialVisibility } from '~/types/world/visibility';
import { Direction } from '~/types/world/space';
import { DEFAULT_FACTORY_DEPS, FactoryDependencies } from './util';
import { isUrnOfVocabulary } from '~/lib/taxonomy';
import { ExitInput, Exits, PlaceInput } from '~/types/entity/place';
import { WellKnownPlace } from '~/types/world/space';

const identity = <T>(x: T): T => x;

/**
 * Type guard for Place
 */
export const isPlace = (place: AbstractEntity<EntityType>): place is Place => {
  return place.type === EntityType.PLACE;
};

export const isPlaceUrn = (urn: string): urn is PlaceURN => isUrnOfVocabulary(urn, 'place');

export type PlaceTransformer = (place: Place) => Place;

export function createPlace(
  inputOrTransform?: PlaceInput | PlaceTransformer,
  deps: FactoryDependencies = DEFAULT_FACTORY_DEPS,
): Place {
  let transform: PlaceTransformer = identity;
  if (typeof inputOrTransform === 'function') {
    transform = inputOrTransform;
  } else if (inputOrTransform) {
    transform = (place: Place) => ({ ...place, ...inputOrTransform });
  } else {
    transform = (place: Place) => place;
  }

  const place = createDefaultPlace(deps);

  return transform(place);
}

const createDefaultPlace = (
  deps: FactoryDependencies,
): Place => {
  return {
    id: `flux:place:${deps.uniqid()}`,
    type: EntityType.PLACE,
    name: '',
    description: { base: '', emergent: '' },
    ecosystem: 'flux:eco:forest:temperate',
    coordinates: [0, 0],
    entities: {},
    resources: {
      ts: 0,
    },
    weather: {
      temperature: { seed: 0, value: 0 },
      pressure: { seed: 0, value: 0 },
      humidity: { seed: 0, value: 0 },
      precipitation: 0,
      ppfd: 0,
      clouds: 0,
      fog: 0,
      ts: 0,
    },
    exits: {},
  };
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

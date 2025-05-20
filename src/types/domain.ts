// src/types/domain.ts
// First, import what you need from flux-types, but not the conflicting type
import { DeclarationContainer } from 'flux-types';

// Export your enum first to establish it
export enum EntityType {
  PLACE = "place",
  CHARACTER = "character",
  COLLECTION = "collection",
  ITEM = "item",
  VEHICLE = "vehicle"
}

// Then export the rest from flux-types, but exclude EntityType
// We can use a more targeted approach instead of export *
export type {
  Character,
  CharacterAttributes,
  Entity,
  EntityURN,
  Exit,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  Place,
  PlaceAttributes,
  PlaceURN,
  Taxonomy,
} from 'flux-types';

export type URNLike = `${string}:${string}`;

export { CommandType } from './intent';

export type PureReducerContext<ExpectedWorldState = any> = DeclarationContainer & {
  world: ExpectedWorldState;
};

export const ROOT_NAMESPACE = 'flux';

export enum Vocabulary {
  PLACE = 'place',
  CHARACTER = 'character',
  ITEM = 'item',
  VEHICLE = 'vehicle',
  EFFECT = 'effect',
  COMMAND = 'command',
  EXIT = 'exit',
  COLLECTION = 'collection',
  ENTITY = 'entity'
}

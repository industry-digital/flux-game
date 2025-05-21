import { DeclarationContainer } from 'flux-types';

export type {
  Command,
  Character,
  CharacterAttributes,
  CharacterStats,
  CharacterStatName,
  Skills,
  InjuryDescriptor,
  Equipment,
  SkillState,
  EmergentNarrative,
  Entity,
  EntityURN,
  Exit,
  Inventory,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedValueBetweenZeroAndOne,
  Place,
  PlaceAttributes,
  PlaceEntityDescriptor,
  PlaceEntities,
  PlaceScopedHistoricalEvent,
  PureReducer,
  PureHandlerImplementation,
  SymbolicLink,
  Taxonomy,
  parseUrn,
  createPlaceUrn,
  createCharacterUrn,
  createTraitUrn,
  createSkillUrn,
  createAbilityUrn,
  createEffectUrn,
  createItemUrn,
  createWeaponUrn,
  createArmorUrn,
  matchUrnPattern,
  findMatchingUrns,
  PlaceURN,
  CharacterURN,
  TraitURN,
  AbilityURN,
  SkillURN,
  EffectURN,
  DirectionURN,
  WeaponURN,
  ArmorURN,
  ItemURN,
} from 'flux-types';

export enum EntityType {
  PLACE = "place",
  CHARACTER = "character",
  COLLECTION = "collection",
  ITEM = "item",
  VEHICLE = "vehicle"
}

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

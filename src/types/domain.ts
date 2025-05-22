import { Command, DeclarationContainer, Entity, EntityURN, Intent, Place, PlaceURN } from 'flux-types';

export type {
  Command,
  CommandInput,
  CommandHandlerInterface,
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
  IntentInput,
  Intent,
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
  PureHandlerInterface,
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

export type AllowedInput = Command | Intent;

export enum EntityType {
  PLACE = "place",
  CHARACTER = "character",
  COLLECTION = "collection",
  ITEM = "item",
  VEHICLE = "vehicle"
}

export type URNLike = `${string}:${string}`;

export { CommandType } from './intent';

/**
 * This is the minimal representation of the world state that is passed to all pure reducers in the
 * Transformation stage of the pipeline. All projections in the server *must* be a superset of this type.
 */
export type MinimalWorldStateProjection = {
  /**
   * The URN of the current actor
   */
  self: EntityURN;

  /**
   * The various actors of the world, indexed by URN
   * This will always contain the current actor
   */
  actors: Record<EntityURN, Entity<any>>;

  /**
   * The various places of the world, indexed by URN
   */
  places: Record<PlaceURN, Place>;
};

export type PureReducerContext<
  ExpectedWorldState extends MinimalWorldStateProjection = MinimalWorldStateProjection,
> = DeclarationContainer & {
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

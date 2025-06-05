// Barrel export file for all types in the project
// This provides a clean API boundary and makes it easier to share types
// across multiple services in our MUD architecture if needed

export { Self } from './actor';

export {
  TargetingSpecification,
  TargetType,
} from './combat';

export { ROOT_NAMESPACE } from './constants';

export {
  DamageType,
  DamageSpecification,
} from './damage';

export {
  DieType,
  RollResult,
  RollSpecification
} from './dice';

export {
  AppliedEffect,
} from './effect';

export {
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
  NormalizedValueBetweenZeroAndOne,
} from './entity/attribute';

export {
  Character,
  CharacterInput,
  CharacterStatName,
  CharacterStats,
  Equipment,
  AppliedAnatomicalDamage as InjuryDescriptor,
  Inventory,
  Skills,
} from './entity/character';

export {
  Party,
  Organization,
  GroupType,
  GroupSymbolicLink,
  PartyRef,
  OrganizationRef,
} from './entity/group';

export {
  EmergentNarrative,
  EntityType,
  UUIDLike,
  AbstractEntity,
  DescribableMixin,
  LocallyUniqueId,
  Entity,
  SymbolicLink,
} from './entity/entity';

export type {
  ParsedURN
} from '~/lib/entity/urn';

export {
  ItemState,
  ItemSubtype,
  ContainerMixin,
  StackableMixin,
  ChargeableMixin,
} from './entity/item';

export {
  Exit,
  Place,
  PlaceEntityDescriptor,
} from './entity/place';

export {
  CharacterSkillRecord,
  SkillState,
  SpecializationGroup,
  Specializations,
} from './entity/skill';

export {
  Monster,
  MonsterInput,
} from './entity/monster';

export {
  EmergentEvent,
  EmergentEventInput,
  EventPayload,
  EventType,
} from './event';

export {
  AllowedInput,
  CombatProjectionMixin,
  CommandTypeGuard,
  ErrorDeclarationConsumer,
  ErrorDeclarationProducer,
  EventDeclarationConsumer,
  EventDeclarationProducer,
  ExecutionError,
  InputTypeGuard,
  MinimalWorldProjection,
  PlannerContext,
  PotentiallyImpureOperations,
  PureHandlerImplementation,
  PureHandlerInterface,
  PureReducer,
  SideEffectDeclarationConsumer,
  SideEffectDeclarationContainer,
  SideEffectDeclarationProducer,
  Transformer,
  TransformerContext,
  TransformerImplementation,
  TransformerInterface,
  WorldProjection,
  WorldProjectionConsumer,
  VendorProjectionMixin,
  createCommandGuard,
  isCommandOfType,
} from './handler';

export {
  AbstractCommand as Command,
  CommandInput,
  CommandType,
  Intent,
  IntentInput,
  Command as KnownCommand,
  isCommand,
  isIntent,
} from './intent';

export {
  createIntentFromText,
  createCommand,
  createCommandFromIntent,
} from '~/lib/intent';

export {
  Modifier,
  Modifiers,
} from './modifier';

export {
  Requirements,
} from './requirement';

// Schema exports
export {
  ContainerStrategy,
  ContainerCapacitySpecification,
  AbstractContainer,
  Bundle,
  ContainerSchema,
} from './schema/container';

export {
  AbilitySchema,
  AbilityType,
} from './schema/ability';

export {
  ArmorSchema,
  ArmorComponentSpecification,
} from './schema/armor';

export {
  WeaponSpecification,
  WeaponAttackSpecification,
  WeaponTimers,
  WeaponRangeSpecification,
} from './schema/weapon';

export {
  SkillSchema,
} from './schema/skill';

export {
  SideEffect,
  SideEffectInput,
} from './side-effect';

// Taxonomy exports
export {
  AbilityURN,
  ArmorURN,
  CharacterURN,
  DirectionURN,
  EffectURN,
  EntityURN,
  Intrinsic,
  ItemURN,
  ModifierURN,
  PlaceURN,
  RootNamespace,
  RootVocabulary,
  SkillURN,
  StatURN,
  TAXONOMY,
  Taxonomy,
  TraitURN,
  WeaponURN,
} from './taxonomy';

export {
  AnatomyUrn,
  Anatomy,
  HumanAnatomy,
  HUMAN_ANATOMY,
  createHumanAnatomyUrn,
  createAnatomyUrn,
} from './taxonomy/anatomy';

export {
  EffectSchema,
  EffectOriginType,
  EffectOrigin,
  TaxonomyEffect,
  AppliedEffects,
  EffectCategory,
  EFFECTS,
  StatusEffect,
  getEffectCategory,
} from './taxonomy/effect';

export {
  createEntityUrn,
  createPlaceUrn,
  createCharacterUrn,
  createItemUrn,
  createTraitUrn,
  createSkillUrn,
  createAbilityUrn,
  createWeaponUrn,
  createArmorUrn,
  createDirectionUrn,
  createEffectUrn,
  createStatUrn,
} from '~/lib/taxonomy';

// World exports
export {
  GOLDEN_RATIO,
} from './world/constants';

export {
  Direction,
  WellKnownPlaceName,
} from './world/space';

export {
  Duration,
  ScheduledDuration,
  SpecialDuration,
  TimeUnit,
} from './world/time';

export {
  SpecialVisibility,
} from './world/visibility';

export {
  UnitOfMeasure,
  UnitOfDistance,
} from './world/measures';

// Testing utilities
export {
  EntityTransformer,
} from './testing';

// Barrel export file for all types in the project
// This provides a clean API boundary and makes it easier to share types
// across multiple services in our MUD architecture if needed

export { Self } from './actor';

export { ROOT_NAMESPACE } from './constants';

export {
  DamageType,
  DamageSpecification,
} from './damage';

export {
  DieSize as DieType,
  RollResult,
  RollSpecification
} from './dice';

export {
  CurvePosition,
  CurvePositionWithValue,
  SeededCurvePosition,
  SeededCurvePositionWithValue,
  Easing,
  EasingFunction,
  EasingFunctionName,
} from './easing';

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
  Actor,
  ActorType,
  ActorInput,
  Stat as ActorStat,
  ActorStats,
  Equipment,
  AppliedAnatomicalDamage as InjuryDescriptor,
  Inventory,
  Skills,
} from './entity/actor';

export {
  Party,
  Faction,
  GroupType,
  GroupSymbolicLink,
  PartyRef,
  FactionRef,
} from './entity/group';

export {
  Modification,
  Device,
  Weapon,
  Armor,
  Item,
  AbstractItem,
} from './entity/item';

export type {
  Container,
  ContainerStrategy as KindOfContainer,
} from './entity/container';

export {
  EmergentNarrative,
  EntityType,
  UUIDLike,
  AbstractEntity,
  Describable as DescribableMixin,
  LocallyUniqueId,
  Entity,
  Describable,
} from './entity/entity';

export type {
  ParsedURN
} from '~/lib/urn';

export {
  Item as ItemState,
  KindOfItem as ItemType,
  StackableMixin,
  ChargeableMixin,
} from './entity/item';

export {
  Exit,
  ExitInput,
  Exits,
  Place,
  PlaceEntityDescriptor,
  PlaceInput,
} from './entity/place';

export {
  CharacterSkillRecord,
  SkillState,
  SpecializationGroup,
  Specializations,
} from './entity/skill';

export * from './event';

export {
  CombatProjectionMixin,
  ErrorDeclarationConsumer,
  ErrorDeclarationProducer,
  EventDeclarationConsumer,
  EventDeclarationProducer,
  ExecutionError,
  InputTypeGuard,
  MinimalWorldProjection,
  PotentiallyImpureOperations,
  PureHandlerImplementation,
  PureHandlerInterface,
  PureReducer,
  CommandReducer,
  TransformerContext,
  TransformerImplementation,
  TransformerInterface,
  WorldProjection,
  WorldProjectionConsumer,
  TradeProjectionMixin as VendorProjectionMixin,
} from './handler';

export {
  Command as SystemCommand,
  CommandInput,
  CommandType,
  Command,
  Command as AnyCommand,
  CommandTypeGuard as AnyCommandTypeGuard,
  ActorCommand,
  ActorCommandTypeGuard,
  SystemCommandTypeGuard,
} from './intent';

export {
  createCommand,
} from '~/lib/intent';

export {
  Modifier,
  AppliedModifiers as Modifiers,
} from './modifier';

export {
  Requirements,
} from './requirement';

// Schema exports
export {
  ContainerStrategy,
  ContainerCapacitySpecification,
  ContainerSchema,
  BundleSchema,
  ChestSchema,
  BagSchema,
} from './schema/container';

export {
  EcologicalProfile,
  ECOLOGICAL_PROFILES,
  Biome,
  Climate,
  SoilType,
  BedrockType,
  RockType,
  RockFormationType,
  SoilTexture,
  SoilRockiness,
} from './schema/ecology';

export {
  AbilitySchema,
  AbilityType,
} from './schema/ability';

export {
  ArmorSchema,
  ArmorComponentSpecification,
} from './schema/armor';

export {
  WeaponSchema,
  WeaponAttackSpecification,
  WeaponTimers,
  WeaponRangeSpecification,
} from './schema/weapon';

export {
  SkillSchema,
} from './schema/skill';

export {
  ResourceSchema,
  KindOfResource,
  BulkResourceSchema,
  SpecimenResourceSchema,
  ResourceGrowthRequirements,
  GrowthSpecification,
  Season,
  TimeOfDay,
  LunarPhase,
  FitnessEvaluationStrategy,
  FitnessSpecification,
} from './schema/resource';

export {
  Weather,
  WeatherPropertySpecification,
  WeatherPropertySpecificationInput,
} from './schema/weather';

export {
  ResourceNodes,
  ResourceNodeStatus,
  ResourceNodeState,
} from './entity/resource';

// Taxonomy exports
export {
  AbilityURN,
  ActorURN,
  ArmorItemURN,
  DirectionURN,
  EcosystemURN,
  EffectURN,
  EntityURN,
  Intrinsic,
  ItemURN,
  ModifierURN,
  PlaceURN,
  ResourceURN,
  RootNamespace,
  RootVocabulary,
  SchemaURN,
  SessionURN,
  SkillURN,
  StatURN,
  TAXONOMY,
  Taxonomy,
  TopicURN,
  TraitURN,
  WeaponItemURN,
  WeaponSchemaURN,

} from './taxonomy';

export {
  AnatomyUrn,
  Anatomy,
  HumanAnatomy,
  HumanAnatomy as HUMAN_ANATOMY,
  createHumanAnatomyUrn,
  createAnatomyUrn,
} from './taxonomy/anatomy';

export {
  AppliedEffect as EffectSchema,
  EffectOriginType,
  EffectOrigin,
  Effect as TaxonomyEffect,
  AppliedEffects,
  EffectCategory,
  EFFECTS,
  StatusEffect,
  getEffectCategory,
} from './taxonomy/effect';

// World exports
export {
  GOLDEN_RATIO,
} from './world/constants';

export {
  Direction,
  WellKnownPlace,
} from './world/space';

export {
  Duration,
  ScheduledDuration,
  SpecialDuration,
  TimeUnit,
  WellKnownDuration,
} from './world/time';

export {
  SpecialVisibility,
} from './world/visibility';

export {
  UnitOfMeasure,
  UnitOfMass,
  UnitOfVolume,
} from './world/measures';

// Testing utilities
export {
  EntityTransformer,
} from './testing';

export {
  EnrichedWorldEvent,
  WorldEventNarrativeDictionary,
} from './client';

export {
  Template,
} from './template';

export * from './session';

export * from './narrative';

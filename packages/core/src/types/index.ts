// Barrel export file for all types in the project
// This provides a clean API boundary and makes it easier to share types
// across multiple services in our MUD architecture if needed

export { Self, WellKnownActor } from './actor';

export { ROOT_NAMESPACE } from './constants';

export {
  ErrorCode,
} from './error';

export {
  DamageType,
  DamageSpecification,
} from './damage';

export {
  DieSize as DieType,
  RollResultWithoutModifiers as RollResult,
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
  Gender,
  ActorType,
  ActorInput,
  Stat,
  ActorStats,
  Equipment,
  AppliedAnatomicalDamage,
  Inventory,
  Skills,
  CoreStat,
  CoreStats,
} from './entity/actor';

export {
  Shell,
} from './entity/shell';

export {
  Group,
  Party,
  Faction,
  GroupType,
  GroupSymbolicLink,
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
} from './entity/skill';

export * from './event';

export {
  ErrorDeclarationConsumer,
  ErrorDeclarationProducer,
  EventDeclarationConsumer,
  EventDeclarationProducer,
  ExecutionError,
  InputTypeGuard,
  PotentiallyImpureOperations,
  PureHandlerImplementation,
  PureHandlerInterface,
  PureReducer,
  CommandReducer,
  TransformerContext,
  TransformerImplementation,
  TransformerInterface,
  WorldProjectionConsumer,
} from './handler';

export {
  WorldProjection
} from './world';

export {
  Command,
  CommandInput,
  CommandType,
  Command as AnyCommand,
  ActorCommand,
  CommandResolver,
  CommandResolverContext,
  Intent,
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
  AccuracySpecification,
  WeaponTimers,
  WeaponRangeSpecification,
} from './schema/weapon';

export * from './schema/ammo';

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
} from './entity/weather';

export {
  ResourceNodes,
  ResourceNodeStatus,
  ResourceNodeState,
} from './entity/resource';

// Taxonomy exports
export {
  AbilityURN,
  ActorURN,
  AmmoSchemaURN,
  AnatomyURN,
  ArmorItemURN,
  DirectionURN,
  EcosystemURN,
  EffectURN,
  EntityURN,
  GroupURN,
  Intrinsic,
  ItemURN,
  ModifierURN,
  PartyURN,
  PlaceURN,
  ResourceURN,
  RootNamespace,
  RootVocabulary,
  SchemaURN,
  SessionURN,
  SkillURN,
  SkillSchemaURN,
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
  Template,
} from './template';

export * from './session';

export * from './narrative';

export * from './currency';

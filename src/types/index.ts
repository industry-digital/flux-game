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
  Actor,
  ActorType,
  ActorInput,
  ActorStat,
  ActorStats,
  Equipment,
  AppliedAnatomicalDamage as InjuryDescriptor,
  Inventory,
  Skills,
} from './entity/actor';

export {
  Party,
  Organization,
  GroupType,
  GroupSymbolicLink,
  PartyRef,
  OrganizationRef,
} from './entity/group';

export {
  ItemType,
  Container,
  Modification,
  Device,
  Weapon,
  Armor,
  Item,
  AbstractItem,
} from './entity/item';

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
  ItemState,
  ItemType as ItemSubtype,
  ContainerMixin,
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
  Weather,
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
  Transformer,
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
  EcologicalProfile,
  ECOLOGICAL_PROFILES,
  Biome,
  Climate,
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
  WeaponSchema as WeaponSpecification,
  WeaponAttackSpecification,
  WeaponTimers,
  WeaponRangeSpecification,
} from './schema/weapon';

export {
  SkillSchema,
} from './schema/skill';

export {
  ResourceSchema,
  BulkResourceSchema,
  SpecimenResourceSchema,
  ResourceGrowthRequirements,
  GrowthSpecification as GrowthBehaviorSpecification,
  ResourceStateRenderer,
  Season,
  TimeOfDay,
  LunarPhase,
} from './schema/resource';

export {
  ResourceGrowthCurve,
  ResourceNodes,
  ResourceNodeState,
  ResourceNodeStateWithTimestamp,
  ResourceGenerator,
} from './entity/resource';

// Taxonomy exports
export {
  AbilityURN,
  ActorURN,
  ArmorURN,
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
  SkillURN,
  StatURN,
  TAXONOMY,
  Taxonomy,
  TopicURN,
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
  AbstractFact,
  FactType,
  WorldEventMessageDictionary,
  ActorLocationFact,
  WorldEventFact,
  ViewFact,
  SystemFact,
  Fact,
} from './fact';

export {
  Template,
} from './template';

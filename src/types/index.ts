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
  CharacterAttributes,
  CharacterCondition,
  CharacterStatName,
  CharacterStats,
  Equipment,
  AppliedAnatomicalDamage as InjuryDescriptor,
  Inventory,
  Skills,
} from './entity/character';

export {
  Collection,
} from './entity/collection';

export {
  EmergentNarrative,
  Entity,
  EntityType,
  SymbolicLink,
  UUIDLike,
  BaseEntity,
  DescribableMixin,
  ParsedURN,
  LocallyUniqueId,
  parseURN,
  formatURN,
} from './entity/entity';

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
  PlaceScopedHistoricalEvent,
} from './entity/place';

export {
  CharacterSkillRecord,
  SkillState
} from './entity/skill';

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
  PotentiallyImpure as PotentiallyImpureOperations,
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

export {
  ContainerStrategy,
  ContainerCapacitySpecification,
  AbstractContainer,
  Bundle,
  ContainerSchema,
} from './schema/container';

export {
  SideEffect,
  SideEffectInput,
} from './side-effect';

export {
  AbilityURN,
  ArmorURN,
  CharacterURN,
  ConditionURN,
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
  createConditionUrn,
} from '~/lib/taxonomy';

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

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
  CharacterAttributes,
  CharacterCondition,
  CharacterStatName,
  CharacterStats,
  Equipment,
  InjuryDescriptor,
  Inventory,
  Skills,
} from './entity/character';

export {
  Collection,
  CollectionURN,
} from './entity/collection';

export {
  EmergentNarrative,
  Entity,
  EntityType,
  SymbolicLink,
  UUIDLike
} from './entity/entity';

export {
  ItemAttributes,
} from './entity/item';

export {
  Exit,
  Place,
  PlaceAttributes,
  PlaceEntities,
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
  VendorProjectionMixin,
  createCommandGuard,
  isCommandOfType,
} from './handler';

export {
  Command,
  CommandInput,
  CommandType,
  Intent,
  IntentInput,
  KnownCommand,
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
  SideEffect,
  SideEffectInput,
} from './side-effect';

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
} from '~/lib/taxonomy';

export {
  Direction,
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

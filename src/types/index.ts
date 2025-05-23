// Barrel export file for all types in the project
// This provides a clean API boundary and makes it easier to share types
// across multiple services in our MUD architecture if needed

export {
  MinimalWorldProjection,
  ExecutionError,
  ErrorDeclarationContainer,
  EventDeclarationConsumer,
  EventDeclarationProducer,
  SideEffectDeclarationContainer,
  TransformerContext,
  PlannerContext,
  PureReducerContext,
  PureReducer,
  InputTypeGuard,
  PureHandlerImplementation,
  PureHandlerInterface,
  CommandTypeGuard,
  TransformerImplementation,
  TransformerInterface,
  Transformer,
  createCommandGuard,
  isCommandOfType,
} from './handler';

export {
  Command,
  CommandInput,
  IntentInput,
  Intent,
  CommandType,
} from './intent';

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
  CharacterEffect,
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

export { ROOT_NAMESPACE } from './constants';

export {
  DieType,
  Modifier,
  RollResult,
  RollSpecification
} from './dice';

export {
  EmergentNarrative,
  Entity,
  EntityType,
  SymbolicLink,
  UUIDLike
} from './entity/entity';

export {
  AppliedEffect as Effect,
} from './effect';

export {
  EmergentEvent,
  EmergentEventInput,
  EventType,
  EventPayload,
} from './event';

export {
  ItemAttributes,
  ItemProvenanceEntry,
  ItemProvenanceEvent,
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
  TAXONOMY,
  Taxonomy,
  RootNamespace,
  RootVocabulary,
  EntityURN,
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
  URNLike,
} from './taxonomy';

export {
  Duration,
  SpecialDuration,
  TimeUnit,
} from './world/time';

export {
  SpecialVisibility,
} from './world/visibility';

export {
  Requirements,
} from './requirements';

export {
  TargetingSpecification,
  TargetType,
} from './combat';

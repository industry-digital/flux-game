// Movement templates
export type { ActorMovementProps } from './movement';
export { renderActorDidDepart, renderActorDidDepartNarrative } from './movement';

// Place templates
export type { PlaceTemplateProps, PlaceTemplate } from './place';
export { renderExits, renderPlaceDescription, renderPlaceSummary } from './place';

// Actor templates
export { renderActorSummary } from './actor';

// Materialization templates
export type { ActorMaterializationProps } from './materialization';
export { renderActorDidMaterialize, renderActorDidDematerialize } from './materialization';

export { describeWeatherChange } from './weather';

// Combat templates
export type { ColorStrategy } from './combat/battlefield-notation';
export {
  AnsiColors,
  ColorStrategies,
  renderBattlefieldNotation
} from './combat/battlefield-notation';

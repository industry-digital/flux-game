// Place entity utilities
export {
  createPlace,
  createExit,
  createPlaces,
  addActorToPlace,
  removeActorFromPlace,
  getExitDirection,
  isPlace,
} from './place';
export type { PlaceDictionary } from './place';

export * from './actor';

// Attribute utilities
export {
  createModifiableScalarAttribute,
  createModifiableBoundedAttribute
} from './attribute';

// Entity utilities
export {
  createEntity,
} from './util';

export type { EntityCreator, FactoryDependencies as FactoryOptions } from './util';

export * from '~/types';
export * from '~/lib/taxonomy';
export * from '~/worldkit/entity';
export * from '~/worldkit/view';
export * from '~/worldkit/event';
export * from '~/worldkit/graph/place';
export * from '~/worldkit/schema';
export * from '~/worldkit/combat';
export * from '~/worldkit/context';
export * from '~/worldkit/physics/mass';
export * from '~/worldkit/session';
export * from '~/worldkit/scenario';

export * from '~/types/i18n';
export * from '~/narrative';

export { profile, profileAsync } from '~/lib/profile';
export type { ProfileResult } from '~/lib/profile';

export {
  parseEntityUrn,
  parseEntityUrnOrFail,
  parseEntityUrnAs,
  getEntityUrn,
  getEntityUrnOrFail,
  isValidEntityUrn,
} from '~/lib/urn';

// Command type guards and utilities
export {
  isCommandOfType,
  createCommand,
  createActorCommand,
  createSystemCommand,
} from '~/lib/intent';

// Export command types
export {
  CreateActorCommand,
  CreatePlaceCommand,
  MaterializeActorCommand,
  DematerializeActorCommand,
  MoveCommand,
  MoveCommandArgs,
  MutateWeatherCommand,
  MutateResourcesCommand,
  LookCommand,
  LookCommandArgs,
} from '~/command';

export * from './intent';

// Export the pure game logic handlers DAG
export { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';

export * from '~/types';
export * from '~/lib/taxonomy';
export * from '~/types/i18n';
export * from '~/narrative';
export * from '~/worldkit';

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

export * from './testing/actors';

// Export the pure game logic handlers DAG
export { PURE_GAME_LOGIC_HANDLERS } from '~/handlers';

export {
  Command,
  CommandType,
  EventType,
  Intent,
  MinimalWorldProjection,
  PureHandlerImplementation,
  PureReducer,
  PureReducerContext,
} from '~/types';

import { MOVE } from '~/command/MOVE';

/**
 * Export all command handlers
 * The Flux World Server literally spreads this array into the Transformation stage
 */
export const handlers = [
  MOVE,
];

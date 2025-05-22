export { PureReducerContext, MinimalWorldStateProjection } from '~/types/domain';
export { EventType } from '~/types/event';
export { CommandType } from '~/types/intent';
import { MoveCommandHandler } from '~/command/MOVE/handler';

/**
 * Export all command handlers
 * The Flux World Server will use this to build the Transformation stage DAG
 */
export const handlers = [
  MoveCommandHandler,
];

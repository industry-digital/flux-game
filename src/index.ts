import { MoveCommandHandler } from '~/command/MOVE/handler';

export { EventType } from '~/types/event';

/**
 * Export all command handlers
 * The Flux World Server will use this to build the Transformation stage DAG
 */
export const handlers = [
  MoveCommandHandler,
];

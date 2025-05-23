export {
  Command,
  CommandType,
  EventType,
  Intent,
  MinimalWorldProjection,
  PureHandlerImplementation,
  PureReducer,
  PureReducerContext,
} from '@flux';

import { Command, PureHandlerImplementation, TransformerContext } from '@flux';
import { MOVE } from '~/command/MOVE';
import { safeTopologicalSort } from '~/lib/dag';

/**
 * Export all command handlers
 * The Flux World Server literally spreads this array into the Transformation stage
 * We perform a topological sort right here to ensure handler dependencies aren't problematic. If there is a cycle,
 * this line throws.
 */
// @ts-expect-error
export const PURE_GAME_LOGIC_HANDLERS: PureHandlerImplementation<TransformerContext, Command>[]
= safeTopologicalSort(
  [
    MOVE,
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

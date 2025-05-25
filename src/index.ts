export * from '@flux';

import { MOVE } from '~/command/MOVE';
import { safeTopologicalSort } from '~/lib/dag';

/**
 * The Flux World Server literally spreads this array into the Transformation stage.
 * We perform a topological sort right here to ensure handler dependencies aren't problematic; if there is a cycle,
 * this line will throw an error. Please preserve this behavior so that we catch problematic handlers early.
 */
// @ts-expect-error
export const PURE_GAME_LOGIC_HANDLERS: PureHandlerImplementation<TransformerContext, Command>[]
= safeTopologicalSort(
  [
    MOVE,
    // Add more handler implementations here...
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

/**
 * Pure Game Logic Handlers DAG
 *
 * This module contains the definitive list of all handlers in the system.
 * It's separate from index.ts to avoid circular dependencies with intent resolution.
 */

import { PureHandlerImplementation, TransformerContext } from '~/types/handler';
import { safeTopologicalSort } from '~/lib/dag';
import { CREATE_ACTOR } from '~/command/CREATE_ACTOR/handler';
import { CREATE_PLACE } from '~/command/CREATE_PLACE/handler';
import { MATERIALIZE_ACTOR } from '~/command/MATERIALIZE_ACTOR/handler';
import { DEMATERIALIZE_ACTOR } from '~/command/DEMATERIALIZE_ACTOR/handler';
import { MUTATE_WEATHER } from '~/command/MUTATE_WEATHER/handler';
import { MUTATE_RESOURCES } from '~/command/MUTATE_RESOURCES/handler';
import { ATTACK } from '~/command/ATTACK/handler';
import { DEFEND } from '~/command/DEFEND/handler';
import { ADVANCE } from '~/command/ADVANCE/handler';
import { RETREAT } from '~/command/RETREAT/handler';
import { TARGET } from '~/command/TARGET/handler';
import { LOOK } from '~/command/LOOK/handler';
import { STRIKE } from '~/command/STRIKE/handler';
import { CLEAVE } from '~/command/CLEAVE/handler';

/**
 * The Flux World Server literally spreads this array into the Transformation stage.
 * We perform a topological sort right here to ensure handler dependencies aren't problematic; if there is a cycle,
 * this line will throw an error. Please preserve this behavior so that we catch dependency issues immediately.
 */
export const PURE_GAME_LOGIC_HANDLERS: PureHandlerImplementation<TransformerContext, any>[]
= safeTopologicalSort(
  [
    ADVANCE,
    ATTACK,
    CLEAVE,
    CREATE_ACTOR,
    CREATE_PLACE,
    DEFEND,
    DEMATERIALIZE_ACTOR,
    LOOK,
    MATERIALIZE_ACTOR,
    MUTATE_RESOURCES,
    MUTATE_WEATHER,
    RETREAT,
    STRIKE,
    TARGET,
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

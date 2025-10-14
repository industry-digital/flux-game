/**
 * Pure Game Logic Handlers DAG
 *
 * This module contains the definitive list of all handlers in the system.
 * It's separate from index.ts to avoid circular dependencies with intent resolution.
 */

import { PureHandlerImplementation, TransformerContext } from '~/types/handler';
import { safeTopologicalSort } from '~/lib/dag';
import { CREATE_ACTOR } from '~/command/CREATE_ACTOR';
import { CREATE_PLACE } from '~/command/CREATE_PLACE';
import { MATERIALIZE_ACTOR } from '~/command/MATERIALIZE_ACTOR';
import { DEMATERIALIZE_ACTOR } from '~/command/DEMATERIALIZE_ACTOR';
import { MUTATE_WEATHER } from '~/command/MUTATE_WEATHER';
import { MUTATE_RESOURCES } from '~/command/MUTATE_RESOURCES';
import { ATTACK } from '~/command/ATTACK';
import { DEFEND } from '~/command/DEFEND';
import { ADVANCE } from '~/command/ADVANCE';
import { RETREAT } from '~/command/RETREAT';
import { TARGET } from '~/command/TARGET';
import { LOOK } from '~/command/LOOK';
import { STRIKE } from '~/command/STRIKE';
import { CLEAVE } from '~/command/CLEAVE';

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

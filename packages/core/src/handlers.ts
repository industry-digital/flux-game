/**
 * Pure Game Logic Handlers DAG
 *
 * This module contains the definitive list of all handlers in the system.
 * It's separate from index.ts to avoid circular dependencies with intent resolution.
 */

import { PureHandlerImplementation, TransformerContext } from '~/types/handler';
import { safeTopologicalSort } from '~/lib/dag';

import { ADVANCE } from '~/command/ADVANCE';
import { ATTACK } from '~/command/ATTACK';
import { CLEAVE } from '~/command/CLEAVE';
import { CREATE_ACTOR } from '~/command/CREATE_ACTOR';
import { CREATE_PLACE } from '~/command/CREATE_PLACE';
import { CREDIT } from '~/command/CREDIT';
import { DEBIT } from '~/command/DEBIT';
import { DEFEND } from '~/command/DEFEND';
import { DEMATERIALIZE_ACTOR } from '~/command/DEMATERIALIZE_ACTOR';
import { DONE } from '~/command/DONE';
import { LOOK } from '~/command/LOOK';
import { MATERIALIZE_ACTOR } from '~/command/MATERIALIZE_ACTOR';
import { MUTATE_RESOURCES } from '~/command/MUTATE_RESOURCES';
import { MUTATE_WEATHER } from '~/command/MUTATE_WEATHER';
import { PARTY_DISBAND } from '~/command/PARTY_DISBAND';
import { PARTY_STATUS } from '~/command/PARTY_STATUS';
import { PARTY_INVITE } from '~/command/PARTY_INVITE';
import { PARTY_INVITE_ACCEPT } from '~/command/PARTY_INVITE_ACCEPT';
import { PARTY_INVITE_REJECT } from '~/command/PARTY_INVITE_REJECT';
import { PARTY_KICK } from '~/command/PARTY_KICK';
import { PARTY_LEAVE } from '~/command/PARTY_LEAVE';
import { RANGE } from '~/command/RANGE';
import { RETREAT } from '~/command/RETREAT';
import { STRIKE } from '~/command/STRIKE';
import { TARGET } from '~/command/TARGET';
import { WORKBENCH_SHELL_ATTRIBUTE_ADD } from '~/command/WORKBENCH_SHELL_ATTRIBUTE_ADD';
import { WORKBENCH_SHELL_LIST } from '~/command/WORKBENCH_SHELL_LIST';
import { WORKBENCH_SHELL_RENAME } from '~/command/WORKBENCH_SHELL_RENAME';
import { WORKBENCH_SHELL_STATUS } from '~/command/WORKBENCH_SHELL_STATUS';
import { WORKBENCH_SHELL_SWAP } from '~/command/WORKBENCH_SHELL_SWAP';
import { WORKBENCH_USE } from '~/command/WORKBENCH_USE';

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
    CREDIT,
    DEBIT,
    DEFEND,
    DEMATERIALIZE_ACTOR,
    DONE,
    LOOK,
    MATERIALIZE_ACTOR,
    MUTATE_RESOURCES,
    MUTATE_WEATHER,
    PARTY_DISBAND,
    PARTY_STATUS,
    PARTY_INVITE,
    PARTY_INVITE_ACCEPT,
    PARTY_INVITE_REJECT,
    PARTY_KICK,
    PARTY_LEAVE,
    RANGE,
    RETREAT,
    STRIKE,
    TARGET,
    WORKBENCH_SHELL_ATTRIBUTE_ADD,
    WORKBENCH_SHELL_LIST,
    WORKBENCH_SHELL_RENAME,
    WORKBENCH_SHELL_STATUS,
    WORKBENCH_SHELL_SWAP,
    WORKBENCH_USE,
  ],
  (Handler) => Handler.prototype.dependencies ?? [],
);

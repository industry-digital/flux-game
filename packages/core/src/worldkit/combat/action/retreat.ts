/**
 * RETREAT Action Implementation
 *
 * Handles backward movement with defensive intent - away from threats, creating space, tactical withdrawal.
 * Uses the unified movement factory with BACKWARD direction and efficiency penalties.
 */

import { Actor } from '~/types/entity/actor';
import { Combatant, CombatSession, MovementDirection } from '~/types/combat';
import { WorldEvent } from '~/types/event';
import { MovementType } from '~/worldkit/combat/combatant';
import { TransformerContext } from '~/types/handler';
import { DEFAULT_MOVEMENT_DEPS } from './movement-deps';
import { createMovementMethod, MovementFactoryDependencies } from './factory/movement';

export type RetreatDependencies = MovementFactoryDependencies;
export const DEFAULT_RETREAT_DEPS = DEFAULT_MOVEMENT_DEPS;

export type MovementOptions = {
  autoDone?: boolean;
};

export type RetreatMethod = (by: MovementType, value: number, trace?: string, options?: MovementOptions) => WorldEvent[];

/**
 * Creates retreat method using the unified movement factory
 *
 * RETREAT moves opposite to the facing direction (backward movement) with 35% efficiency penalty.
 * This is a thin wrapper around the unified createMovementMethod factory.
 */
export function createRetreatMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: RetreatDependencies = DEFAULT_RETREAT_DEPS,
): RetreatMethod {
  // Use the unified movement factory with BACKWARD direction
  const moveMethod = createMovementMethod(
    context,
    session,
    actor,
    combatant,
    MovementDirection.BACKWARD,
    deps
  );

  return (by: MovementType, value: number, trace?: string, options?: MovementOptions) => {
    return moveMethod(by, value, trace, options);
  };
}

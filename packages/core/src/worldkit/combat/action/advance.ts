import { Actor } from '~/types/entity/actor';
import { Combatant, CombatSession, MovementDirection } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { WorldEvent } from '~/types/event';
import { MovementType } from '~/worldkit/combat/combatant';
import { DEFAULT_MOVEMENT_DEPS } from './movement-deps';
import { createMovementMethod, MovementFactoryDependencies } from './factory/movement';

export type AdvanceDependencies = MovementFactoryDependencies;
export const DEFAULT_ADVANCE_DEPS = DEFAULT_MOVEMENT_DEPS;

export type MovementOptions = {
  autoDone?: boolean;
};

export type AdvanceMethod = (by: MovementType, value: number, trace?: string, options?: MovementOptions) => WorldEvent[];

/**
 * Creates advance method using the unified movement factory
 *
 * ADVANCE moves in the facing direction (forward movement) with 100% efficiency.
 * This is a thin wrapper around the unified createMovementMethod factory.
 */
export function createAdvanceMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: AdvanceDependencies = DEFAULT_ADVANCE_DEPS,
): AdvanceMethod {
  // Use the unified movement factory with FORWARD direction
  const moveMethod = createMovementMethod(
    context,
    session,
    actor,
    combatant,
    MovementDirection.FORWARD,
    deps
  );

  return (by: MovementType, value: number, trace?: string, options?: MovementOptions) => {
    return moveMethod(by, value, trace, options);
  };
}

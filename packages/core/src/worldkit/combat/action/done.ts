import { Actor } from '~/types/entity/actor';
import { Combatant, CombatSession } from '~/types/combat';
import { WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { AdvanceTurnCallback } from '~/worldkit/combat/session/turn-manager';

export type DoneDependencies = {
  advanceTurn: AdvanceTurnCallback;
};

export type DoneMethod = (trace?: string) => WorldEvent[];

export const DEFAULT_DONE_DEPENDENCIES: DoneDependencies = {
  advanceTurn: () => {
    throw new Error('advanceTurn dependency not provided - ensure done method is created with proper dependencies');
  },
};

export function createDoneMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: DoneDependencies = DEFAULT_DONE_DEPENDENCIES,
): DoneMethod {
  if (!deps.advanceTurn) {
    throw new Error('advanceTurn is required');
  }

  return (trace: string = context.uniqid()): WorldEvent[] => {
    const events: WorldEvent[] = [];

    // Advance turn - this will handle resource recovery and emit COMBAT_TURN_DID_END
    // via the game state layer with complete AP/energy information
    const advancementEvents = deps.advanceTurn(trace);
    events.push(...advancementEvents);

    return events;
  };
}

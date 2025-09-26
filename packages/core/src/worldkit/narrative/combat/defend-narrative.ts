import { Actor } from '~/types/entity/actor';
import { Narrative } from '~/types/narrative';
import { ActionCost } from '~/types/combat';

/**
 * Generates narrative for COMBATANT_DID_DEFEND events
 */
export const renderDefendNarrative = (
  actor: Actor,
  cost: ActionCost,
): Narrative => {
  return {
    self: `You take a defensive stance, preparing to dodge incoming attacks.`,
    observer: `${actor.name} takes a defensive stance, preparing to dodge.`
  };
};

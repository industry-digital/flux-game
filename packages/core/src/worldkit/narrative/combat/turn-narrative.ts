import { Actor } from '~/types/entity/actor';
import { Narrative } from '~/types/narrative';
import { toPossessive } from '~/worldkit/narrative/util';

/**
 * Generates narrative for COMBAT_TURN_DID_END events
 */
export const renderTurnEndNarrative = (
  actor: Actor
): Narrative => {

  // Generate narrative for turn completion
  return {
    self: `Your turn has ended.`,
    observer: `${toPossessive(actor.name)} turn has ended.`
  };
};

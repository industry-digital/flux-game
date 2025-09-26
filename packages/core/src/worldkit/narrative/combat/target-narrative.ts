import { Actor } from '~/types/entity/actor';
import { Narrative } from '~/types/narrative';

/**
 * Generates narrative for COMBATANT_DID_ACQUIRE_TARGET events
 */
export const renderTargetNarrative = (
  targetActor: Actor
): Narrative => {
  const targetName = targetActor.name;

  return {
    self: `You are now targeting ${targetName}.`,
    // No observer narrative, as it is not visible to other actors
  };
};

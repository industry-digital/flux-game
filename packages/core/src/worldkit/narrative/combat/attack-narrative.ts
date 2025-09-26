import { Actor } from '~/types/entity/actor';
import { Narrative } from '~/types/narrative';
import { CombatantDidAttack } from '~/types/event';
import { WeaponSchema } from '~/types/schema/weapon';

/**
 * Generates narrative for COMBATANT_DID_ATTACK events
 */
export const renderAttackNarrative = (
  actor: Actor,
  targetActor: Actor,
  weapon: WeaponSchema,
  outcome: CombatantDidAttack['payload']['outcome'],
): Narrative => {

  // Get weapon information for context-aware narrative
  const weaponName = weapon?.name || 'weapon';
  const targetName = targetActor?.name || 'target';

  // Generate different narratives based on outcome
  switch (outcome) {
    case 'hit:critical':
      return {
        self: `Your ${weaponName} finds a critical opening in ${targetName}'s defenses!`,
        observer: `${actor.name}'s ${weaponName} strikes ${targetName} with devastating precision!`
      };

    case 'hit':
      return {
        self: `You strike ${targetName} with your ${weaponName}.`,
        observer: `${actor.name} strikes ${targetName} with ${actor.name === 'Alice' ? 'her' : 'his'} ${weaponName}.`
      };

    case 'miss:critical':
      return {
        self: `You swing wildly with your ${weaponName}, completely missing ${targetName}!`,
        observer: `${actor.name} swings ${actor.name === 'Alice' ? 'her' : 'his'} ${weaponName} wildly, missing ${targetName} entirely!`
      };

    case 'miss':
    default:
      return {
        self: `Your ${weaponName} fails to connect with ${targetName}.`,
        observer: `${actor.name}'s ${weaponName} fails to connect with ${targetName}.`
      };
  }
};

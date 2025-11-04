import { DEFAULT_LOCATION } from '~/testing/constants';
import { CombatFacing, CombatSession, Team } from '~/types/combat';
import { Actor } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { WeaponSchema } from '~/types/schema/weapon';
import { ActorURN } from '~/types/taxonomy';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { WorldScenarioHook } from '~/worldkit/scenario';

export type TestCombatSessionParticipant = {
  team: Team;
  position: { coordinate: number; facing: CombatFacing; speed: number };
  weapon?: WeaponSchema;
  hp?: Actor['hp'];
};

/**
 * Helper function to create a custom combat session for individual tests
 */
export const createTestCombatSession = (
  context: TransformerContext,
  scenario: WorldScenarioHook,
  participants: Record<ActorURN, TestCombatSessionParticipant>,
): CombatSession => {
  const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);

  // Add combatants to the session
  for (const [actorId, config] of Object.entries(participants)) {
    const actor = context.world.actors[actorId as ActorURN];
    if (!actor) {
      throw new Error(`Actor ${actorId} not found in world`);
    }

    // Clear any existing session assignment to allow the actor to join a new session
    actor.session = undefined;

    // Assign weapon if specified
    if (config.weapon) {
      scenario.assignWeapon(actor, config.weapon);
    }

    // Set HP if specified
    if (config.hp) {
      actor.hp = config.hp;
    }

    // Add combatant to session
    testSessionApi.addCombatant(actorId as ActorURN, config.team, config.position);
  }

  return testSessionApi.session;
}

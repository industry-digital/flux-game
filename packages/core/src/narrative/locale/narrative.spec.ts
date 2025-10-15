import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import {
  createCombatantDidAttackEvent,
  createCombatantWasAttackedEvent,
  createCombatantDidDieEvent,
  createCombatantDidDefendEvent,
  createCombatantDidAcquireTargetEvent,
  createCombatTurnDidStartEvent,
  createCombatTurnDidEndEvent,
} from '~/testing/event';
import { EventType, WorldEvent } from '~/types/event';
import { AttackOutcome, AttackType, Team } from '~/types/combat';
import { ActorURN } from '~/types/taxonomy';
import { SessionStatus } from '~/types/session';
import { ALICE_ID, BOB_ID } from '~/testing/constants';

// Import all locale implementations
import { en_US } from './en_US';

// Test data setup
const OBSERVER_ID: ActorURN = 'flux:actor:test:observer';


describe.each([
  { locale: 'en_US', templates: en_US },
  // Add more locales here as they're implemented
  // { locale: 'es_ES', templates: es_ES },
  // { locale: 'fr_FR', templates: fr_FR },
])('Narrative Templates - $locale', ({ locale, templates }) => {
  let context: ReturnType<typeof createTransformerContext>;
  let scenario: ReturnType<typeof useCombatScenario>;

  // Helper function to properly type template calls
  function callTemplate<T extends WorldEvent>(
    context: ReturnType<typeof createTransformerContext>,
    event: T,
    actorId: ActorURN
  ): string {
    const template = templates[event.type] as any;
    return template(context, event, actorId);
  }

  beforeEach(() => {
    context = createTransformerContext();

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test:sword',
      name: 'Test Sword',
    });

    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema]);

    scenario = useCombatScenario(context, {
      weapons: [swordSchema],
      schemaManager,
      participants: {
        [ALICE_ID]: {
          team: Team.ALPHA,
          stats: { pow: 50, fin: 50, res: 50 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        [BOB_ID]: {
          team: Team.BRAVO,
          stats: { pow: 30, fin: 30, res: 30 },
          position: { coordinate: 102, facing: -1, speed: 0 },
        },
        [OBSERVER_ID]: {
          team: Team.ALPHA,
          stats: { pow: 20, fin: 20, res: 20 },
          position: { coordinate: 95, facing: 1, speed: 0 },
        },
      },
    });
  });

  describe('Combat Events', () => {
    describe('COMBATANT_DID_ATTACK', () => {
      it('should render attack narrative from attacker perspective', () => {
        const event = createCombatantDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          },
        }));

        const narrative = callTemplate(context, event, ALICE_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('You attack');
        expect(narrative).toContain('Test Sword');
      });

      it('should render attack narrative from observer perspective', () => {
        const event = createCombatantDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
            cost: { ap: 2.5 },
            roll: { dice: '1d20', values: [15], mods: {}, natural: 15, result: 15 },
            attackRating: 75,
          },
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('attacks');
        expect(narrative).toContain('Test Sword');
      });

      it('should render cleave attack narrative differently', () => {
        const event = createCombatantDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.CLEAVE,
            cost: { ap: 4.0, energy: 500 },
            roll: { dice: '1d20', values: [18], mods: {}, natural: 18, result: 18 },
            attackRating: 85,
          },
        }));

        const narrative = callTemplate(context, event, ALICE_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('sweeping');
        expect(narrative).toContain('Test Sword');
      });
    });

    describe('COMBATANT_WAS_ATTACKED', () => {
      it('should render damage narrative from target perspective (hit)', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            type: AttackType.STRIKE,
            outcome: AttackOutcome.HIT,
            attackRating: 75,
            evasionRating: 45,
            damage: 12,
          },
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('strikes you');
        expect(narrative).toContain('12 damage');
        expect(narrative).toContain('Test Sword');
      });

      it('should render damage narrative from target perspective (miss)', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            type: AttackType.STRIKE,
            outcome: AttackOutcome.MISS,
            attackRating: 45,
            evasionRating: 75,
            damage: 0,
          },
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('misses you');
        expect(narrative).toContain('Test Sword');
      });

      it('should render damage narrative from observer perspective', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            type: AttackType.STRIKE,
            outcome: AttackOutcome.HIT,
            attackRating: 75,
            evasionRating: 45,
            damage: 8,
          },
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('deals');
        expect(narrative).toContain('8 damage');
        expect(narrative).toContain('Test Sword');
      });

      it('should return empty string for attacker (redundant narrative)', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            type: AttackType.STRIKE,
            outcome: AttackOutcome.HIT,
            attackRating: 75,
            evasionRating: 45,
            damage: 8,
          },
        }));

        const narrative = callTemplate(context, event, ALICE_ID);

        expect(narrative).toBe('');
      });
    });

    describe('COMBATANT_DID_DIE', () => {
      it('should render death narrative from victim perspective', () => {
        const event = createCombatantDidDieEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            actor: BOB_ID,
          },
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('You have died');
      });

      it('should render death narrative from observer perspective', () => {
        const event = createCombatantDidDieEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            actor: BOB_ID,
          },
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('has been killed');
      });
    });

    describe('COMBATANT_DID_DEFEND', () => {
      it('should render defend narrative from defender perspective', () => {
        const event = createCombatantDidDefendEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('You take a defensive stance');
      });

      it('should render defend narrative from observer perspective', () => {
        const event = createCombatantDidDefendEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('takes a defensive stance');
      });
    });

    describe('COMBATANT_DID_ACQUIRE_TARGET', () => {
      it('should render targeting narrative from attacker perspective', () => {
        const event = createCombatantDidAcquireTargetEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
          },
        }));

        const narrative = callTemplate(context, event, ALICE_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('You target');
      });

      it('should render targeting narrative from observer perspective', () => {
        const event = createCombatantDidAcquireTargetEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
          },
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(narrative).toContain('targets');
      });
    });
  });

  describe('Combat Session Events', () => {
    it('should render combat session start narrative', () => {
      const event = create((e) => ({
        id: 'test-event',
        type: EventType.COMBAT_SESSION_DID_START,
        location: 'flux:place:test',
        actor: 'flux:actor:system',
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          session: scenario.session.id,
          combatants: [
            [ALICE_ID, Team.ALPHA],
            [BOB_ID, Team.BRAVO],
          ],
        },
      };

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Combat begins');
    });

    it('should render combat session end narrative', () => {
      const event: WorldEvent = {
        id: 'test-event',
        type: EventType.COMBAT_SESSION_DID_END,
        location: 'flux:place:test',
        actor: 'flux:actor:system',
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          session: scenario.session.id,
          winningTeam: Team.ALPHA,
          finalRound: 3,
        },
      };

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Combat ends');
      expect(narrative).toContain('3 rounds');
      expect(narrative).toContain('Team ALPHA');
    });

    it('should render combat status change narrative', () => {
      const event: WorldEvent = {
        id: 'test-event',
        type: EventType.COMBAT_SESSION_STATUS_DID_CHANGE,
        location: 'flux:place:test',
        actor: 'flux:actor:system',
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          session: scenario.session.id,
          previousStatus: SessionStatus.PENDING,
          currentStatus: SessionStatus.RUNNING,
        },
      };

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Combat is now active');
    });
  });

  describe('Combat Turn Events', () => {
    it('should render turn start narrative from active player perspective', () => {
      const event = createCombatTurnDidStartEvent();

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Your turn begins');
    });

    it('should render turn start narrative from observer perspective', () => {
      const event = createCombatTurnDidStartEvent();

      const narrative = callTemplate(context, event, OBSERVER_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('turn begins');
    });

    it('should render turn end narrative with energy recovery', () => {
      const event = createCombatTurnDidEndEvent();

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Your turn has ended');
      expect(narrative).toContain('recovered 150 energy');
    });
  });

  describe('Combat Round Events', () => {
    it('should render round start narrative', () => {
      const event: WorldEvent = {
        id: 'test-event',
        type: EventType.COMBAT_ROUND_DID_START,
        location: 'flux:place:test',
        actor: 'flux:actor:system',
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          round: 2,
        },
      };

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Round 2 begins');
    });

    it('should render round end narrative', () => {
      const event: WorldEvent = {
        id: 'test-event',
        type: EventType.COMBAT_ROUND_DID_END,
        location: 'flux:place:test',
        actor: 'flux:actor:system',
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          round: 2,
        },
      };

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(narrative).toContain('Round 2 ends');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing actors gracefully', () => {
      const event = createCombatantDidAttackEvent((event) => ({
        ...event,
        actor: 'flux:actor:nonexistent' as ActorURN,
        payload: {
          ...event.payload,
          target: BOB_ID,
        },
      }));

      // Should not throw an error, even with missing actor
      expect(() => {
        callTemplate(context, event, OBSERVER_ID);
      }).not.toThrow();
    });

    it('should handle missing weapons gracefully', () => {
      // Remove weapon from attacker
      const attacker = context.world.actors[ALICE_ID];
      attacker.equipment = {};

      const event = createCombatantDidAttackEvent((event) => ({
        ...event,
        payload: {
          ...event.payload,
          target: BOB_ID,
        },
      }));

      // Should handle missing weapon gracefully (may throw or return default text)
      expect(() => {
        callTemplate(context, event, ALICE_ID);
      }).not.toThrow();
    });
  });
});

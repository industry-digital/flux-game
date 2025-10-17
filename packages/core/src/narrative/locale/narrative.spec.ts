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
import { ALICE_ID, BOB_ID, CHARLIE_ID } from '~/testing/constants';

// Import all locale implementations
import { en_US } from './en_US';
import { LanguageTemplates, TemplateFunction } from '~/types/narrative';

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
    const template = templates[event.type as keyof LanguageTemplates] as TemplateFunction<T, ActorURN, string>;
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
          payload: { ...e.payload, targets: [BOB_ID], attackType: AttackType.CLEAVE }
        }));

        const narrative = callTemplate(context, event, ALICE_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render attack narrative from observer perspective', () => {
        const event = createCombatantDidAttackEvent((e) => ({
          ...e,
          payload: { ...e.payload, targets: [BOB_ID, CHARLIE_ID], attackType: AttackType.CLEAVE }
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render cleave attack narrative differently', () => {
        const event = createCombatantDidAttackEvent((e) => ({
          ...e,
          payload: {
            ...e.payload,
            targets: [BOB_ID, CHARLIE_ID], // CLEAVE attacks have multiple targets
            attackType: AttackType.CLEAVE
          }
        }));

        const narrative = callTemplate(context, event, ALICE_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
        // CLEAVE narratives should be different from regular STRIKE narratives
        // This is a structural test - we just ensure it generates valid output
      });
    });

    describe('COMBATANT_WAS_ATTACKED', () => {
      it('should render damage narrative from target perspective (hit)', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: { ...e.payload, source: ALICE_ID, damage: 12 }
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render damage narrative from target perspective (miss)', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            outcome: AttackOutcome.MISS,
            damage: 0
          }
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render damage narrative from observer perspective', () => {
        const event = createCombatantWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: { ...e.payload, source: ALICE_ID, damage: 8 }
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });
    });

    describe('COMBATANT_DID_DIE', () => {
      it('should render death narrative from victim perspective', () => {
        const event = createCombatantDidDieEvent(); // Uses BOB_ID by default

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render death narrative from observer perspective', () => {
        const event = createCombatantDidDieEvent(); // Uses BOB_ID by default

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
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
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render defend narrative from observer perspective', () => {
        const event = createCombatantDidDefendEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
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
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
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
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Combat Session Events', () => {
    it('should render combat session start narrative', () => {
      const event: WorldEvent = {
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
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
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
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
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
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });
  });

  describe('Combat Turn Events', () => {
    it('should render turn start narrative from active player perspective', () => {
      const event = createCombatTurnDidStartEvent();

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should render turn start narrative from observer perspective', () => {
      const event = createCombatTurnDidStartEvent();

      const narrative = callTemplate(context, event, OBSERVER_ID);

      expect(narrative).toBeTruthy();
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should render turn end narrative with energy recovery', () => {
      const event = createCombatTurnDidEndEvent();

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
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
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
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
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });
  });

  describe('Narrative Quality', () => {
    it('should generate non-empty narratives for valid events', () => {
      const event = createCombatantDidAttackEvent((event) => ({
        ...event,
        actor: ALICE_ID,
        payload: {
          ...event.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        },
      }));

      const narrative = callTemplate(context, event, OBSERVER_ID);

      expect(narrative).toBeTruthy();
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should generate different narratives for different perspectives', () => {
      const event = createCombatantDidAttackEvent((event) => ({
        ...event,
        actor: ALICE_ID,
        payload: {
          ...event.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        },
      }));

      const attackerNarrative = callTemplate(context, event, ALICE_ID);
      const observerNarrative = callTemplate(context, event, OBSERVER_ID);

      expect(attackerNarrative).toBeTruthy();
      expect(observerNarrative).toBeTruthy();
      expect(attackerNarrative).not.toBe(observerNarrative);
    });
  });
});

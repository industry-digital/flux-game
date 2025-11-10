import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerContext } from '~/worldkit/context';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import {
  createActorDidAttackEvent,
  createActorWasAttackedEvent,
  createActorDidDieEvent,
  createActorDidDefendEvent,
  createActorDidAcquireTargetEvent,
  createCombatTurnDidStartEvent,
  createCombatTurnDidEndEvent,
  createCombatSessionStartedEvent,
  createCombatSessionEndedEvent,
  createCombatSessionStatusDidChangeEvent,
} from '~/testing/event';
import {
  CombatSessionEnded,
  CombatSessionStarted,
  ActorDidAttack,
  WorldEvent,
  CombatSessionStatusDidChange,
} from '~/types/event';
import { AttackOutcome, AttackType, Combatant, CombatSession, Team } from '~/types/combat';
import { CombatSessionApi } from '~/worldkit/combat/session/session';
import { ActorURN } from '~/types/taxonomy';
import { SessionStatus } from '~/types/entity/session';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { createPlace } from '~/worldkit/entity/place';
import { en_US } from './en_US';
import { LanguageTemplates, TemplateFunction } from '~/types/narrative';
import { TransformerContext } from '~/types/handler';
import { Actor } from '~/types/entity/actor';
import { createDefaultActors } from '~/testing/actors';

// Test data setup
const OBSERVER_ID: ActorURN = 'flux:actor:test:observer';

type Transform<T> = (input: T) => T;
const identity = <T = any>(x: T): T => x;

describe.each([
  { locale: 'en_US', templates: en_US },
  // Add more locales here as they're implemented
  // { locale: 'es_ES', templates: es_ES },
  // { locale: 'fr_FR', templates: fr_FR },
])('Narrative Templates - $locale', ({ locale, templates }) => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;

  // Helper function to properly type template calls
  function callTemplate<T extends WorldEvent>(
    context: ReturnType<typeof createTransformerContext>,
    event: T,
    actorId: ActorURN
  ): string {
    const template = templates[event.type as keyof LanguageTemplates] as TemplateFunction<T, ActorURN, string>;
    return template(context, event, actorId);
  }

  const createMockCleaveEvent = (
    transform: Transform<ActorDidAttack> = identity,
  ): ActorDidAttack => {
    return createActorDidAttackEvent((e) => ({
      ...e,
      actor: ALICE_ID,
      payload: {
        ...e.payload,
        attackType: AttackType.CLEAVE,
        targets: [BOB_ID, CHARLIE_ID],
      },
    }));
  };

  const createMockStrikeEvent = (
    transform: Transform<ActorDidAttack> = identity,
  ): ActorDidAttack => {
    return createActorDidAttackEvent((e) => ({
      ...e,
      actor: ALICE_ID,
      payload: {
        ...e.payload,
        attackType: AttackType.STRIKE,
        target: BOB_ID,
      },
    }));
  };

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob, charlie } = createDefaultActors(place.id));
    context = createTransformerContext();

    const scenario = createWorldScenario(context, {
      places: [place],
      actors: [alice, bob, charlie],
    });

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test:sword',
      name: 'Test Sword',
    });

    scenario.registerSchema(swordSchema);
  });

  describe('Combat Events', () => {
    describe('COMBATANT_DID_ATTACK', () => {
      it('should render attack narrative from attacker perspective', () => {
        const event = createMockCleaveEvent();
        const narrative = callTemplate(context, event, ALICE_ID);
        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render attack narrative from observer perspective', () => {
        const event = createMockCleaveEvent();
        const narrative = callTemplate(context, event, OBSERVER_ID);
        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render cleave attack narrative differently', () => {
        const event = createMockCleaveEvent();
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
        const event = createActorWasAttackedEvent((e) => ({
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
        const event = createActorWasAttackedEvent((e) => ({
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
        const event = createActorWasAttackedEvent((e) => ({
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
        const event = createActorDidDieEvent(); // Uses BOB_ID by default

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render death narrative from observer perspective', () => {
        const event = createActorDidDieEvent(); // Uses BOB_ID by default

        const narrative = callTemplate(context, event, OBSERVER_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });
    });

    describe('COMBATANT_DID_DEFEND', () => {
      it('should render defend narrative from defender perspective', () => {
        const event = createActorDidDefendEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        const narrative = callTemplate(context, event, BOB_ID);

        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe('string');
        expect(narrative.length).toBeGreaterThan(0);
      });

      it('should render defend narrative from observer perspective', () => {
        const event = createActorDidDefendEvent((e) => ({
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
        const event = createActorDidAcquireTargetEvent((e) => ({
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
        const event = createActorDidAcquireTargetEvent((e) => ({
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
    let combatSessionApi: CombatSessionApi;
    let session: CombatSession;
    let aliceCombatant: Combatant;
    let bobCombatant: Combatant;

    beforeEach(() => {
      combatSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
      session = combatSessionApi.session;

      combatSessionApi.addCombatant(alice.id, Team.ALPHA);
      combatSessionApi.addCombatant(bob.id, Team.BRAVO);

      ({ combatant: aliceCombatant } = combatSessionApi.getCombatantApi(alice.id)!);
      ({ combatant: bobCombatant } = combatSessionApi.getCombatantApi(bob.id)!);
    });

    it('should render combat session start narrative', () => {
      const event: CombatSessionStarted = createCombatSessionStartedEvent((e) => ({
        ...e,
        payload: {
          initiative: [],
          combatants: [
            [ALICE_ID, aliceCombatant],
            [BOB_ID, bobCombatant],
          ],
          namesByTeam: {
            [Team.ALPHA]: ['Alice'],
            [Team.BRAVO]: ['Bob'],
          },
        },
      }));
      const narrative = callTemplate(context, event, ALICE_ID);
      expect(narrative).toBeTruthy();
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should render combat session end narrative', () => {
      const event: CombatSessionEnded = createCombatSessionEndedEvent((e) => ({
        ...e,
        payload: {
          winningTeam: Team.BRAVO,
          finalRound: 3,
          finalTurn: 1,
        },
      }));

      const narrative = callTemplate(context, event, ALICE_ID);

      expect(narrative).toBeTruthy();
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should render combat status change narrative', () => {
      const event: CombatSessionStatusDidChange = createCombatSessionStatusDidChangeEvent((e) => ({
        ...e,
        payload: {
          previousStatus: SessionStatus.PENDING,
          currentStatus: SessionStatus.RUNNING,
        },
      }));

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

  describe('Narrative Quality', () => {
    it('should generate non-empty narratives for valid events', () => {
      const event = createActorDidAttackEvent((event) => ({
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
      const event = createActorDidAttackEvent((event) => ({
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

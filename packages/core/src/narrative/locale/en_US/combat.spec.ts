import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createWarhammerSchema } from '~/worldkit/schema/weapon/warhammer';
import { createCombatSession } from '~/worldkit/combat/session/session';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import {
  createActorDidAttackEvent,
  createActorWasAttackedEvent,
  createActorDidDefendEvent,
  createActorDidAcquireTargetEvent,
  createActorDidMoveInCombatEvent,
  createActorDidDieEvent,
} from '~/testing/event';
import { AttackType, Team, MovementDirection, CombatFacing, CombatSession } from '~/types/combat';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import {
  narrateActorDidAttack,
  narrateActorWasAttacked,
  narrateActorDidDefend,
  narrateActorDidMoveInCombat,
  narrateActorDidAcquireTarget,
  narrateActorDidDie,
} from './combat';
import { Actor } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { createPlace } from '~/worldkit/entity/place';
import { createDefaultActors } from '~/testing/actors';
import { createCombatant } from '~/worldkit/combat/combatant';
import { setStatValue } from '~/worldkit/entity/actor/stats';
import { Stat } from '~/types/entity/actor';
import { EMPTY_NARRATIVE } from '~/narrative/constants';
import { ActorDidAttack, ActorDidDefend, ActorDidDie } from '~/types/event';

/**
 * Combat Narrative Tests - Two-Perspective Model
 *
 * Tests verify that templates generate BOTH perspectives correctly.
 * Perspective selection (self vs observer) is handled by the server,
 * not by templates, so we test narrative generation in isolation.
 */
describe('Combat Narratives - Two-Perspective Model', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;
  let session: CombatSession;

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob, charlie } = createDefaultActors(place.id));

    context = createTransformerContext();
    scenario = createWorldScenario(context, {
      places: [place],
      actors: [alice, bob, charlie],
    });

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test:sword',
      name: 'sword',
    });

    const warhammerSchema = createWarhammerSchema({
      urn: 'flux:schema:weapon:test:warhammer',
      name: 'warhammer',
    });

    scenario.assignWeapon(alice, swordSchema);
    scenario.assignWeapon(bob, swordSchema);
    scenario.assignWeapon(charlie, warhammerSchema);

    session = createCombatSession(context, {
      location: place.id,
      combatants: [
        createCombatant(alice, Team.ALPHA, (c) => ({
          ...c,
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
        })),
        createCombatant(bob, Team.BRAVO, (c) => ({
          ...c,
          position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 },
        })),
        createCombatant(charlie, Team.BRAVO, (c) => ({
          ...c,
          position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
        })),
      ],
    });
  });

  describe('narrateActorDidAttack', () => {
    describe('STRIKE attacks', () => {
      it('generates both self and observer perspectives', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative).toEqual({
          self: 'You slash Bob with your sword.',
          observer: 'Alice slashes Bob with her sword.'
        });
    });

      it('uses power-biased verbs when POW > FIN', () => {
        // Set Alice to be power-focused
        setStatValue(alice, Stat.POW, 70);
        setStatValue(alice, Stat.FIN, 30);

      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative.self).toContain('hack');
        expect(narrative.observer).toContain('hacks');
    });

      it('uses finesse-biased verbs when FIN > POW', () => {
        // Set Alice to be finesse-focused
        setStatValue(alice, Stat.POW, 30);
        setStatValue(alice, Stat.FIN, 70);

      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative.self).toContain('slash');
        expect(narrative.observer).toContain('slashes');
    });

      it('returns NO_NARRATIVE when actor is missing', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
          actor: 'flux:actor:nonexistent' as any,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative).toEqual(EMPTY_NARRATIVE);
    });

      it('returns NO_NARRATIVE when target is missing', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
            target: 'flux:actor:nonexistent' as any,
          attackType: AttackType.STRIKE,
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative).toEqual(EMPTY_NARRATIVE);
      });
    });

    describe('CLEAVE attacks', () => {
      it('generates narrative for multi-target cleave', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          attackType: AttackType.CLEAVE,
          targets: [BOB_ID, CHARLIE_ID],
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative.self).toBe('You sweep your sword at Bob and Charlie.');
        expect(narrative.observer).toBe('Alice sweeps her sword at Bob and Charlie.');
    });

      it('generates narrative for cleave with no targets', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          attackType: AttackType.CLEAVE,
            targets: [],
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative).toEqual(EMPTY_NARRATIVE);
    });

      it('generates wide arc narrative when cleave misses all targets', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
          actor: CHARLIE_ID,
        payload: {
          ...e.payload,
          attackType: AttackType.CLEAVE,
            targets: [],
        }
      }));

        const narrative = narrateActorDidAttack(context, event);

        expect(narrative).toEqual(EMPTY_NARRATIVE);
      });
    });
  });

  describe('narrateActorWasAttacked', () => {
    it('generates damage descriptions for all perspectives', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 10,
          attackRating: 15,
          evasionRating: 12,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event);

      expect(narrative.self).toContain('You');
      expect(narrative.self).toContain('10 damage');
      expect(narrative.observer).toContain('Alice');
      expect(narrative.observer).toContain('Bob');
      expect(narrative.observer).toContain('10 damage');
    });

    it('generates miss narrative when damage is 0', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,  // Bob is the victim
        payload: {
          ...e.payload,
          source: ALICE_ID,  // Alice is the attacker
          damage: 0,
          attackRating: 12,
          evasionRating: 15,  // Diff of 3 = easy evade (not close call)
        }
      }));

      const narrative = narrateActorWasAttacked(context, event);

      // Bob (the victim/event actor) sees himself evading in self perspective
      expect(narrative.self).toMatch(/dodge|evade/);
      expect(narrative.self).toContain("Alice's");
      // Observers see Alice missing Bob
      expect(narrative.observer).toContain('misses');
      expect(narrative.observer).toContain('Bob');
    });

    it('returns NO_NARRATIVE when actors are missing', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as any,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 10,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });
  });

  describe('narrateActorDidDefend', () => {
    it('generates defensive stance narrative', () => {
      const event = createActorDidDefendEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidDefend(context, event);

      expect(narrative).toEqual({
        self: 'You take a defensive stance.',
        observer: 'Alice takes a defensive stance.'
      });
    });
  });

  describe('narrateActorDidMoveInCombat', () => {
    it('generates movement narrative with distance and direction', () => {
      const event = createActorDidMoveInCombatEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          distance: 3,
          direction: MovementDirection.FORWARD,
          from: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          to: { coordinate: 103, facing: CombatFacing.RIGHT, speed: 0 },
        }
      }));

      const narrative = narrateActorDidMoveInCombat(context, event);

      expect(narrative.self).toContain('forward');
      expect(narrative.self).toContain('3m');
      expect(narrative.observer).toContain('Alice');
      expect(narrative.observer).toContain('forward');
      expect(narrative.observer).toContain('3m');
    });

    it('uses finesse-appropriate movement verbs', () => {
      // High finesse actor
      setStatValue(alice, Stat.FIN, 70);

      const event = createActorDidMoveInCombatEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          distance: 3,
          direction: MovementDirection.FORWARD,
          from: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          to: { coordinate: 103, facing: CombatFacing.RIGHT, speed: 0 },
        }
      }));

      const narrative = narrateActorDidMoveInCombat(context, event);

      expect(narrative.self).toContain('dash');
      expect(narrative.observer).toContain('dashes');
    });
  });

  describe('narrateActorDidAcquireTarget', () => {
    it('generates targeting narrative', () => {
      const event = createActorDidAcquireTargetEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
        }
      }));

      const narrative = narrateActorDidAcquireTarget(context, event);

      expect(narrative).toEqual({
        self: 'You target Bob.',
        observer: 'Alice targets Bob.'
      });
    });

    it('returns NO_NARRATIVE when actors are missing', () => {
      const event = createActorDidAcquireTargetEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: 'flux:actor:nonexistent' as any,
        }
      }));

      const narrative = narrateActorDidAcquireTarget(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });
  });

  describe('narrateActorDidDie', () => {
    it('generates death narrative', () => {
      const event = createActorDidDieEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidDie(context, event);

      expect(narrative).toEqual({
        self: 'You have died!',
        observer: 'Bob has been killed!'
      });
    });
  });

  describe('Narrative quality validation', () => {
    it('generates non-empty narratives for valid events', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event);

      expect(narrative.self).toBeTruthy();
      expect(narrative.observer).toBeTruthy();
      expect(narrative.self.length).toBeGreaterThan(0);
      expect(narrative.observer.length).toBeGreaterThan(0);
    });

    it('differentiates between self and observer perspectives', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event);

      // Self uses first-person
      expect(narrative.self).toMatch(/^You /);

      // Observer uses third-person with actor name
      expect(narrative.observer).toContain('Alice');
      expect(narrative.observer).not.toMatch(/^You /);
      });

    it('maintains consistent narrative structure across events', () => {
      const events = [
        createActorDidAttackEvent((e) => ({ ...e, actor: ALICE_ID, payload: { ...e.payload, target: BOB_ID, attackType: AttackType.STRIKE }})),
        createActorDidDefendEvent((e) => ({ ...e, actor: ALICE_ID })),
        createActorDidDieEvent((e) => ({ ...e, actor: ALICE_ID })),
      ];

      const narratives = [
        narrateActorDidAttack(context, events[0] as ActorDidAttack),
        narrateActorDidDefend(context, events[1] as ActorDidDefend),
        narrateActorDidDie(context, events[2] as ActorDidDie),
      ];

      // All narratives should have both perspectives
      narratives.forEach(narrative => {
        expect(narrative).toHaveProperty('self');
        expect(narrative).toHaveProperty('observer');
        expect(typeof narrative.self).toBe('string');
        expect(typeof narrative.observer).toBe('string');
      });
    });
  });
});

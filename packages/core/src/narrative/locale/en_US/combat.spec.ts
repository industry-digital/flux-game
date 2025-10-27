import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createDaggerSchema } from '~/worldkit/schema/weapon/dagger';
import { createWarhammerSchema } from '~/worldkit/schema/weapon/warhammer';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import {
  createActorDidAttackEvent,
  createActorWasAttackedEvent,
  createActorDidDefendEvent,
  createActorDidAcquireTargetEvent,
  createActorDidMoveInCombatEvent,
  createActorDidDieEvent,
} from '~/testing/event';
import { AttackOutcome, AttackType, Team, MovementDirection } from '~/types/combat';
import { ActorURN } from '~/types/taxonomy';
import { ALICE_ID, BOB_ID, CHARLIE_ID } from '~/testing/constants';
import {
  withObjectSerializationValidation,
  withDebuggingArtifactValidation,
  withNonEmptyValidation,
  withNarrativeQuality,
  withPerspectiveDifferentiation,
  withComposedValidation,
} from '~/testing/narrative-quality';

// Import the specific narrative functions we're testing
import {
  narrateActorDidAttack,
  narrateActorWasAttacked,
  narrateActorDidDefend,
  narrateActorDidMoveInCombat,
  narrateActorDidAcquireTarget,
  narrateActorDidDie,
  narrateActorDidAssessRange,
} from './combat';
import { Gender } from '~/types/entity/actor';

const OBSERVER_ID: ActorURN = 'flux:actor:test:observer';
const DAVID_ID: ActorURN = 'flux:actor:test:david';

describe('English Combat Narratives - Snapshot Tests', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let scenario: ReturnType<typeof useCombatScenario>;

  beforeEach(() => {
    context = createTransformerContext();

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test:sword',
      name: 'Test Sword',
    });

    const daggerSchema = createDaggerSchema({
      urn: 'flux:schema:weapon:test:dagger',
      name: 'Test Dagger',
    });

    const warhammerSchema = createWarhammerSchema({
      urn: 'flux:schema:weapon:test:warhammer',
      name: 'Test Warhammer',
    });

    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema, daggerSchema, warhammerSchema]);

    scenario = useCombatScenario(context, {
      weapons: [swordSchema, daggerSchema, warhammerSchema],
      schemaManager,
      participants: {
        [ALICE_ID]: {
          team: Team.ALPHA,
          name: 'Alice',
          gender: Gender.FEMALE,
          stats: { pow: 50, fin: 50, res: 50 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        [BOB_ID]: {
          team: Team.BRAVO,
          name: 'Bob',
          stats: { pow: 30, fin: 30, res: 30 },
          equipment: { weapon: daggerSchema.urn },
          position: { coordinate: 102, facing: -1, speed: 0 },
        },
        [CHARLIE_ID]: {
          team: Team.BRAVO,
          name: 'Charlie',
          stats: { pow: 40, fin: 40, res: 40 },
          equipment: { weapon: warhammerSchema.urn },
          position: { coordinate: 105, facing: -1, speed: 0 },
        },
        [OBSERVER_ID]: {
          team: Team.ALPHA,
          name: 'Observer',
          stats: { pow: 20, fin: 20, res: 20 },
          position: { coordinate: 95, facing: 1, speed: 0 },
        },
        [DAVID_ID]: {
          team: Team.ALPHA,
          name: 'David',
          stats: { pow: 70, fin: 20, res: 50 },
          equipment: { weapon: warhammerSchema.urn },
          position: { coordinate: 98, facing: 1, speed: 0 },
        },
      },
    });
  });

  describe('narrateActorDidAttack - STRIKE attacks', () => {
    it('should render exact attack narrative from attacker perspective', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [15], natural: 15, result: 15, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, ALICE_ID);
      expect(narrative).toBe('You slash Bob with your sword.');
    });

    it('should render exact attack narrative from target perspective', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [10], natural: 10, result: 10, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, BOB_ID);
      expect(narrative).toBe('Alice slashes you with her sword.');
    });

    it('should render exact attack narrative from observer perspective', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [10], natural: 10, result: 10, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice slashes Bob with her sword.');
    });

    it('should render exact high roll attack narrative', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [18], natural: 18, result: 18, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice slashes Bob with her sword.');
    });

    it('should render exact low roll attack narrative', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [5], natural: 5, result: 5, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice slashes Bob with her sword.');
    });

    it('should render exact power-focused attack narrative', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: DAVID_ID, // High power, low finesse
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [15], natural: 15, result: 15, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('David crushes Bob with his warhammer.');
    });

    it('should render exact finesse-focused attack narrative', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: BOB_ID, // Lower power, balanced finesse
        payload: {
          ...e.payload,
          target: ALICE_ID,
          attackType: AttackType.STRIKE,
          roll: { dice: '1d20', values: [15], natural: 15, result: 15, bonus: 0 },
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob stabs Alice with his dagger.');
    });
  });

  describe('narrateActorDidAttack - CLEAVE attacks', () => {
    it('should render exact cleave attack from attacker perspective', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          targets: [BOB_ID, CHARLIE_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, ALICE_ID);
      expect(narrative).toBe('You sweep your sword at Bob and Charlie.');
    });

    it('should render exact cleave attack from target perspective', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          targets: [BOB_ID, CHARLIE_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, BOB_ID);
      expect(narrative).toBe('Alice sweeps her sword at Bob and Charlie.');
    });

    it('should render exact cleave attack from observer perspective with single target', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          targets: [BOB_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice sweeps her sword at Bob.');
    });

    it('should render exact cleave attack from observer perspective with two targets', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          targets: [BOB_ID, CHARLIE_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice sweeps her sword at Bob and Charlie.');
    });

    it('should render exact cleave attack from observer perspective with multiple targets', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          targets: [BOB_ID, CHARLIE_ID, DAVID_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice sweeps her sword at Bob, Charlie, and David.');
    });

    it('should render exact warhammer cleave attack', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: DAVID_ID, // Has warhammer (IMPACT damage)
        payload: {
          ...e.payload,
          targets: [BOB_ID, CHARLIE_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('David swings his warhammer at Bob and Charlie.');
    });

    it('should render exact dagger cleave attack', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: BOB_ID, // Has dagger (PIERCE damage)
        payload: {
          ...e.payload,
          targets: [ALICE_ID],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob drives his dagger at Alice.');
    });
  });

  describe('renderWasAttackedNarrative - Hit scenarios', () => {
    it('should render exact devastating damage from target perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 25, // High damage relative to typical HP
          outcome: AttackOutcome.HIT,
          attackRating: 80,
          evasionRating: 45,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, BOB_ID);
      expect(narrative).toBe('You are wounded severely by the sword for 25 damage.');
    });

    it('should render exact severe wound from target perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 12, // Moderate damage
          outcome: AttackOutcome.HIT,
          attackRating: 75,
          evasionRating: 50,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, BOB_ID);
      expect(narrative).toBe('You are struck by the sword for 12 damage.');
    });

    it('should render exact regular hit from target perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 5, // Light damage
          outcome: AttackOutcome.HIT,
          attackRating: 70,
          evasionRating: 55,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, BOB_ID);
      expect(narrative).toBe('You are struck by the sword for 5 damage.');
    });

    it('should render exact graze from target perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 1, // Minimal damage
          outcome: AttackOutcome.HIT,
          attackRating: 65,
          evasionRating: 60,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, BOB_ID);
      expect(narrative).toBe('You are grazed by the sword for 1 damage.');
    });

    it('should render exact hit from attacker perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 10,
          outcome: AttackOutcome.HIT,
          attackRating: 75,
          evasionRating: 50,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, ALICE_ID);
      expect(narrative).toBe('You hit Bob with your sword for 10 damage.');
    });

    it('should render exact hit from observer perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 8,
          outcome: AttackOutcome.HIT,
          attackRating: 75,
          evasionRating: 50,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice hits Bob with the sword for 8 damage.');
    });
  });

  describe('renderWasAttackedNarrative - Miss scenarios', () => {
    it('should render exact close miss from target perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 0,
          outcome: AttackOutcome.MISS,
          attackRating: 70,
          evasionRating: 72, // Close call
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, BOB_ID);
      expect(narrative).toBe('You narrowly dodges the sword.');
    });

    it('should render exact easy dodge from target perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 0,
          outcome: AttackOutcome.MISS,
          attackRating: 60,
          evasionRating: 80, // Easy dodge
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, BOB_ID);
      expect(narrative).toBe('You easily evades the sword.');
    });

    it('should render exact miss from attacker perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 0,
          outcome: AttackOutcome.MISS,
          attackRating: 65,
          evasionRating: 75,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, ALICE_ID);
      expect(narrative).toBe('You misses Bob completely with your sword.');
    });

    it('should render exact miss from observer perspective', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: ALICE_ID,
          damage: 0,
          outcome: AttackOutcome.MISS,
          attackRating: 65,
          evasionRating: 75,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice misses Bob with the sword.');
    });
  });

  describe('narrateActorDidDefend', () => {
    it('should render exact defense from defender perspective', () => {
      const event = createActorDidDefendEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidDefend(context, event, BOB_ID);
      expect(narrative).toBe('You take a defensive stance.');
    });

    it('should render exact defense from observer perspective', () => {
      const event = createActorDidDefendEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidDefend(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob takes a defensive stance.');
    });
  });

  describe('narrateActorDidMoveInCombat', () => {
    it('should render exact long distance movement', () => {
      const event = createActorDidMoveInCombatEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          distance: 5,
          direction: MovementDirection.FORWARD,
          from: { coordinate: 100, facing: 1, speed: 0 },
          to: { coordinate: 105, facing: 1, speed: 0 },
        }
      }));

      const narrative = narrateActorDidMoveInCombat(context, event, ALICE_ID);
      expect(narrative).toBe('You sprint forward 5m to close distance.');
    });

    it('should render exact short distance movement', () => {
      const event = createActorDidMoveInCombatEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          distance: 1,
          direction: MovementDirection.BACKWARD,
          from: { coordinate: 102, facing: -1, speed: 0 },
          to: { coordinate: 101, facing: -1, speed: 0 },
        }
      }));

      const narrative = narrateActorDidMoveInCombat(context, event, BOB_ID);
      expect(narrative).toBe('You shift backward 1m.');
    });

    it('should render exact movement from observer perspective', () => {
      const event = createActorDidMoveInCombatEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          distance: 3,
          direction: MovementDirection.FORWARD,
          from: { coordinate: 100, facing: 1, speed: 0 },
          to: { coordinate: 103, facing: 1, speed: 0 },
        }
      }));

      const narrative = narrateActorDidMoveInCombat(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice sprints forward 3m to close distance.');
    });
  });

  describe('narrateActorDidAcquireTarget', () => {
    it('should render exact targeting from attacker perspective', () => {
      const event = createActorDidAcquireTargetEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
        },
      }));

      const narrative = narrateActorDidAcquireTarget(context, event, ALICE_ID);
      expect(narrative).toBe('You target Bob.');
    });

    it('should render exact targeting from observer perspective', () => {
      const event = createActorDidAcquireTargetEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: BOB_ID,
        },
      }));

      const narrative = narrateActorDidAcquireTarget(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice targets Bob.');
    });
  });

  describe('narrateActorDidDie', () => {
    it('should render exact death from victim perspective', () => {
      const event = createActorDidDieEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidDie(context, event, BOB_ID);
      expect(narrative).toBe('You have died!');
    });

    it('should render exact death from observer perspective', () => {
      const event = createActorDidDieEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidDie(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob has been killed!');
    });
  });

  describe('narrateActorDidAssessRange', () => {
    it('should render exact range assessment from assessor perspective', () => {
      const event = {
        id: 'test-event',
        type: 'ACTOR_DID_ASSESS_RANGE' as any,
        location: 'flux:place:test' as any,
        actor: ALICE_ID,
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          target: BOB_ID,
          range: 3,
          direction: MovementDirection.FORWARD,
        },
      };

      const narrative = narrateActorDidAssessRange(context, event, ALICE_ID);
      expect(narrative).toBe('Bob is 3m away, in front of you.\nYour sword\'s optimal range is 1m.');
    });

    it('should render exact range assessment with backward direction', () => {
      const event = {
        id: 'test-event',
        type: 'ACTOR_DID_ASSESS_RANGE' as any,
        location: 'flux:place:test' as any,
        actor: ALICE_ID,
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          target: BOB_ID,
          range: 2,
          direction: MovementDirection.BACKWARD,
        },
      };

      const narrative = narrateActorDidAssessRange(context, event, ALICE_ID);
      expect(narrative).toBe('Bob is 2m away, behind you.\nYour sword\'s optimal range is 1m.');
    });

    it('should render exact range assessment from observer perspective', () => {
      const event = {
        id: 'test-event',
        type: 'ACTOR_DID_ASSESS_RANGE' as any,
        location: 'flux:place:test' as any,
        actor: ALICE_ID,
        trace: 'test-trace',
        ts: Date.now(),
        payload: {
          target: BOB_ID,
          range: 4,
          direction: MovementDirection.FORWARD,
        },
      };

      const narrative = narrateActorDidAssessRange(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice is range to Bob (4m).');
    });
  });

  describe('Error handling', () => {
    it('should return empty string for missing actors', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
        payload: {
          ...e.payload,
          target: BOB_ID,
          attackType: AttackType.STRIKE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing target', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: 'flux:actor:nonexistent' as ActorURN,
          attackType: AttackType.STRIKE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for cleave with no targets', () => {
      const event = createActorDidAttackEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          targets: [],
          attackType: AttackType.CLEAVE,
        }
      }));

      const narrative = narrateActorDidAttack(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing attacker in damage narrative', () => {
      const event = createActorWasAttackedEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          source: 'flux:actor:nonexistent' as ActorURN,
          damage: 10,
        }
      }));

      const narrative = narrateActorWasAttacked(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing target in acquire target', () => {
      const event = createActorDidAcquireTargetEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          target: 'flux:actor:nonexistent' as ActorURN,
        },
      }));

      const narrative = narrateActorDidAcquireTarget(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });
  });

  describe('Narrative Quality Validation', () => {
    describe('narrateActorDidAttack - Quality validation', () => {
      it('should not contain [object Object] in STRIKE attack narratives', () => {
        const event = createActorDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        const perspectives = [ALICE_ID, BOB_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withObjectSerializationValidation(narrateActorDidAttack, context, event, perspective)();
        });
      });

      it('should not contain [object Object] in CLEAVE attack narratives', () => {
        const event = createActorDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            targets: [BOB_ID, CHARLIE_ID],
            attackType: AttackType.CLEAVE,
          }
        }));

        const perspectives = [ALICE_ID, BOB_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withObjectSerializationValidation(narrateActorDidAttack, context, event, perspective)();
        });
      });

      it('should pass comprehensive quality validation with different weapon types', () => {
        const swordEvent = createActorDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID, // Has sword
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        const daggerEvent = createActorDidAttackEvent((e) => ({
          ...e,
          actor: BOB_ID, // Has dagger
          payload: {
            ...e.payload,
            target: ALICE_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        const warhammerEvent = createActorDidAttackEvent((e) => ({
          ...e,
          actor: DAVID_ID, // Has warhammer
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        // Test all events with comprehensive quality validation
        [swordEvent, daggerEvent, warhammerEvent].forEach(event => {
          withNarrativeQuality(narrateActorDidAttack, context, event, OBSERVER_ID)();
        });
      });

      it('should generate different narratives for different perspectives', () => {
        const event = createActorDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        withPerspectiveDifferentiation(narrateActorDidAttack, context, event, [ALICE_ID, BOB_ID, OBSERVER_ID])();
      });
    });

    describe('narrateActorWasAttacked - Quality validation', () => {
      it('should pass quality validation for hit narratives', () => {
        const event = createActorWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            damage: 10,
            outcome: AttackOutcome.HIT,
          }
        }));

        const perspectives = [BOB_ID, ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorWasAttacked, context, event, perspective)();
        });
      });

      it('should pass quality validation for miss narratives', () => {
        const event = createActorWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            damage: 0,
            outcome: AttackOutcome.MISS,
          }
        }));

        const perspectives = [BOB_ID, ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorWasAttacked, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidDefend - Quality validation', () => {
      it('should pass quality validation for defense narratives', () => {
        const event = createActorDidDefendEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        const perspectives = [BOB_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidDefend, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidMoveInCombat - Quality validation', () => {
      it('should pass quality validation for movement narratives', () => {
        const event = createActorDidMoveInCombatEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            distance: 3,
            direction: MovementDirection.FORWARD,
          }
        }));

        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidMoveInCombat, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidAcquireTarget - Quality validation', () => {
      it('should pass quality validation for targeting narratives', () => {
        const event = createActorDidAcquireTargetEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
          },
        }));

        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidAcquireTarget, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidDie - Quality validation', () => {
      it('should pass quality validation for death narratives', () => {
        const event = createActorDidDieEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        const perspectives = [BOB_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidDie, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidAssessRange - Quality validation', () => {
      it('should pass quality validation for range assessment narratives', () => {
        const event = {
          id: 'test-event',
          type: 'ACTOR_DID_ASSESS_RANGE' as any,
          location: 'flux:place:test' as any,
          actor: ALICE_ID,
          trace: 'test-trace',
          ts: Date.now(),
          payload: {
            target: BOB_ID,
            range: 3,
            direction: MovementDirection.FORWARD,
          },
        };

        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidAssessRange, context, event, perspective)();
        });
      });
    });

    describe('Composed quality validation', () => {
      it('should pass all quality checks with composed validators', () => {
        const event = createActorDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        // Demonstrate composition of validators
        const composedValidator = withComposedValidation(
          withObjectSerializationValidation,
          withDebuggingArtifactValidation,
          withNonEmptyValidation
        );

        composedValidator(narrateActorDidAttack, context, event, OBSERVER_ID)();
      });

      it('should validate perspective differentiation across all narrative functions', () => {
        const attackEvent = createActorDidAttackEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            target: BOB_ID,
            attackType: AttackType.STRIKE,
          }
        }));

        withPerspectiveDifferentiation(narrateActorDidAttack, context, attackEvent, [ALICE_ID, BOB_ID, OBSERVER_ID])();

        const wasAttackedEvent = createActorWasAttackedEvent((e) => ({
          ...e,
          actor: BOB_ID,
          payload: {
            ...e.payload,
            source: ALICE_ID,
            damage: 10,
            outcome: AttackOutcome.HIT,
          }
        }));

        withPerspectiveDifferentiation(narrateActorWasAttacked, context, wasAttackedEvent, [BOB_ID, ALICE_ID, OBSERVER_ID])();
      });
    });
  });
});

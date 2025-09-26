import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeBattlefield,
  assessWeaponCapabilities,
  evaluatePositioning,
  calculateDistanceCategory,
  createTacticalSituationFactory
} from './analysis';
import { CombatSession, Combatant, CombatFacing, Team } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { WeaponSchema } from '~/types/schema/weapon';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createBowSchema } from '~/worldkit/schema/weapon/bow';
import { createSpearSchema } from '~/worldkit/schema/weapon/spear';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { ActorURN } from '~/types/taxonomy';

describe('Tactical Analysis', () => {
  let context: TransformerContext;
  let session: CombatSession;
  let combatant: Combatant;
  let weapon: WeaponSchema;
  let targetCombatant: Combatant;

  beforeEach(() => {
    context = createTransformerContext();

    // Create ranged weapon with 10m optimal, 5m falloff, 20m max to match original test setup
    const rangedWeapon = createBowSchema({
      urn: 'flux:schema:weapon:test-ranged',
      name: 'Test Ranged Weapon',
    });
    // Override the default range values after creation
    rangedWeapon.range = { optimal: 10, falloff: 5, max: 20 };

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [rangedWeapon]);

    const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
    const TARGET_ID: ActorURN = 'flux:actor:test:target';

    const scenario = useCombatScenario(context, {
      weapons: [rangedWeapon],
      schemaManager,
      participants: {
        [ATTACKER_ID]: {
          team: Team.ALPHA,
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          ap: { nat: { cur: 6.0, max: 6.0 }, eff: { cur: 6.0, max: 6.0 }, mods: {} },
          energy: { position: 0.8, energy: 15000 },
          equipment: { weapon: rangedWeapon.urn },
        },
        [TARGET_ID]: {
          team: Team.BRAVO,
          position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
        }
      },
    });

    session = scenario.session;
    combatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
    targetCombatant = scenario.session.data.combatants.get(TARGET_ID)!;
    weapon = rangedWeapon;
  });

  describe('analyzeBattlefield', () => {
    it('should create tactical situation with valid targets', () => {
      const situation = analyzeBattlefield(context, session, combatant, weapon);

      expect(situation.combatant).toBe(combatant);
      expect(situation.session).toBe(session);
      expect(situation.weapon).toBe(weapon);
      expect(situation.validTargets).toHaveLength(1);
      expect(situation.validTargets[0].actorId).toBe(targetCombatant.actorId);
      expect(situation.validTargets[0].distance).toBe(5);
    });

    it('should reproduce death match scenario - reach weapons at 2m distance', () => {
      // Create reach weapon with 2m optimal range
      const reachWeapon = createSpearSchema({
        urn: 'flux:schema:weapon:test-reach',
        name: 'Test Reach Weapon',
      });

      // Register weapons with the schema manager
      registerWeapons(context.schemaManager, [reachWeapon]);

      const ALICE_ID: ActorURN = 'flux:actor:test:alice';
      const BOB_ID: ActorURN = 'flux:actor:test:bob';

      const scenario = useCombatScenario(context, {
        weapons: [reachWeapon],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 174, facing: CombatFacing.RIGHT, speed: 0 },
            ap: { nat: { cur: 6.0, max: 6.0 }, eff: { cur: 6.0, max: 6.0 }, mods: {} },
            equipment: { weapon: reachWeapon.urn },
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 176, facing: CombatFacing.LEFT, speed: 0 },
            ap: { nat: { cur: 6.0, max: 6.0 }, eff: { cur: 6.0, max: 6.0 }, mods: {} },
          }
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const bobCombatant = scenario.session.data.combatants.get(BOB_ID)!;

      // Analyze battlefield from attacker's perspective
      const aliceSituation = analyzeBattlefield(
        context,
        scenario.session,
        aliceCombatant,
        reachWeapon
      );

      // This should find defender as a valid target at 2m distance
      expect(aliceSituation.validTargets).toHaveLength(1);
      expect(aliceSituation.validTargets[0].actorId).toBe(bobCombatant.actorId);
      expect(aliceSituation.validTargets[0].distance).toBe(2);
      expect(aliceSituation.validTargets[0].isInRange).toBe(true);

      // Attacker should be able to attack defender
      expect(aliceSituation.assessments.primaryTarget).toBe(bobCombatant.actorId);
      expect(aliceSituation.assessments.canAttack).toBe(true);
    });

    it('should assess resource state correctly', () => {
      const situation = analyzeBattlefield(context, session, combatant, weapon);

      expect(situation.resources.ap.current).toBe(6.0);
      expect(situation.resources.ap.max).toBe(6.0);
      expect(situation.resources.energy.current).toBe(10000);
      expect(situation.resources.energy.max).toBe(10000);
    });

    it('should determine if combatant can attack', () => {
      // Set explicit target for combatant
      const combatantWithTarget = { ...combatant, target: targetCombatant.actorId };

      // Target within range, sufficient AP
      const situation = analyzeBattlefield(context, session, combatantWithTarget, weapon);
      expect(situation.assessments.canAttack).toBe(true);

      // Insufficient AP
      const lowApCombatant = {
        ...combatantWithTarget,
        ap: { ...combatantWithTarget.ap, eff: { cur: 1.0, max: 6.0 } }
      };
      const lowApSituation = analyzeBattlefield(context, session, lowApCombatant, weapon);
      expect(lowApSituation.assessments.canAttack).toBe(false);
    });

    it('should identify need for repositioning', () => {
      // Set explicit target for combatant
      const combatantWithTarget = { ...combatant, target: targetCombatant.actorId };

      // Target at 5m, optimal range is 10m - should need repositioning
      const situation = analyzeBattlefield(context, session, combatantWithTarget, weapon);
      expect(situation.assessments.needsRepositioning).toBe(true);

      // Target at optimal range - should not need repositioning
      const optimalCombatant = {
        ...combatantWithTarget,
        position: { ...combatantWithTarget.position, coordinate: 95 }
      };

      // Update the combatant in the session to reflect the new position
      session.data.combatants.set(optimalCombatant.actorId, optimalCombatant);

      const optimalSituation = analyzeBattlefield(context, session, optimalCombatant, weapon);
      expect(optimalSituation.assessments.needsRepositioning).toBe(false);
    });
  });

  describe('assessWeaponCapabilities', () => {
    it.each([
      { distance: 5, expectedEffectiveness: 1.0, description: 'within optimal range' },
      { distance: 15, expectedEffectiveness: 0.5, description: 'one falloff range beyond optimal' },
      { distance: 20, expectedEffectiveness: 0, description: 'at max range' },
      { distance: 30, expectedEffectiveness: 0, description: 'beyond effective range' },
    ])('should assess ranged weapon effectiveness $description', ({ distance, expectedEffectiveness }) => {
      const assessment = assessWeaponCapabilities(context, weapon, distance);

      expect(assessment.effectiveness).toBeCloseTo(expectedEffectiveness, 2);
      expect(assessment.optimalDistance).toBe(10);
      expect(assessment.isOptimalRange).toBe(distance <= 10);
    });

    it('should categorize distances correctly', () => {
      const meleeAssessment = assessWeaponCapabilities(context, weapon, 1);
      expect(meleeAssessment.distanceCategory).toBe('melee');

      const closeAssessment = assessWeaponCapabilities(context, weapon, 3);
      expect(closeAssessment.distanceCategory).toBe('close');

      const mediumAssessment = assessWeaponCapabilities(context, weapon, 10);
      expect(mediumAssessment.distanceCategory).toBe('medium');

      const longAssessment = assessWeaponCapabilities(context, weapon, 20);
      expect(longAssessment.distanceCategory).toBe('long');
    });

    it('should handle melee weapons correctly', () => {
      const meleeWeapon = createSwordSchema({
        urn: 'flux:schema:weapon:test-melee',
        name: 'Test Melee Weapon',
        range: { optimal: 1, max: 1 }
      });

      const inRangeAssessment = assessWeaponCapabilities(context, meleeWeapon, 1);
      expect(inRangeAssessment.canHit).toBe(true);
      expect(inRangeAssessment.effectiveness).toBe(1.0);

      const outOfRangeAssessment = assessWeaponCapabilities(context, meleeWeapon, 2);
      expect(outOfRangeAssessment.canHit).toBe(false);
      expect(outOfRangeAssessment.effectiveness).toBe(0);
    });

    it('should handle reach weapons correctly', () => {
      const reachWeapon = createSpearSchema({
        urn: 'flux:schema:weapon:test-reach-2',
        name: 'Test Reach Weapon 2',
      });

      const optimalAssessment = assessWeaponCapabilities(context, reachWeapon, 2);
      expect(optimalAssessment.canHit).toBe(true);
      expect(optimalAssessment.effectiveness).toBe(1.0);

      const tooCloseAssessment = assessWeaponCapabilities(context, reachWeapon, 1);
      expect(tooCloseAssessment.canHit).toBe(false);
      expect(tooCloseAssessment.effectiveness).toBe(0);

      const tooFarAssessment = assessWeaponCapabilities(context, reachWeapon, 3);
      expect(tooFarAssessment.canHit).toBe(false);
      expect(tooFarAssessment.effectiveness).toBe(0);
    });
  });

  describe('evaluatePositioning', () => {
    it('should evaluate current position advantage', () => {
      const assessment = evaluatePositioning(context, session, combatant, targetCombatant.actorId);

      expect(assessment.currentAdvantage).toBeGreaterThan(0);
      expect(assessment.potentialPositions).toBeDefined();
      expect(assessment.shouldReposition).toBeDefined();
    });

    it('should recommend repositioning when advantageous', () => {
      // Create scenario where repositioning would be beneficial
      const farTarget = { ...targetCombatant, position: { ...targetCombatant.position, coordinate: 150 } };
      session.data.combatants.set(farTarget.actorId, farTarget);

      const assessment = evaluatePositioning(context, session, combatant, farTarget.actorId);

      expect(assessment.potentialPositions.length).toBeGreaterThan(0);
      // Should have positions with different advantage scores
      const advantages = assessment.potentialPositions.map(p => p.advantage);
      expect(Math.max(...advantages)).toBeGreaterThan(Math.min(...advantages));
    });

    it('should handle null target gracefully', () => {
      const assessment = evaluatePositioning(context, session, combatant, null);

      expect(assessment.currentAdvantage).toBe(0);
      expect(assessment.potentialPositions).toHaveLength(0);
      expect(assessment.shouldReposition).toBe(false);
      expect(assessment.bestPosition).toBe(null);
    });
  });

  describe('calculateDistanceCategory', () => {
    it.each([
      { distance: 0.5, expected: 'melee' },
      { distance: 1, expected: 'melee' },
      { distance: 3, expected: 'close' },
      { distance: 5, expected: 'close' },
      { distance: 10, expected: 'medium' },
      { distance: 15, expected: 'medium' },
      { distance: 20, expected: 'long' },
      { distance: 50, expected: 'long' },
    ])('should categorize distance $distance as $expected', ({ distance, expected }) => {
      expect(calculateDistanceCategory(distance)).toBe(expected);
    });
  });

  describe('createTacticalSituationFactory', () => {
    it('should create factory with create and update methods', () => {
      const factory = createTacticalSituationFactory(context);

      expect(factory.create).toBeDefined();
      expect(factory.update).toBeDefined();
    });

    it('should create tactical situation via factory', () => {
      const factory = createTacticalSituationFactory(context);
      const situation = factory.create(session, combatant, weapon);

      expect(situation.combatant).toBe(combatant);
      expect(situation.session).toBe(session);
      expect(situation.weapon).toBe(weapon);
    });

    it('should update tactical situation via factory', () => {
      const factory = createTacticalSituationFactory(context);
      const initialSituation = factory.create(session, combatant, weapon);

      const newCombatant = { ...combatant, ap: { ...combatant.ap, eff: { cur: 3.0, max: 6.0 } } };
      const updatedSituation = factory.update(initialSituation, { combatant: newCombatant });

      expect(updatedSituation.resources.ap.current).toBe(3.0);
      expect(updatedSituation.weapon).toBe(weapon); // Should preserve weapon
    });
  });
});

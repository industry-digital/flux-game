import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCleaveMethod } from './cleave';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { extractEventsByType } from '../../../testing/event/parsing';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { CombatantDidAttack, CombatantDidDie, CombatantWasAttacked, EventType } from '~/types/event';
import { Team } from '~/types/combat';
import { createCleaveCost } from '~/worldkit/combat/tactical-cost';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { Stat } from '~/types/entity/actor';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { getCurrentEnergy, setEnergy } from '~/worldkit/entity/actor/capacitor';
import { createWeaponSchema } from '~/worldkit/schema/weapon';

describe('Cleave Method', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let cleave: ReturnType<typeof createCleaveMethod>;
  let mockComputeActorMass: ReturnType<typeof vi.fn>;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const TARGET1_ID: ActorURN = 'flux:actor:test:target1';
  const TARGET2_ID: ActorURN = 'flux:actor:test:target2';
  const TARGET3_ID: ActorURN = 'flux:actor:test:target3';
  const ALLY_ID: ActorURN = 'flux:actor:test:ally';
  const FAR_TARGET_ID: ActorURN = 'flux:actor:test:far_target';

  let twoHandedSwordSchema: ReturnType<typeof createWeaponSchema>;
  let oneHandedSwordSchema: ReturnType<typeof createWeaponSchema>;

  beforeEach(() => {
    mockComputeActorMass = vi.fn().mockReturnValue(70000); // 70kg in grams

    context = createTransformerContext();
    context.mass.computeActorMass = mockComputeActorMass;
    context.declareEvent = vi.fn();
    context.declareError = vi.fn();

    // Create a two-handed weapon schema (like spear)
    twoHandedSwordSchema = createWeaponSchema({
      urn: 'flux:schema:weapon:test:twohanded',
      name: 'Two-Handed Test Sword',
      baseMass: 3000, // 3kg weapon
      range: {
        optimal: 2,
        max: 2,
      },
      fit: {
        [HumanAnatomy.LEFT_HAND]: 1,
        [HumanAnatomy.RIGHT_HAND]: 1,
      },
    });

    // Create a one-handed weapon for negative testing
    oneHandedSwordSchema = createWeaponSchema({
      urn: 'flux:schema:weapon:test:onehanded',
      name: 'One-Handed Test Sword',
      baseMass: 1500, // 1.5kg weapon
      range: {
        optimal: 2,
        max: 2,
      },
      fit: {
        [HumanAnatomy.RIGHT_HAND]: 1,
      },
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [twoHandedSwordSchema, oneHandedSwordSchema]);

    scenario = useCombatScenario(context, {
      weapons: [twoHandedSwordSchema, oneHandedSwordSchema],
      schemaManager,
      participants: {
        [ATTACKER_ID]: {
          team: Team.ALPHA,
          stats: { pow: 50, fin: 50, res: 50 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          equipment: { weapon: twoHandedSwordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        [TARGET1_ID]: {
          team: Team.BRAVO,
          stats: { pow: 30, fin: 30, res: 30 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          position: { coordinate: 102, facing: -1, speed: 0 }, // 2m away, at reach weapon range
        },
        [TARGET2_ID]: {
          team: Team.BRAVO,
          stats: { pow: 30, fin: 30, res: 30 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          position: { coordinate: 102, facing: -1, speed: 0 }, // 2m away, at reach weapon range
        },
        [TARGET3_ID]: {
          team: Team.BRAVO,
          stats: { pow: 30, fin: 30, res: 30 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          position: { coordinate: 102, facing: -1, speed: 0 }, // 2m away, at reach weapon range
        },
        [ALLY_ID]: {
          team: Team.ALPHA, // Same team as attacker
          stats: { pow: 30, fin: 30, res: 30 },
          position: { coordinate: 102, facing: -1, speed: 0 }, // At reach weapon range but ally
        },
        [FAR_TARGET_ID]: {
          team: Team.BRAVO,
          stats: { pow: 30, fin: 30, res: 30 },
          position: { coordinate: 110, facing: -1, speed: 0 }, // 10m away, out of optimal range
        },
      },
    });

    const attacker = scenario.actors[ATTACKER_ID];
    const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;


    // Ensure attacker has sufficient energy
    setEnergy(attacker.actor, 15000); // Plenty of energy for testing

    cleave = createCleaveMethod(
      context,
      scenario.session,
      attacker.actor,
      attackerCombatant,
    );
  });

  describe('Basic Functionality', () => {
    it('should perform cleave attack on multiple targets at optimal range', () => {
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      const initialAP = attackerCombatant.ap.eff.cur;
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const initialEnergy = getCurrentEnergy(attacker);

      const result = cleave();

      // Should have 1 attack event (cleave action) and 3 damage events (one per target)
      const attackEvents = extractEventsByType<CombatantDidAttack>(result, EventType.COMBATANT_DID_ATTACK);
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      expect(attackEvents).toHaveLength(1); // Single cleave attack
      expect(damageEvents).toHaveLength(3); // Hit 3 targets

      // Verify AP was consumed
      expect(attackerCombatant.ap.eff.cur).toBeLessThan(initialAP);

      // Verify energy was consumed
      expect(getCurrentEnergy(attacker)).toBeLessThan(initialEnergy);

      // Verify all damage events are for different targets
      const targetIds = damageEvents.map(e => e.actor);
      expect(targetIds).toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
      expect(targetIds).not.toContain(ALLY_ID); // Should not hit ally
      expect(targetIds).not.toContain(FAR_TARGET_ID); // Should not hit far target
    });

    it('should create properly structured COMBATANT_DID_ATTACK events with correct cost distribution', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;

      const result = cleave();
      const attackEvents = extractEventsByType<CombatantDidAttack>(result, EventType.COMBATANT_DID_ATTACK);
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      // Should have 1 attack event and 3 damage events
      expect(attackEvents).toHaveLength(1);
      expect(damageEvents).toHaveLength(3);

      // Attack event should show the total cost
      const attackEvent = attackEvents[0];
      expect(attackEvent.payload.cost.ap).toBeGreaterThan(0);
      expect(attackEvent.payload.cost.energy).toBeGreaterThan(0);

      // Attack event should have proper structure (attacker's perspective)
      expect(attackEvent).toMatchObject({
        type: EventType.COMBATANT_DID_ATTACK,
        location: attacker.location,
        actor: attacker.id,
        payload: expect.objectContaining({
          target: expect.any(String),
          attackType: 'cleave',
          cost: expect.objectContaining({
            ap: expect.any(Number),
            energy: expect.any(Number),
          }),
          roll: expect.any(Object),
          attackRating: expect.any(Number),
        }),
      });

      // Damage events should have proper structure (targets' perspective)
      damageEvents.forEach(damageEvent => {
        expect(damageEvent).toMatchObject({
          type: EventType.COMBATANT_WAS_ATTACKED,
          actor: expect.any(String), // Target actor
          payload: expect.objectContaining({
            source: attacker.id,
            type: 'cleave',
            outcome: expect.any(String),
            attackRating: expect.any(Number),
            evasionRating: expect.any(Number),
            damage: expect.any(Number),
          }),
        });
      });

      // Should declare 1 attack event + 3 damage events = 4 total
      expect(context.declareEvent).toHaveBeenCalledTimes(4);
    });
  });

  describe('Requirements Validation', () => {
    it('should fail when no weapon is equipped', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      // Remove weapon by clearing equipment
      attacker.equipment = {};

      const cleaveWithoutWeapon = createCleaveMethod(
        context,
        scenario.session,
        attacker,
        attackerCombatant,
      );

      const result = cleaveWithoutWeapon();

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        'You don\'t have a weapon equipped.',
        expect.any(String)
      );
    });

    it('should fail when weapon is not two-handed', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      // Switch to one-handed weapon by updating the equipment directly
      // Need to ensure the weapon is actually equipped, not just set in the equipment object
      const oneHandedWeapon = context.inventoryApi.addItem(attacker, {
        schema: oneHandedSwordSchema.urn
      });
      // Clear existing equipment first
      const currentWeapon = context.equipmentApi.getEquippedWeapon(attacker);
      if (currentWeapon) {
        context.equipmentApi.unequipWeapon(attacker, currentWeapon);
      }
      // Equip the one-handed weapon
      context.equipmentApi.equipWeapon(attacker, oneHandedWeapon.id as any);

      const cleaveWithOneHanded = createCleaveMethod(
        context,
        scenario.session,
        attacker,
        attackerCombatant,
      );

      const result = cleaveWithOneHanded();

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        'CLEAVE requires a two-handed weapon.',
        expect.any(String)
      );
    });

    it('should fail when no enemies are at optimal range', () => {
      // Move all enemies out of optimal range
      const target1Combatant = scenario.session.data.combatants.get(TARGET1_ID)!;
      const target2Combatant = scenario.session.data.combatants.get(TARGET2_ID)!;
      const target3Combatant = scenario.session.data.combatants.get(TARGET3_ID)!;

      target1Combatant.position.coordinate = 110; // Far away
      target2Combatant.position.coordinate = 110; // Far away
      target3Combatant.position.coordinate = 110; // Far away

      const result = cleave();

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        'No enemies at optimal weapon range for CLEAVE.',
        expect.any(String)
      );
    });

    it('should fail when insufficient AP', () => {
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      // Reduce AP to insufficient amount
      attackerCombatant.ap.eff.cur = 1;

      const result = cleave();

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringMatching(/CLEAVE would cost [\d.]+ AP \(you have 1 AP\)\./),
        expect.any(String)
      );
    });

    it('should fail when insufficient energy', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;

      // Reduce energy to insufficient amount
      setEnergy(attacker, 100); // Very low energy

      const result = cleave();

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringMatching(/CLEAVE would cost \d+ energy \(you don't have enough stamina\)\./),
        expect.any(String)
      );
    });
  });

  describe('Cost Calculation', () => {
    it('should use same AP cost as STRIKE with energy cost added', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const weapon = context.equipmentApi.getEquippedWeaponSchema(attacker)!;
      const weaponMassKg = weapon.baseMass / 1000;
      const finesse = getStatValue(attacker, Stat.FIN);

      // Calculate expected cost
      const expectedCost = createCleaveCost(weaponMassKg, finesse, 3);

      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      const initialAP = attackerCombatant.ap.eff.cur;
      const initialEnergy = getCurrentEnergy(attacker);

      const result = cleave();

      // Verify AP cost matches expected
      const finalAP = attackerCombatant.ap.eff.cur;
      const actualApCost = initialAP - finalAP;
      expect(actualApCost).toBeCloseTo(expectedCost.ap!, 10);

      // Verify energy cost matches expected
      const finalEnergy = getCurrentEnergy(attacker);
      const actualEnergyCost = initialEnergy - finalEnergy;
      expect(actualEnergyCost).toBeCloseTo(expectedCost.energy!, 10);

      // Verify first attack event shows the total cost
      const attackEvents = extractEventsByType<CombatantDidAttack>(result, EventType.COMBATANT_DID_ATTACK);
      expect(attackEvents[0].payload.cost.ap).toBe(expectedCost.ap);
      expect(attackEvents[0].payload.cost.energy).toBe(expectedCost.energy);
    });

    it('should demonstrate energy cost scaling with weapon mass', () => {
      // Test with different weapon masses to verify energy scaling
      const testCases = [
        { weaponMassKg: 1.0, description: 'light weapon' },
        { weaponMassKg: 2.0, description: 'medium weapon' },
        { weaponMassKg: 3.0, description: 'heavy weapon' },
      ];

      for (const testCase of testCases) {
        const cost = createCleaveCost(testCase.weaponMassKg, 50, 2);

        // Energy should scale with weapon mass (base 200 + 100 per kg)
        const expectedEnergy = 200 + (testCase.weaponMassKg * 100);
        expect(cost.energy).toBe(expectedEnergy);

        // AP should be same as STRIKE (no energy scaling affects AP)
        expect(cost.ap).toBeGreaterThan(0);
      }
    });
  });

  describe('Target Selection', () => {
    it('should only hit enemies at optimal range', () => {
      const result = cleave();
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      // Should hit exactly 3 targets (all enemies at optimal range)
      expect(damageEvents).toHaveLength(3);

      const targetIds = damageEvents.map(e => e.actor);
      expect(targetIds).toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
    });

    it('should not hit allies even if at optimal range', () => {
      const result = cleave();
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      const targetIds = damageEvents.map(e => e.actor);
      expect(targetIds).not.toContain(ALLY_ID);
    });

    it('should not hit enemies outside optimal range', () => {
      const result = cleave();
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      const targetIds = damageEvents.map(e => e.actor);
      expect(targetIds).not.toContain(FAR_TARGET_ID);
    });

    it('should work with single target at optimal range', () => {
      // Move all but one target out of range
      const target2Combatant = scenario.session.data.combatants.get(TARGET2_ID)!;
      const target3Combatant = scenario.session.data.combatants.get(TARGET3_ID)!;

      target2Combatant.position.coordinate = 110; // Far away
      target3Combatant.position.coordinate = 110; // Far away

      const result = cleave();
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      expect(damageEvents).toHaveLength(1);
      expect(damageEvents[0].actor).toBe(TARGET1_ID);
    });
  });

  describe('Death Event Integration', () => {
    it('should emit death events when cleave kills targets', () => {
      // Set targets to very low HP
      const target1Actor = context.world.actors[TARGET1_ID];
      const target2Actor = context.world.actors[TARGET2_ID];

      target1Actor.hp.eff.cur = 1;
      target2Actor.hp.eff.cur = 1;

      // Mock high damage to ensure kills
      const mockCalculateWeaponDamage = vi.fn().mockReturnValue(50);
      const mockResolveHitAttempt = vi.fn().mockReturnValue({
        evaded: false,
        evasionChance: 0.1,
        efficiency: 1.0,
        ratingDifference: -10,
        rngValue: 0.5
      });

      const attacker = scenario.actors[ATTACKER_ID];
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      const cleaveWithMocks = createCleaveMethod(
        context,
        scenario.session,
        attacker.actor,
        attackerCombatant,
        {
          calculateWeaponDamage: mockCalculateWeaponDamage,
          resolveHitAttempt: mockResolveHitAttempt,
        }
      );

      const result = cleaveWithMocks();

      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);
      const deathEvents = extractEventsByType<CombatantDidDie>(result, EventType.COMBATANT_DID_DIE);

      expect(damageEvents).toHaveLength(3); // 3 damage events
      expect(deathEvents).toHaveLength(2); // 2 deaths (target1 and target2)

      const deadTargets = deathEvents.map(e => e.actor);
      expect(deadTargets).toContain(TARGET1_ID);
      expect(deadTargets).toContain(TARGET2_ID);
    });

    it('should not emit death events when targets survive', () => {
      // Set targets to high HP
      const target1Actor = context.world.actors[TARGET1_ID];
      const target2Actor = context.world.actors[TARGET2_ID];
      const target3Actor = context.world.actors[TARGET3_ID];

      target1Actor.hp.eff.cur = 100;
      target2Actor.hp.eff.cur = 100;
      target3Actor.hp.eff.cur = 100;

      const result = cleave();

      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);
      const deathEvents = extractEventsByType<CombatantDidDie>(result, EventType.COMBATANT_DID_DIE);

      expect(damageEvents).toHaveLength(3); // 3 damage events
      expect(deathEvents).toHaveLength(0); // No deaths
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to all events', () => {
      const customTrace = 'custom-cleave-trace-123';

      const result = cleave(customTrace);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(event => {
        expect(event.trace).toBe(customTrace);
      });
    });

    it('should use generated trace when none provided', () => {
      const generatedTrace = 'generated-cleave-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = cleave();

      expect(result.length).toBeGreaterThan(0);
      result.forEach(event => {
        expect(event.trace).toBe(generatedTrace);
      });
      expect(context.uniqid).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle dead targets gracefully', () => {
      // Kill one target before cleave
      const target1Actor = context.world.actors[TARGET1_ID];
      target1Actor.hp.eff.cur = 0;

      const result = cleave();
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      // Should only hit living targets
      expect(damageEvents).toHaveLength(2);
      const targetIds = damageEvents.map(e => e.actor);
      expect(targetIds).not.toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
    });

    it('should handle missing combatants gracefully', () => {
      // Remove a combatant from the session
      scenario.session.data.combatants.delete(TARGET1_ID);

      const result = cleave();
      const damageEvents = extractEventsByType<CombatantWasAttacked>(result, EventType.COMBATANT_WAS_ATTACKED);

      // Should still work with remaining targets
      expect(damageEvents).toHaveLength(2);
      const targetIds = damageEvents.map(e => e.actor);
      expect(targetIds).not.toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
    });
  });
});

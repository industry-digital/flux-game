import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCleaveMethod } from './cleave';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { CombatantDidAttack, CombatantDidDie, EventType, WorldEvent } from '~/types/event';
import { Team } from '~/types/combat';
import { createCleaveCost } from '~/worldkit/combat/tactical-cost';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { Stat } from '~/types/entity/actor';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { getCurrentEnergy, setEnergy } from '~/worldkit/entity/actor/capacitor';
import { createWeaponSchema } from '~/worldkit/schema/weapon';

function extractCombatantDidAttackEvents(events: WorldEvent[]): CombatantDidAttack[] {
  return events.filter(e => e.type === EventType.COMBATANT_DID_ATTACK) as CombatantDidAttack[];
}

function extractCombatantDidDieEvents(events: WorldEvent[]): CombatantDidDie[] {
  return events.filter(e => e.type === EventType.COMBATANT_DID_DIE) as CombatantDidDie[];
}

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

      // Should hit 3 targets (TARGET1, TARGET2, TARGET3) but not ALLY or FAR_TARGET
      const attackEvents = extractCombatantDidAttackEvents(result);
      expect(attackEvents).toHaveLength(3);

      // Verify AP was consumed
      expect(attackerCombatant.ap.eff.cur).toBeLessThan(initialAP);

      // Verify energy was consumed
      expect(getCurrentEnergy(attacker)).toBeLessThan(initialEnergy);

      // Verify all attack events are for different targets
      const targetIds = attackEvents.map(e => e.payload.target);
      expect(targetIds).toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
      expect(targetIds).not.toContain(ALLY_ID); // Should not hit ally
      expect(targetIds).not.toContain(FAR_TARGET_ID); // Should not hit far target
    });

    it('should create individual COMBATANT_DID_ATTACK events for each target', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;

      const result = cleave();
      const attackEvents = extractCombatantDidAttackEvents(result);

      expect(attackEvents).toHaveLength(3);

      // First event should show the total cost
      expect(attackEvents[0].payload.cost.ap).toBeGreaterThan(0);
      expect(attackEvents[0].payload.cost.energy).toBeGreaterThan(0);

      // Subsequent events should show zero cost (to avoid duplication)
      expect(attackEvents[1].payload.cost.ap).toBe(0);
      expect(attackEvents[1].payload.cost.energy).toBe(0);
      expect(attackEvents[2].payload.cost.ap).toBe(0);
      expect(attackEvents[2].payload.cost.energy).toBe(0);

      // All events should have proper structure
      attackEvents.forEach(event => {
        expect(event).toMatchObject({
          type: EventType.COMBATANT_DID_ATTACK,
          location: attacker.location,
          payload: expect.objectContaining({
            actor: attacker.id,
            target: expect.any(String),
            roll: expect.any(Object),
            outcome: expect.any(String),
            attackRating: expect.any(Number),
            evasionRating: expect.any(Number),
          }),
        });
      });
    });

    it('should call declareEvent for each attack', () => {
      cleave();

      // Should declare 3 attack events
      expect(context.declareEvent).toHaveBeenCalledTimes(3);

      const calls = (context.declareEvent as any).mock.calls;
      calls.forEach((call: any) => {
        expect(call[0]).toMatchObject({
          type: EventType.COMBATANT_DID_ATTACK,
          payload: expect.objectContaining({
            actor: expect.any(String),
            target: expect.any(String),
          }),
        });
      });
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
      const attackEvents = extractCombatantDidAttackEvents(result);
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
      const attackEvents = extractCombatantDidAttackEvents(result);

      // Should hit exactly 3 targets (all enemies at optimal range)
      expect(attackEvents).toHaveLength(3);

      const targetIds = attackEvents.map(e => e.payload.target);
      expect(targetIds).toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
    });

    it('should not hit allies even if at optimal range', () => {
      const result = cleave();
      const attackEvents = extractCombatantDidAttackEvents(result);

      const targetIds = attackEvents.map(e => e.payload.target);
      expect(targetIds).not.toContain(ALLY_ID);
    });

    it('should not hit enemies outside optimal range', () => {
      const result = cleave();
      const attackEvents = extractCombatantDidAttackEvents(result);

      const targetIds = attackEvents.map(e => e.payload.target);
      expect(targetIds).not.toContain(FAR_TARGET_ID);
    });

    it('should work with single target at optimal range', () => {
      // Move all but one target out of range
      const target2Combatant = scenario.session.data.combatants.get(TARGET2_ID)!;
      const target3Combatant = scenario.session.data.combatants.get(TARGET3_ID)!;

      target2Combatant.position.coordinate = 110; // Far away
      target3Combatant.position.coordinate = 110; // Far away

      const result = cleave();
      const attackEvents = extractCombatantDidAttackEvents(result);

      expect(attackEvents).toHaveLength(1);
      expect(attackEvents[0].payload.target).toBe(TARGET1_ID);
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

      const attackEvents = extractCombatantDidAttackEvents(result);
      const deathEvents = extractCombatantDidDieEvents(result);

      expect(attackEvents).toHaveLength(3); // 3 attacks
      expect(deathEvents).toHaveLength(2); // 2 deaths (target1 and target2)

      const deadTargets = deathEvents.map(e => e.payload.actor);
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

      const attackEvents = extractCombatantDidAttackEvents(result);
      const deathEvents = extractCombatantDidDieEvents(result);

      expect(attackEvents).toHaveLength(3); // 3 attacks
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
      const attackEvents = extractCombatantDidAttackEvents(result);

      // Should only hit living targets
      expect(attackEvents).toHaveLength(2);
      const targetIds = attackEvents.map(e => e.payload.target);
      expect(targetIds).not.toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
    });

    it('should handle missing combatants gracefully', () => {
      // Remove a combatant from the session
      scenario.session.data.combatants.delete(TARGET1_ID);

      const result = cleave();
      const attackEvents = extractCombatantDidAttackEvents(result);

      // Should still work with remaining targets
      expect(attackEvents).toHaveLength(2);
      const targetIds = attackEvents.map(e => e.payload.target);
      expect(targetIds).not.toContain(TARGET1_ID);
      expect(targetIds).toContain(TARGET2_ID);
      expect(targetIds).toContain(TARGET3_ID);
    });
  });
});

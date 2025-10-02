import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStrikeMethod } from './strike';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { CombatantDidAttack, CombatantDidDie, EventType, WorldEvent } from '~/types/event';
import { Team } from '~/types/combat';
import { createStrikeCost } from '~/worldkit/combat/tactical-cost';
import { calculateWeaponApCost } from '~/worldkit/combat/damage';

function extractCombatantDidAttackEvent(events: WorldEvent[]): CombatantDidAttack {
  return events.find(e => e.type === EventType.COMBATANT_DID_ATTACK) as CombatantDidAttack;
}

describe('Strike Method', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let strike: ReturnType<typeof createStrikeMethod>;
  let mockComputeActorMass: ReturnType<typeof vi.fn>;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const TARGET_ID: ActorURN = 'flux:actor:test:target';
  const SPECIFIC_TARGET_ID: ActorURN = 'flux:actor:test:specific';

  beforeEach(() => {
    mockComputeActorMass = vi.fn().mockReturnValue(70000); // 70kg in grams

    context = createTransformerContext();
    context.mass.computeActorMass = mockComputeActorMass;
    context.declareEvent = vi.fn();

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test',
      name: 'Test Weapon',
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema]);

    scenario = useCombatScenario(context, {
      weapons: [swordSchema],
      schemaManager, // Share the schema manager
      participants: {
        [ATTACKER_ID]: {
          team: Team.ALPHA,
          target: TARGET_ID,
          stats: { pow: 10, fin: 10, res: 10 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        [TARGET_ID]: {
          team: Team.BRAVO,
          stats: { pow: 10, fin: 10, res: 10 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 101, facing: -1, speed: 0 }, // 1m away, within weapon range
        },
        [SPECIFIC_TARGET_ID]: {
          team: Team.ALPHA,
          position: { coordinate: 101, facing: -1, speed: 0 },
        },
      },
    });

    const attacker = scenario.actors[ATTACKER_ID];
    const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

    strike = createStrikeMethod(
      context,
      scenario.session,
      attacker.actor,
      attackerCombatant,
    );
  });

  describe('Basic Functionality', () => {
    it('should perform strike attack on target', () => {
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      const initialAP = attackerCombatant.ap.eff.cur;

      const result = strike();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_ATTACK);
      expect(attackerCombatant.ap.eff.cur).toBeLessThan(initialAP); // AP should be consumed
    });

    it('should create COMBATANT_DID_ATTACK event with strike details', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      const result = strike();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: EventType.COMBATANT_DID_ATTACK,
        location: attacker.location,
        payload: expect.objectContaining({
          actor: attacker.id,
          cost: expect.objectContaining({ ap: expect.any(Number) }),
          target: attackerCombatant.target,
          roll: expect.any(Object),
          outcome: expect.any(String)
        })
      });
    });

    it('should use specified target when provided', () => {
      const result = strike(SPECIFIC_TARGET_ID);
      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidAttack;
      expect(event.payload.target).toBe(SPECIFIC_TARGET_ID);
    });

    it('should call declareEvent on context', () => {
      strike();

      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.COMBATANT_DID_ATTACK,
          payload: expect.objectContaining({
            cost: expect.any(Object),
            target: expect.any(String),
            roll: expect.any(Object),
            outcome: expect.any(String)
          })
        })
      );
    });
  });

  describe('Tactical Rounding', () => {
    it('should apply tactical rounding to AP costs', () => {
      const mockCreateStrikeCost = vi.fn();

      // Mock tactical cost that includes rounding
      const tacticalApCost = 1.3;
      const tacticalCost = { ap: tacticalApCost, energy: 0 };

      mockCreateStrikeCost.mockReturnValue(tacticalCost);

      // Create strike method with mocked dependencies
      const attacker = scenario.actors[ATTACKER_ID];
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      const strikeWithMocks = createStrikeMethod(
        context,
        scenario.session,
        attacker.actor,
        attackerCombatant,
        {
          createStrikeCost: mockCreateStrikeCost,
        }
      );

      const initialAP = attackerCombatant.ap.eff.cur;
      const result = strikeWithMocks();

      // Verify tactical cost factory was called with weapon mass and finesse
      expect(mockCreateStrikeCost).toHaveBeenCalled();
      const [weaponMassKg, finesse] = mockCreateStrikeCost.mock.calls[0];
      expect(weaponMassKg).toBeGreaterThan(0);
      expect(finesse).toBe(attacker.actor.stats.fin.eff);

      // Verify the tactical AP cost was used
      const finalAP = attackerCombatant.ap.eff.cur;
      const actualApCost = initialAP - finalAP;
      expect(actualApCost).toBeCloseTo(tacticalApCost, 10);

      // Verify event contains tactical AP cost
      const event = extractCombatantDidAttackEvent(result);
      expect(event).toBeDefined();
      expect(event.payload.cost.ap).toBe(tacticalApCost);
    });

    it('should demonstrate real tactical rounding with actual createStrikeCost', () => {
      // Test the real tactical cost factory with actual rounding behavior

      // Test cases that demonstrate tactical rounding
      const testCases = [
        { weaponMassKg: 0.5, finesse: 30, description: 'light weapon, low finesse' },
        { weaponMassKg: 2.0, finesse: 50, description: 'medium weapon, medium finesse' },
        { weaponMassKg: 5.0, finesse: 80, description: 'heavy weapon, high finesse' },
        { weaponMassKg: 1.0, finesse: 100, description: 'medium weapon, max finesse' },
      ];

      for (const testCase of testCases) {
        const attacker = scenario.actors[ATTACKER_ID];
        const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

        // Reset AP for each test case
        attackerCombatant.ap.eff.cur = 10.0;

        // Calculate what the precise cost would be
        const preciseApCost = calculateWeaponApCost(testCase.weaponMassKg, testCase.finesse);

        // Calculate what the tactical cost should be
        const tacticalCost = createStrikeCost(testCase.weaponMassKg, testCase.finesse);

        const strikeWithRealCost = createStrikeMethod(
          context,
          scenario.session,
          attacker.actor,
          attackerCombatant,
          {
            createStrikeCost: () => tacticalCost, // Use the real tactical cost
          }
        );

        const initialAP = attackerCombatant.ap.eff.cur;
        const result = strikeWithRealCost();

        const finalAP = attackerCombatant.ap.eff.cur;
        const actualApCost = initialAP - finalAP;

        // Verify tactical cost was used
        expect(actualApCost).toBeCloseTo(tacticalCost.ap!, 10);

        const event = extractCombatantDidAttackEvent(result);
        expect(event.payload.cost.ap).toBe(tacticalCost.ap);

        // Verify conservative rounding (tactical >= precise)
        expect(tacticalCost.ap!).toBeGreaterThanOrEqual(preciseApCost);
      }
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const customTrace = 'custom-strike-trace-123';
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      const result = strike(undefined, customTrace);

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(customTrace);
      expect(result[0]).toMatchObject({
        type: EventType.COMBATANT_DID_ATTACK,
        trace: customTrace,
        payload: expect.objectContaining({
          actor: attacker.id,
          cost: expect.any(Object),
          target: attackerCombatant.target,
          roll: expect.any(Object),
          outcome: expect.any(String)
        })
      });
    });

    it('should use generated trace when none provided', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      // Mock context.uniqid to return a known value
      const generatedTrace = 'generated-strike-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = strike(); // No trace provided

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
      expect(context.uniqid).toHaveBeenCalled();
      expect(result[0]).toMatchObject({
        type: EventType.COMBATANT_DID_ATTACK,
        trace: generatedTrace,
        payload: expect.objectContaining({
          actor: attacker.id,
          cost: expect.any(Object),
          target: attackerCombatant.target,
          roll: expect.any(Object),
          outcome: expect.any(String)
        })
      });
    });

    it('should propagate trace with specific target', () => {
      const customTrace = 'custom-strike-target-trace-789';
      const specificTarget = SPECIFIC_TARGET_ID;

      const result = strike(specificTarget, customTrace);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidAttack;
      expect(event.trace).toBe(customTrace);
      expect(event.payload.target).toBe(specificTarget);
    });
  });

  describe('Death Event Integration', () => {
    it('should emit death event immediately when strike kills target', () => {
      // Set up a scenario where the target will die from the strike
      const targetActor = scenario.session.data.combatants.get(TARGET_ID)!;
      const targetActorData = context.world.actors[TARGET_ID];


      // Set target to very low HP so the strike will kill them
      targetActorData.hp.eff.cur = 1;

      // Set up the strike to target the low-HP actor
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      attackerCombatant.target = TARGET_ID;

      // Mock the roll to ensure a hit (high roll value)
      const mockExecuteRoll = vi.fn().mockReturnValue({
        result: 20, // High roll to ensure hit
        dice: [{ value: 20, sides: 20 }],
        modifier: 0
      });

      context.executeRoll = mockExecuteRoll;

      // Mock resolveHitAttempt to ensure the attack always hits
      const mockResolveHitAttempt = vi.fn().mockReturnValue({
        evaded: false, // Ensure the attack hits
        evasionChance: 0.1,
        efficiency: 1.0,
        ratingDifference: -10,
        rngValue: 0.5
      });

      // Create strike method with mocked hit resolution
      const attacker = scenario.actors[ATTACKER_ID];
      const strikeWithMocks = createStrikeMethod(
        context,
        scenario.session,
        attacker.actor,
        attackerCombatant,
        {
          resolveHitAttempt: mockResolveHitAttempt,
        }
      );

      const result = strikeWithMocks(TARGET_ID);

      // Should contain both attack event and death event
      expect(result).toHaveLength(2);

      const attackEvent = result.find(e => e.type === EventType.COMBATANT_DID_ATTACK) as CombatantDidAttack;
      const deathEvent = result.find(e => e.type === EventType.COMBATANT_DID_DIE) as CombatantDidDie;

      expect(attackEvent).toBeDefined();
      expect(deathEvent).toBeDefined();
      expect(deathEvent?.payload.actor).toBe(TARGET_ID);

      // Verify target is actually dead
      expect(targetActorData.hp.eff.cur).toBe(0);
    });

    it('should not emit death event when strike does not kill target', () => {
      // Set up a scenario where the target survives the strike
      const targetActorData = context.world.actors[TARGET_ID];

      // Set target to high HP so they survive
      targetActorData.hp.eff.cur = 100;

      // Set up the strike
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      attackerCombatant.target = TARGET_ID;

      const result = strike();

      // Should only contain attack event, no death event
      expect(result).toHaveLength(1);

      const attackEvent = result.find(e => e.type === EventType.COMBATANT_DID_ATTACK);
      const deathEvent = result.find(e => e.type === EventType.COMBATANT_DID_DIE);

      expect(attackEvent).toBeDefined();
      expect(deathEvent).toBeUndefined();

      // Verify target is still alive
      expect(targetActorData.hp.eff.cur).toBeGreaterThan(0);
    });
  });
});

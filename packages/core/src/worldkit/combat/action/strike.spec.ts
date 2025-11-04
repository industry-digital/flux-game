import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStrikeMethod } from './strike';
import { useCombatScenario } from '../testing/scenario';
import { extractEventsByType, extractFirstEventOfType } from '~/testing/event/parsing';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { ActorDidAttack, ActorDidDie, ActorDidStrike, ActorWasAttacked, EventType } from '~/types/event';
import { Team } from '~/types/combat';
import { createStrikeCost } from '~/worldkit/combat/tactical-cost';
import { calculateWeaponApCost, getCurrentAp, setCurrentAp } from '~/worldkit/combat/ap';
import { WeaponTimer } from '~/types/schema/weapon';
import { createDefaultSkillState } from '~/worldkit/entity/actor/skill';
import { isAlive, isDead, setCurrentHp, setMaxHp } from '~/worldkit/entity/actor';

describe('Strike Method', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let strike: ReturnType<typeof createStrikeMethod>;
  let mockComputeActorMass: ReturnType<typeof vi.fn>;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const TARGET_ID: ActorURN = 'flux:actor:test:target';
  const SPECIFIC_TARGET_ID: ActorURN = 'flux:actor:test:specific';

  const swordSchema = createSwordSchema({
    urn: 'flux:schema:weapon:test',
    name: 'Test Weapon',
  });

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
          skills: {
            'flux:schema:skill:weapon:sword': createDefaultSkillState(),
          },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        [TARGET_ID]: {
          team: Team.BRAVO,
          stats: { pow: 10, fin: 10, res: 10 },
          skills: { 'flux:schema:skill:weapon:sword': createDefaultSkillState() },
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
      const initialAP = getCurrentAp(attackerCombatant);

      const result = strike();

      // Should emit both attack and damage events
      const attackEvents = extractEventsByType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK);
      const damageEvents = extractEventsByType<ActorWasAttacked>(result, EventType.ACTOR_WAS_ATTACKED);

      expect(attackEvents).toHaveLength(1);
      expect(damageEvents).toHaveLength(1);
      expect(getCurrentAp(attackerCombatant)).toBeLessThan(initialAP); // AP should be consumed
    });

    it('should emit correct event types with proper structure and separation of concerns', () => {
      const attacker = scenario.actors[ATTACKER_ID].actor;
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

      const result = strike();

      const attackEvent = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK);
      const damageEvent = extractFirstEventOfType<ActorWasAttacked>(result, EventType.ACTOR_WAS_ATTACKED);
      const deathEvent = extractFirstEventOfType<ActorDidDie>(result, EventType.ACTOR_DID_DIE);

      // Event count validation: 1 attack + 1 damage + 0 deaths (target survives)
      expect(attackEvent).toBeDefined();
      expect(damageEvent).toBeDefined();
      expect(deathEvent).toBeUndefined();

      // Attack event validation (attacker's perspective)
      expect(attackEvent).toMatchObject({
        type: EventType.ACTOR_DID_ATTACK,
        location: attacker.location,
        actor: attacker.id,
        payload: expect.objectContaining({
          target: attackerCombatant.target,
          attackType: 'strike',
          cost: expect.objectContaining({
            ap: expect.any(Number),
          }),
          roll: expect.any(Object),
          attackRating: expect.any(Number),
        }),
      });

      // Damage event validation (target's perspective)
      expect(damageEvent).toMatchObject({
        type: EventType.ACTOR_WAS_ATTACKED,
        actor: attackerCombatant.target, // Target actor
        payload: expect.objectContaining({
          source: attacker.id,
          type: 'strike',
          outcome: expect.any(String),
          attackRating: expect.any(Number),
          evasionRating: expect.any(Number),
          damage: expect.any(Number),
        }),
      });

      // Should declare both events
      expect(context.declareEvent).toHaveBeenCalledTimes(2);
    });

    it('should use specified target when provided', () => {
      const result = strike(SPECIFIC_TARGET_ID);

      const attackEvent = extractFirstEventOfType<ActorDidStrike>(result, EventType.ACTOR_DID_ATTACK)!;
      const damageEvent = extractFirstEventOfType<ActorWasAttacked>(result, EventType.ACTOR_WAS_ATTACKED)!;

      expect(attackEvent.payload.target).toContain(SPECIFIC_TARGET_ID);
      expect(damageEvent.actor).toBe(SPECIFIC_TARGET_ID);
    });

    it('should call declareEvent for both attack and damage events', () => {
      strike();

      // Should declare both attack and damage events
      expect(context.declareEvent).toHaveBeenCalledTimes(2);

      const calls = (context.declareEvent as any).mock.calls;
      const attackCall = calls.find((call: any) => call[0].type === EventType.ACTOR_DID_ATTACK);
      const damageCall = calls.find((call: any) => call[0].type === EventType.ACTOR_WAS_ATTACKED);

      expect(attackCall).toBeDefined();
      expect(damageCall).toBeDefined();
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

      const initialAP = getCurrentAp(attackerCombatant);
      const result = strikeWithMocks();

      // Verify tactical cost factory was called with actor and weapon
      expect(mockCreateStrikeCost).toHaveBeenCalled();
      const [actor, weapon] = mockCreateStrikeCost.mock.calls[0];
      expect(actor).toBeDefined();
      expect(weapon).toBeDefined();
      expect(weapon.baseMass).toBeGreaterThan(0);

      // Verify the tactical AP cost was used
      const finalAP = getCurrentAp(attackerCombatant);
      const actualApCost = initialAP - finalAP;
      expect(actualApCost).toBeCloseTo(tacticalApCost, 10);

      // Verify event contains tactical AP cost
      const event = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK)!;
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
        setCurrentAp(attackerCombatant, 10.0);

        // Calculate what the precise cost would be
        const preciseApCost = calculateWeaponApCost(attacker.actor, swordSchema, WeaponTimer.ATTACK);

        // Calculate what the tactical cost should be
        const tacticalCost = createStrikeCost(attacker.actor, swordSchema, WeaponTimer.ATTACK);

        const strikeWithRealCost = createStrikeMethod(
          context,
          scenario.session,
          attacker.actor,
          attackerCombatant,
          {
            createStrikeCost: () => tacticalCost, // Use the real tactical cost
          }
        );

        const initialAP = getCurrentAp(attackerCombatant);
        const result = strikeWithRealCost();

        const finalAP = getCurrentAp(attackerCombatant);
        const actualApCost = initialAP - finalAP;

        // Verify tactical cost was used
        expect(actualApCost).toBeCloseTo(tacticalCost.ap!, 10);

        const event = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK)!;
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

      expect(result).toHaveLength(2); // COMBATANT_DID_ATTACK + COMBATANT_WAS_ATTACKED

      // Both events should have the custom trace
      result.forEach(event => {
        expect(event.trace).toBe(customTrace);
      });

      const attackEvent = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK);
      expect(attackEvent).toMatchObject({
        type: EventType.ACTOR_DID_ATTACK,
        trace: customTrace,
        actor: attacker.id,
        payload: expect.objectContaining({
          target: attackerCombatant.target,
          attackType: 'strike',
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

      expect(result).toHaveLength(2); // Attack + damage events

      // Both events should have the generated trace
      result.forEach(event => {
        expect(event.trace).toBe(generatedTrace);
      });

      expect(context.uniqid).toHaveBeenCalled();

      const attackEvent = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK);
      expect(attackEvent).toMatchObject({
        type: EventType.ACTOR_DID_ATTACK,
        trace: generatedTrace,
        actor: attacker.id,
        payload: expect.objectContaining({
          target: attackerCombatant.target,
          attackType: 'strike',
        })
      });
    });

    it('should propagate trace with specific target', () => {
      const customTrace = 'custom-strike-target-trace-789';
      const specificTarget = SPECIFIC_TARGET_ID;

      const result = strike(specificTarget, customTrace);

      expect(result).toHaveLength(2); // Attack + damage events

      // Both events should have the custom trace
      result.forEach(event => {
        expect(event.trace).toBe(customTrace);
      });

      const attackEvent = extractFirstEventOfType<ActorDidStrike>(result, EventType.ACTOR_DID_ATTACK);
      const damageEvent = extractFirstEventOfType<ActorWasAttacked>(result, EventType.ACTOR_WAS_ATTACKED);

      expect(attackEvent?.payload.target).toBe(specificTarget);
      expect(damageEvent?.actor).toBe(specificTarget);
    });
  });

  describe('Death Event Integration', () => {
    it('should emit death event immediately when strike kills target', () => {
      // Set up a scenario where the target will die from the strike
      const targetCombatant = scenario.session.data.combatants.get(TARGET_ID)!;
      const targetActor = context.world.actors[TARGET_ID];


      // Set target to very low HP so the strike will kill them
      setMaxHp(targetActor, 1);
      setCurrentHp(targetActor, 1);

      // Set up the strike to target the low-HP actor
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      attackerCombatant.target = TARGET_ID;

      // Mock the roll to ensure a hit (high roll value)
      const mockExecuteRoll = vi.fn().mockReturnValue({
        result: 20, // High roll to ensure hit
        dice: [{ value: 20, sides: 20 }],
        modifier: 0
      });

      context.rollDice = mockExecuteRoll;

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

      // Should contain attack, damage, and death events
      expect(result).toHaveLength(3);

      const attackEvent = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK);
      const damageEvent = extractFirstEventOfType<ActorWasAttacked>(result, EventType.ACTOR_WAS_ATTACKED);
      const deathEvent = extractFirstEventOfType<ActorDidDie>(result, EventType.ACTOR_DID_DIE);

      expect(attackEvent).toBeDefined();
      expect(damageEvent).toBeDefined();
      expect(deathEvent).toBeDefined();
      expect(deathEvent?.payload.killer).toBe(ATTACKER_ID);

      // Verify target is actually dead
      expect(isDead(targetActor)).toBe(true);
    });

    it('should not emit death event when strike does not kill target', () => {
      // Set up a scenario where the target survives the strike
      const targetActor = context.world.actors[TARGET_ID];

      // Set target to high HP so they survive
      setMaxHp(targetActor, 100);
      setCurrentHp(targetActor, 100);

      // Set up the strike
      const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      attackerCombatant.target = TARGET_ID;

      const result = strike();

      // Should contain attack and damage events, but no death event
      expect(result).toHaveLength(2);

      const attackEvent = extractFirstEventOfType<ActorDidAttack>(result, EventType.ACTOR_DID_ATTACK);
      const damageEvent = extractFirstEventOfType<ActorWasAttacked>(result, EventType.ACTOR_WAS_ATTACKED);
      const deathEvent = extractFirstEventOfType<ActorDidDie>(result, EventType.ACTOR_DID_DIE);

      expect(attackEvent).toBeDefined();
      expect(damageEvent).toBeDefined();
      expect(deathEvent).toBeUndefined();

      // Verify target is still alive
      expect(isAlive(targetActor)).toBe(true);
    });
  });
});

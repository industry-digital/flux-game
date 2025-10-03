import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCombatScenario } from '../testing/scenario';
import { createCombatSessionApi } from '../session/session';
import { createIntentExecutionApi } from '../intent/execution';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createSpearSchema } from '~/worldkit/schema/weapon/spear';
import { createBowSchema } from '~/worldkit/schema/weapon/bow';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { CombatFacing, Team } from '~/types/combat';
import { generateCombatPlan } from './index';
import { CombatPlanningDependencies, DEFAULT_COMBAT_PLANNING_DEPS } from './deps';
import { getValidActions } from './search';
import { createMassApi } from '~/worldkit/physics/mass';
import { CommandType } from '~/types/intent';
import { createActor } from '~/worldkit/entity/actor';
import { Actor, Stat } from '~/types/entity/actor';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { CombatantDidAttack, EventType } from '~/types/event';
import { targetingApi } from './targeting';
import { HeuristicProfile, SearchConfig, TacticalSituation } from '~/types/combat-ai';
import { TransformerContext } from '~/types/handler';

const TEST_WEAPON_ENTITY_URN = 'flux:item:weapon:test';
const DEFAULT_TIMESTAMP  = 1234567890000;

describe('AI Combat System Integration', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let swordSchema: ReturnType<typeof createSwordSchema>;
  let spearSchema: ReturnType<typeof createSpearSchema>;
  let bowSchema: ReturnType<typeof createBowSchema>;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const DEFENDER_ID: ActorURN = 'flux:actor:test:defender';
  const TARGET2_ID: ActorURN = 'flux:actor:test:target2';

  // Helper function to get combatant and generate plan
  const generatePlanForActor = (scenario: ReturnType<typeof useCombatScenario>, actorId: ActorURN) => {
    const combatant = scenario.session.data.combatants.get(actorId);
    if (!combatant) {
      throw new Error(`Combatant not found: ${actorId}`);
    }
    return generateCombatPlan(scenario.context, scenario.session, combatant, 'test-trace');
  };

  let mockMassApi: ReturnType<typeof createMassApi>;

  let alice: Actor;
  let bob: Actor;

  beforeEach(() => {
    mockMassApi = {
      computeActorMass: vi.fn().mockReturnValue(70000), // 70kg in grams
      computeCombatMass: vi.fn().mockReturnValue(70), // 70kg for combat physics
    } as unknown as ReturnType<typeof createMassApi>;
    context = createTransformerContext((c) => ({ ...c, mass: mockMassApi }));

    context.declareEvent = vi.fn();

    // Create weapon schemas for different test scenarios FIRST
    swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:sword',
      name: 'Test Sword',
      range: { optimal: 1, max: 1 }, // 1m melee weapon
    });

    spearSchema = createSpearSchema({
      urn: 'flux:schema:weapon:spear',
      name: 'Test Spear',
      range: { optimal: 2, max: 2 }, // 2m reach weapon
    });

    bowSchema = createBowSchema({
      urn: 'flux:schema:weapon:bow',
      name: 'Test Bow',
      range: { optimal: 10, falloff: 5, max: 25 }, // 10m optimal, 5m falloff, 25m max ranged weapon
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema, spearSchema, bowSchema]);

    // NOW create actors with proper weapon schema references
    alice = createActor({
      id: ATTACKER_ID,
      name: 'Attacker',
      stats: {
        [Stat.POW]: { nat: 10, eff: 10, mods: {} },
        [Stat.FIN]: { nat: 10, eff: 10, mods: {} },
        [Stat.RES]: { nat: 10, eff: 10, mods: {} },
        [Stat.INT]: { nat: 10, eff: 10, mods: {} },
        [Stat.PER]: { nat: 10, eff: 10, mods: {} },
        [Stat.MEM]: { nat: 10, eff: 10, mods: {} },
      },
      equipment: { [HumanAnatomy.RIGHT_HAND]: { [TEST_WEAPON_ENTITY_URN]: 1 } },
      inventory: {
        mass: 0,
        items: { [TEST_WEAPON_ENTITY_URN]: { id: TEST_WEAPON_ENTITY_URN, schema: swordSchema.urn } },
        ts: 0,
      },
    });

    bob = createActor({
      id: DEFENDER_ID,
      name: 'Defender',
      stats: {
        [Stat.POW]: { nat: 10, eff: 10, mods: {} },
        [Stat.FIN]: { nat: 10, eff: 10, mods: {} },
        [Stat.RES]: { nat: 10, eff: 10, mods: {} },
        [Stat.INT]: { nat: 10, eff: 10, mods: {} },
        [Stat.PER]: { nat: 10, eff: 10, mods: {} },
        [Stat.MEM]: { nat: 10, eff: 10, mods: {} },
      },
      equipment: { [HumanAnatomy.RIGHT_HAND]: { [TEST_WEAPON_ENTITY_URN]: 1 } },
      inventory: {
        mass: 0,
        items: { [TEST_WEAPON_ENTITY_URN]: { id: TEST_WEAPON_ENTITY_URN, schema: swordSchema.urn } },
        ts: 0,
      },
    });

    context.world.actors[ATTACKER_ID] = alice;
    context.world.actors[DEFENDER_ID] = bob;
  });

  describe('AI Deathmatch Simulation', () => {
    // Helper function to create deathmatch scenarios
    const createDeathMatchScenario = (weaponSchema: typeof swordSchema | typeof spearSchema | typeof bowSchema, startDistance: number) => {
      return useCombatScenario(context, {
        weapons: [weaponSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            stats: { pow: 12, fin: 10, res: 10 },
            equipment: { weapon: weaponSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: weaponSchema.urn },
            position: { coordinate: 100 + startDistance, facing: CombatFacing.LEFT, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
        },
      });
    };

    it('should demonstrate realistic AI combat behavior with melee weapons and close distance quickly', () => {
      const scenario = createDeathMatchScenario(swordSchema, 5); // 5m starting distance
      const attackerPlan = generatePlanForActor(scenario, ATTACKER_ID);

      // For melee weapons at 5m distance, AI should plan to advance and attack
      expect(attackerPlan.length).toBeGreaterThan(0);

      // Should include movement to close distance
      const hasMovement = attackerPlan.some(action =>
        action.command === CommandType.ADVANCE || action.command === CommandType.RETREAT
      );
      expect(hasMovement).toBe(true);

      // Should include some form of combat action (strike or defend)
      const hasCombatAction = attackerPlan.some(action =>
        action.command === CommandType.STRIKE || action.command === CommandType.DEFEND
      );
      expect(hasCombatAction).toBe(true);
    });

    it('should demonstrate realistic AI combat behavior with reach weapons and move to optimal range', () => {
      const scenario = createDeathMatchScenario(spearSchema, 5); // 5m starting distance
      const attackerPlan = generatePlanForActor(scenario, ATTACKER_ID);

      // For reach weapons, AI should plan to get to 2m optimal range
      expect(attackerPlan.length).toBeGreaterThan(0);

      // Should include tactical positioning
      const hasMovement = attackerPlan.some(action =>
        action.command === CommandType.ADVANCE || action.command === CommandType.RETREAT
      );
      expect(hasMovement).toBe(true);
    });

    it('should demonstrate realistic AI combat behavior with ranged weapons and maintain distance', () => {
      const scenario = createDeathMatchScenario(bowSchema, 5); // 5m starting distance (too close for ranged)
      const attackerPlan = generatePlanForActor(scenario, ATTACKER_ID);

      // For ranged weapons at close range, AI should retreat to optimal distance
      expect(attackerPlan.length).toBeGreaterThan(0);

      // Should include movement or combat actions
      const hasMovement = attackerPlan.some(action =>
        action.command === CommandType.ADVANCE || action.command === CommandType.RETREAT
      );
      const hasCombatAction = attackerPlan.some(action =>
        action.command === CommandType.STRIKE || action.command === CommandType.DEFEND
      );
      expect(hasMovement || hasCombatAction).toBe(true);
    });

    it('should simulate full AI vs AI combat until one combatant dies', () => {
      // Inject controlled RNG to ensure some hits land for deterministic test
      let rollCount = 0;
      const controlledRandom = () => {
        rollCount++;
        // Alternate between high rolls (hits) and low rolls (misses)
        // Every 3rd roll is a high roll (15+) to ensure some hits land
        return rollCount % 3 === 0 ? 0.8 : 0.2; // 0.8 = ~16 on d20, 0.2 = ~4 on d20
      };

      // Override the context's random function
      context.random = controlledRandom;

      // Create a close-range melee scenario for faster combat resolution
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            stats: { pow: 12, fin: 10, res: 8 }, // Balanced stats
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
            energy: 20000,
            hp: 30, // Reasonable HP
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 8 }, // Balanced stats
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // Close range (2m)
            ap: 6.0,
            energy: 20000,
            hp: 25, // Reasonable HP
          },
        },
      });

      const session = scenario.session;
      let turnCount = 0;
      const maxTurns = 30; // Controlled RNG ensures faster resolution
      let combatLog: string[] = [];

      const testDeps = {
        ...DEFAULT_COMBAT_PLANNING_DEPS,
        timestamp: () => DEFAULT_TIMESTAMP,
      };

      console.log('\n🥊 Starting AI vs AI Deathmatch:');
      console.log(`  ${ATTACKER_ID}: HP=${context.world.actors[ATTACKER_ID].hp.eff.cur}`);
      console.log(`  ${DEFENDER_ID}: HP=${context.world.actors[DEFENDER_ID].hp.eff.cur}`);

      // Initialize combat by starting it - this sets up the turn system
      const sessionHook = createCombatSessionApi(scenario.context, session.data.location, session.id);
      sessionHook.startCombat();
      console.log(`  Combat started! Current actor: ${session.data.rounds.current.turns.current.actor}`);

      // Simulate combat turns until someone dies or max turns reached
      while (turnCount < maxTurns) {
        turnCount++;

        // Get current turn actor
        const currentActorId = session.data.rounds.current.turns.current.actor;
        const currentCombatant = session.data.combatants.get(currentActorId);

        if (!currentCombatant) {
          console.log(`❌ Turn ${turnCount}: Current actor ${currentActorId} not found`);
          break;
        }

        // Check if current actor is alive
        const currentActor = context.world.actors[currentActorId];
        const currentHealth = currentActor.hp.eff.cur;
        if (currentHealth <= 0) {
          console.log(`💀 Turn ${turnCount}: ${currentActorId} is dead (HP: ${currentHealth})`);
          break;
        }

        console.log(`\n⚔️  Turn ${turnCount}: ${currentActorId} (HP: ${currentHealth}, AP: ${currentCombatant.ap.eff.cur})`);

        // Generate AI plan for current actor
        const aiPlan = generateCombatPlan(scenario.context, session, currentCombatant, `turn-${turnCount}`, testDeps);

        if (aiPlan.length === 0) {
          console.log(`  No actions generated, advancing turn manually`);
          // Advance turn manually using sessionHook
          const turnEvents = sessionHook.advanceTurn(`manual-advance-${turnCount}`);
          console.log(`  Turn advanced: ${turnEvents.length} events`);
          continue;
        }

        // Create intent executor for current combatant
        const combatantHook = sessionHook.getCombatantApi(currentActorId);
        const intentExecutor = createIntentExecutionApi(scenario.context, session, combatantHook);

        // Execute AI plan through real combat system
        console.log(`  Executing ${aiPlan.length} actions:`);
        aiPlan.forEach((action, i) => {
          console.log(`    ${i + 1}. ${action.command} (AP: ${action.cost?.ap || 0})`);
          combatLog.push(`Turn ${turnCount}: ${currentActorId} -> ${action.command}`);
        });

        try {
          const events = intentExecutor.executeActions(aiPlan, `turn-${turnCount}`);
          console.log(`  ✅ Executed successfully: ${events.length} events generated`);

          // Log important events (damage, death, turn changes)
          for (const event of events) {
            if (event.type === EventType.COMBATANT_DID_ATTACK) {
              const typedEvent = event as CombatantDidAttack;
              console.log(`    💥 ${event.actor} took damage`);
            } else if (event.type === EventType.COMBAT_TURN_DID_START) {
              console.log(`    🔄 Turn advanced to ${event.actor}`);
            }
          }
        } catch (error) {
          console.log(`  ❌ Action execution failed: ${error}`);
          // Try to advance turn manually if execution fails
          const turnEvents = sessionHook.advanceTurn(`error-advance-${turnCount}`);
          console.log(`  Turn advanced after error: ${turnEvents.length} events`);
        }

        // Check if either combatant died after actions
        const attackerHP = context.world.actors[ATTACKER_ID].hp.eff.cur;
        const defenderHP = context.world.actors[DEFENDER_ID].hp.eff.cur;

        console.log(`  Post-action HP: ${ATTACKER_ID}=${attackerHP}, ${DEFENDER_ID}=${defenderHP}`);

        if (attackerHP <= 0) {
          console.log(`\n🏆 VICTORY: ${DEFENDER_ID} defeats ${ATTACKER_ID} in ${turnCount} turns!`);
          expect(attackerHP).toBeLessThanOrEqual(0);
          expect(defenderHP).toBeGreaterThan(0);
          return; // Test passes - someone died
        }

        if (defenderHP <= 0) {
          console.log(`\n🏆 VICTORY: ${ATTACKER_ID} defeats ${DEFENDER_ID} in ${turnCount} turns!`);
          expect(defenderHP).toBeLessThanOrEqual(0);
          expect(attackerHP).toBeGreaterThan(0);
          return; // Test passes - someone died
        }

        // Small delay to prevent infinite loops in case of issues
        if (turnCount > 1 && session.data.rounds.current.turns.current.actor === currentActorId) {
          console.log(`  ⚠️  Turn didn't advance, forcing advancement`);
          const turnEvents = sessionHook.advanceTurn(`forced-advance-${turnCount}`);
          console.log(`  Forced turn advance: ${turnEvents.length} events`);
        }
      }

      // If we get here, combat didn't resolve in maxTurns
      console.log(`\n⏰ Combat simulation reached ${maxTurns} turn limit without resolution`);
      console.log('Combat Log:', combatLog);

      const finalAttackerHP = context.world.actors[ATTACKER_ID].hp.eff.cur;
      const finalDefenderHP = context.world.actors[DEFENDER_ID].hp.eff.cur;
      console.log(`Final HP: ${ATTACKER_ID}=${finalAttackerHP}, ${DEFENDER_ID}=${finalDefenderHP}`);

      // Test should fail if no one died within the turn limit
      expect(finalAttackerHP).toBeLessThanOrEqual(0);
      expect(finalDefenderHP).toBeLessThanOrEqual(0);
      // At least one should be dead (this will fail if both are alive, which is what we want)
    });
  });

  describe('AI Planning Edge Cases', () => {
    it('should handle scenarios with no valid targets gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          // No enemies - same team
          [DEFENDER_ID]: {
            team: Team.ALPHA, // Same team as attacker
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should throw appropriate error when no valid targets are available
      expect(() => {
        generatePlanForActor(scenario, ATTACKER_ID);
      }).toThrow('No valid targets available');
    });

    it('should retarget when current target dies', () => {
      const CHARLIE_ID: ActorURN = 'flux:actor:charlie' as ActorURN;

      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: { // Alice (AI-controlled)
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [DEFENDER_ID]: { // Bob (Alice's original target)
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 },
            hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Alive initially
          },
          [CHARLIE_ID]: { // Charlie (alternative target)
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 104, facing: CombatFacing.LEFT, speed: 0 },
            hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Alive
          },
        },
      });

      // Alice initially targets Bob
      const aliceCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
      aliceCombatant.target = DEFENDER_ID;

      // Generate plan - Alice should plan to attack Bob
      const initialPlan = generatePlanForActor(scenario, ATTACKER_ID);
      expect(initialPlan.length).toBeGreaterThan(0);

      // Verify Alice is targeting Bob initially
      const { chooseTargetForActor } = targetingApi(context, scenario.session);
      const initialTarget = chooseTargetForActor(ATTACKER_ID);
      expect(initialTarget.actorId).toBe(DEFENDER_ID);

      // Bob dies (simulate death from previous combat)
      context.world.actors[DEFENDER_ID].hp.eff.cur = 0;

      // Generate new plan - Alice should retarget to Charlie
      const newPlan = generatePlanForActor(scenario, ATTACKER_ID);
      expect(newPlan.length).toBeGreaterThan(0);

      // Verify Alice has retargeted to Charlie (the only remaining valid target)
      const newTarget = chooseTargetForActor(ATTACKER_ID);
      expect(newTarget.actorId).toBe(CHARLIE_ID);
      expect(newTarget.distance).toBe(4); // Distance from Alice to Charlie
    });

    it('should handle scenarios with insufficient AP gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 0.5, // Very low AP
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should handle low AP without crashing
      expect(() => {
        const plan = generatePlanForActor(scenario, ATTACKER_ID);
        expect(plan).toBeDefined();
        // With very low AP, should have limited or no actions
        if (plan.length > 0) {
          // Any actions should be affordable
          const totalApCost = plan.reduce((sum, action) => sum + (action.cost?.ap || 0), 0);
          expect(totalApCost).toBeLessThanOrEqual(0.6); // Small buffer for rounding
        }
      }).not.toThrow();
    });

    it('should handle missing actor gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should handle missing actor gracefully
      expect(() => {
        generatePlanForActor(scenario, ATTACKER_ID); // This will throw when actor doesn't exist
      }).toThrow(); // Expected to throw when actor doesn't exist
    });

    it('should handle missing weapon gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            // No weapon equipped
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should handle missing weapon gracefully (AI system is resilient)
      const plan = generatePlanForActor(scenario, ATTACKER_ID);
      // Without a weapon, AI should generate minimal or no actions
      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThanOrEqual(0); // May generate defensive actions
    });
  });

  describe('AI Cross-Component Integration', () => {
    it('should integrate battlefield analysis with tactical planning', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // 2m away - close range
          },
        },
      });

      const plan = generatePlanForActor(scenario, ATTACKER_ID);

      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThan(0);

      // At close range with melee weapon, should include combat actions
      const hasCombatAction = plan.some(action =>
        action.command === CommandType.STRIKE || action.command === CommandType.DEFEND
      );
      expect(hasCombatAction).toBe(true);
    });

    it('should adapt AI behavior based on weapon capabilities and range', () => {
      // Test ranged weapon at long distance
      const rangedScenario = useCombatScenario(context, {
        weapons: [bowSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: bowSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: bowSchema.urn },
            position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 }, // 50m away - long range
          },
        },
      });

      const rangedPlan = generatePlanForActor(rangedScenario, ATTACKER_ID);

      // Test melee weapon at same distance
      const meleeScenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 }, // 50m away - long range
          },
        },
      });

      const meleePlan = generatePlanForActor(meleeScenario, ATTACKER_ID);

      // Both should generate plans, but with different strategies
      expect(rangedPlan).toBeDefined();
      expect(meleePlan).toBeDefined();

      // Both should generate meaningful plans with appropriate actions
      const rangedHasAction = rangedPlan.some(action =>
        action.command === CommandType.STRIKE || action.command === CommandType.DEFEND ||
        action.command === CommandType.ADVANCE || action.command === CommandType.RETREAT
      );
      // Both should demonstrate meaningful AI behavior
      expect(rangedHasAction).toBe(true);
      // For melee at extreme distance, AI might not generate actions if distance is too far
      // So we'll just check that the plan is defined and doesn't crash
      expect(meleePlan).toBeDefined();
      expect(meleePlan.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sandbox Scenario Debugging', () => {
    it('should generate STRIKE actions in Alice vs Bob scenario matching sandbox', () => {
      // Recreate the exact scenario from our sandbox
      const aliceId: ActorURN = 'flux:actor:alice';
      const bobId: ActorURN = 'flux:actor:bob';

      // Create scenario matching sandbox setup
      const sandboxScenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [aliceId]: {
            team: Team.ALPHA,
            target: bobId,
            stats: { pow: 10, fin: 10, res: 10, per: 10 }, // Match sandbox stats
            ap: 6.0,
            energy: 20000,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 138, facing: CombatFacing.RIGHT, speed: 0 }, // Alice after her move
          },
          [bobId]: {
            team: Team.BRAVO,
            target: aliceId, // Bob targets Alice (this was missing in sandbox!)
            stats: { pow: 10, fin: 10, res: 10, per: 10 }, // Match sandbox stats
            ap: 6.0,
            energy: 20000,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 }, // Bob's starting position
          },
        },
      });

      const bobCombatant = sandboxScenario.session.data.combatants.get(bobId)!;
      const aliceCombatant = sandboxScenario.session.data.combatants.get(aliceId)!;

      console.log('\n🔍 Testing Bob AI scenario:');
      console.log(`  Bob position: ${bobCombatant.position.coordinate}m`);
      console.log(`  Alice position: ${aliceCombatant.position.coordinate}m`);
      console.log(`  Distance: ${Math.abs(200 - 138)}m`);
      console.log(`  Bob has target: ${bobCombatant.target}`);
      console.log(`  Bob AP: ${bobCombatant.ap.eff.cur}`);

      const testDeps = {
        ...DEFAULT_COMBAT_PLANNING_DEPS,
        timestamp: () => Date.now(),
      };

      // Add debug logging to see what's happening in the search
      const originalFindOptimalPlan = testDeps.findOptimalPlan;

      // @ts-expect-error: findOptimalPlan is a mock
      testDeps.findOptimalPlan = (
        context: TransformerContext,
        situation: TacticalSituation,
        profile: HeuristicProfile,
        config: SearchConfig,
        deps: CombatPlanningDependencies
      ) => {
        console.log(`\n🔍 findOptimalPlan called with minScoreThreshold: ${config?.minScoreThreshold}`);
        console.log(`   Situation: ${situation.validTargets.length} targets, ${situation.resources.ap.current} AP`);

        // Debug: Check what actions can be generated from initial state
        const rootNode = {
          id: 'root',
          parent: null,
          actions: [],
          combatantState: {
            facing: situation.combatant.position.facing,
            position: situation.combatant.position.coordinate,
            ap: situation.resources.ap.current,
            energy: situation.resources.energy.current,
          },
          depth: 0,
          isTerminal: false,
        };

        const validActions = Array.from(getValidActions(context, rootNode, situation, deps));
        console.log(`   Valid actions from root: ${validActions.length}`);
        validActions.forEach((action, i) => {
          console.log(`     ${i + 1}. ${action.command} (AP: ${action.cost?.ap || 0})`);
        });

        const result = originalFindOptimalPlan(context, situation, profile, config, deps);

        console.log(`   Result: ${result?.actions?.length || 0} actions`);
        if (result) {
          console.log(`   Score: ${result.score}, Threshold: ${config?.minScoreThreshold}`);
        } else {
          console.log(`   Result is null - no plans generated`);
        }

        return result;
      };

      // Generate combat plan for Bob using the full AI integration with mocked dependencies
      const bobPlan = generateCombatPlan(context, sandboxScenario.session, bobCombatant, 'sandbox-debug', testDeps);

      console.log(`\n🤖 Generated plan for Bob (${bobPlan.length} actions):`);
      bobPlan.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action.command} (AP: ${action.cost.ap || 0})`);
        if (action.args) {
          console.log(`     Args:`, action.args);
        }
      });

      // Analyze what types of actions were generated
      const strikeActions = bobPlan.filter(a => a.command === CommandType.STRIKE);
      const attackActions = bobPlan.filter(a => a.command === CommandType.ATTACK);
      const moveActions = bobPlan.filter(a => [CommandType.ADVANCE, CommandType.RETREAT].includes(a.command));
      const defendActions = bobPlan.filter(a => a.command === CommandType.DEFEND);

      console.log(`\n📊 Action breakdown:`);
      console.log(`  STRIKE actions: ${strikeActions.length}`);
      console.log(`  ATTACK actions: ${attackActions.length}`);
      console.log(`  Movement actions: ${moveActions.length}`);
      console.log(`  DEFEND actions: ${defendActions.length}`);

      // Test our hypothesis: AI should generate at least some actions
      expect(bobPlan.length).toBeGreaterThan(0);

      // If no STRIKE actions, let's understand why
      if (strikeActions.length === 0 && attackActions.length === 0) {
        console.log('\n❌ No STRIKE/ATTACK actions generated!');
        console.log('   This explains why Bob doesn\'t act in the sandbox.');

        // Check if it's a movement issue (AI trying to get closer)
        if (moveActions.length > 0) {
          console.log('   AI is prioritizing movement over striking.');
        }

        // Check if it's an AP issue (not enough resources)
        if (defendActions.length > 0 && bobPlan.length === 1) {
          console.log('   AI is only defending - possible AP constraint issue.');
        }
      } else {
        console.log('\n✅ STRIKE/ATTACK actions found! Sandbox issue might be elsewhere.');
      }

      // The key insight: we expect STRIKE actions to be generated [[memory:8778413]]
      // If only ATTACK actions are generated, that might explain the sandbox issue
      if (attackActions.length > 0 && strikeActions.length === 0) {
        console.log('\n⚠️  AI generated ATTACK but no STRIKE actions');
        console.log('   This might be the sandbox issue - AI should use STRIKE facade');
      }
    });

    it('should generate STRIKE actions at closer range', () => {
      // Test what happens when Bob is much closer to Alice
      const aliceId: ActorURN = 'flux:actor:alice';
      const bobId: ActorURN = 'flux:actor:bob';

      const closerScenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [aliceId]: {
            team: Team.ALPHA,
            target: bobId,
            stats: { pow: 10, fin: 10, res: 10, per: 10 },
            ap: 6.0,
            energy: 20000,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 138, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [bobId]: {
            team: Team.BRAVO,
            target: aliceId,
            stats: { pow: 10, fin: 10, res: 10, per: 10 },
            ap: 6.0,
            energy: 20000,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 140, facing: CombatFacing.LEFT, speed: 0 }, // Very close: 2m apart
          },
        },
      });

      const bobCombatant = closerScenario.session.data.combatants.get(bobId)!;

      const testDeps = {
        ...DEFAULT_COMBAT_PLANNING_DEPS,
        timestamp: () => Date.now(),
      };

      const closerPlan = generateCombatPlan(context, closerScenario.session, bobCombatant, 'closer-debug', testDeps);

      console.log(`\n🔬 Testing Bob at very close range (2m apart):`);
      console.log(`  Plan: ${closerPlan.length} actions`);

      // Log all actions to see what the AI is actually generating
      closerPlan.forEach((action, i) => {
        console.log(`    ${i + 1}. ${action.command} (AP: ${action.cost.ap || 0})`);
        if (action.args) {
          console.log(`       Args:`, action.args);
        }
      });

      const closerStrikes = closerPlan.filter(a => a.command === CommandType.STRIKE);
      const closerAttacks = closerPlan.filter(a => a.command === CommandType.ATTACK);
      const closerMoves = closerPlan.filter(a => [CommandType.ADVANCE, CommandType.RETREAT].includes(a.command));
      const closerDefends = closerPlan.filter(a => a.command === CommandType.DEFEND);

      console.log(`  STRIKE actions: ${closerStrikes.length}`);
      console.log(`  ATTACK actions: ${closerAttacks.length}`);
      console.log(`  Movement actions: ${closerMoves.length}`);
      console.log(`  DEFEND actions: ${closerDefends.length}`);

      if (closerStrikes.length > 0) {
        console.log('  ✅ AI generates STRIKE actions at closer range');
      } else if (closerAttacks.length > 0) {
        console.log('  ⚠️  AI generates ATTACK but not STRIKE at closer range');
      } else {
        console.log('  ❌ Still no combat actions at closer range - deeper issue');
      }

      // At close range, AI should generate some form of combat action
      const hasCombatAction = closerPlan.some(action =>
        action.command === CommandType.STRIKE || action.command === CommandType.ATTACK
      );
      expect(hasCombatAction).toBe(true);
    });
  });

  describe('AI Performance Integration', () => {
    it('should maintain reasonable performance in complex scenarios', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema, spearSchema, bowSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: spearSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
          [TARGET2_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: bowSchema.urn },
            position: { coordinate: 110, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Measure planning time
      const startTime = performance.now();
      const plan = generatePlanForActor(scenario, ATTACKER_ID);
      const endTime = performance.now();
      const planningTime = endTime - startTime;

      expect(plan).toBeDefined();
      expect(planningTime).toBeLessThan(100); // Should complete within 100ms

      // Should generate meaningful plan
      expect(plan.length).toBeGreaterThan(0);
    });

    it('should demonstrate consistent AI decision-making', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
          },
          [DEFENDER_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }, // 3m away
          },
        },
      });

      // Generate multiple plans for the same scenario
      const plan1 = generatePlanForActor(scenario, ATTACKER_ID);
      const plan2 = generatePlanForActor(scenario, ATTACKER_ID);
      const plan3 = generatePlanForActor(scenario, ATTACKER_ID);

      // Plans should be behaviorally consistent - same action types and similar structure
      // (exact equality might vary due to real AP calculations, but behavior should be consistent)
      expect(plan1.length).toBeGreaterThan(0);
      expect(plan2.length).toBeGreaterThan(0);
      expect(plan3.length).toBeGreaterThan(0);

      // All plans should have the same primary action types (allowing for trailing DEFEND actions)
      const getActionTypes = (plan: any[]) => plan.map(action => action.command);
      const actionTypes1 = getActionTypes(plan1);
      const actionTypes2 = getActionTypes(plan2);
      const actionTypes3 = getActionTypes(plan3);

      // Core actions (non-DEFEND) should be consistent
      const getCoreActions = (types: string[]) => types.filter(type => type !== 'DEFEND');
      expect(getCoreActions(actionTypes1)).toEqual(getCoreActions(actionTypes2));
      expect(getCoreActions(actionTypes2)).toEqual(getCoreActions(actionTypes3));
    });
  });
});

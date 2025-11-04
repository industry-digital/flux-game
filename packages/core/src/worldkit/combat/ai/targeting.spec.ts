import { describe, it, expect, beforeEach, vi } from 'vitest';
import { targetingApi } from './targeting';
import { ActorURN } from '~/types/taxonomy';
import { CombatFacing, CombatSession, Team } from '~/types/combat';
import { createTransformerContext } from '~/worldkit/context';
import { DEFAULT_COMBAT_PLANNING_DEPS } from './deps';
import { WeaponSchema } from '~/types/schema/weapon';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DAVID_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';
import { createPlace } from '~/worldkit/entity/place';
import { createDefaultActors } from '~/testing/actors';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { CombatSessionApi, createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Actor } from '~/types/entity/actor';
import { setCombatantPosition } from '~/worldkit/combat/combatant';
import { setHealthPercentage } from '~/worldkit/entity/actor/health';
import { createTestCombatSession } from '~/worldkit/combat/testing/util';

describe('AI: Targeting', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let scenario: WorldScenarioHook;
  let combatSessionApi: CombatSessionApi;
  let session: CombatSession;

  let swordSchema: WeaponSchema;
  let spearSchema: WeaponSchema;
  let bowSchema: WeaponSchema;

  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;
  let david: Actor;

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob, charlie, david } = createDefaultActors(place.id));
    context = createTransformerContext();
    scenario = createWorldScenario(context, {
      places: [place],
      actors: [alice, bob, charlie, david],
    });

    context.declareEvent = vi.fn();

    // Create weapon schemas for different test scenarios
    swordSchema = createWeaponSchema((schema) => ({
      ...schema,
      urn: 'flux:schema:weapon:test-sword',
      range: { optimal: 1, max: 1 }, // 1m melee weapon
    }));

    spearSchema = createWeaponSchema((schema) => ({
      ...schema,
      urn: 'flux:schema:weapon:test-spear',
      range: { optimal: 2, max: 2 }, // 2m reach weapon
    }));

    bowSchema = createWeaponSchema((schema) => ({
      ...schema,
      urn: 'flux:schema:weapon:test-bow',
      range: {
        optimal: 15,
        falloff: 5,
        max: 25,
      },
    }));

    // Register schemas and assign weapons
    scenario.registerSchema(swordSchema);
    scenario.registerSchema(spearSchema);
    scenario.registerSchema(bowSchema);
    scenario.assignWeapon(alice, swordSchema);
    scenario.assignWeapon(bob, swordSchema);
    scenario.assignWeapon(charlie, swordSchema);

    // Create combat session and add combatants
    combatSessionApi = createCombatSessionApi(context, place.id);
    combatSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
    combatSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 });
    combatSessionApi.addCombatant(charlie.id, Team.BRAVO, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 });

    session = combatSessionApi.session;
  });

  describe('chooseTargetForActor', () => {

    describe('core targeting logic', () => {
      it('should choose the closest enemy within optimal weapon range', () => {
        const { chooseTargetForActor } = targetingApi(context, session);
        const result = chooseTargetForActor(ALICE_ID);
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(1);
      });

      it('should maintain existing target if still valid and within range', () => {
        // Set attacker to already target the defender
        const attackerCombatant = session.data.combatants.get(ALICE_ID)!;
        attackerCombatant.target = BOB_ID;

        const { chooseTargetForActor } = targetingApi(context, session);
        const result = chooseTargetForActor(ALICE_ID);

        // Should stick with existing target when it's still valid and within range
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(1);
      });

      it('should switch targets if existing target is out of range', () => {
        const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
        aliceCombatant.position.coordinate = 100;
        aliceCombatant.target = BOB_ID;

        const bobCombatant = session.data.combatants.get(BOB_ID)!;
        bobCombatant.position.coordinate = 200;

        const { chooseTargetForActor } = targetingApi(context, session);
        const result = chooseTargetForActor(ALICE_ID);

        // Should switch to in-range target since current target is out of range
        expect(result.actorId).toBe(CHARLIE_ID);
        expect(result.distance).toBe(1);
      });

      it('should choose targets within max range if none in optimal range', () => {
        scenario.assignWeapon(alice, bowSchema);
        scenario.assignWeapon(bob, bowSchema);
        scenario.assignWeapon(charlie, bowSchema);

        const aliceCombatant = session.data.combatants.get(alice.id)!;
        const bobCombatant = session.data.combatants.get(bob.id)!;
        const charlieCombatant = session.data.combatants.get(charlie.id)!;

        setCombatantPosition(aliceCombatant, (p) => ({ ...p,  coordinate: 100, facing: CombatFacing.RIGHT }));
        setCombatantPosition(bobCombatant, (p) => ({ ...p,  coordinate: 118, facing: CombatFacing.LEFT }));
        setCombatantPosition(charlieCombatant, (p) => ({ ...p,  coordinate: 122, facing: CombatFacing.LEFT }));

        const { chooseTargetForActor } = targetingApi(context, session);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose the farther target with better HP/distance ratio when both are beyond optimal range
        // 18m target: 100HP/18m = 5.56, 22m target: 100HP/22m = 4.55 (lower, so chosen)
        expect(result.actorId).toBe(CHARLIE_ID);
        expect(result.distance).toBe(22);
      });

      it('should ignore dead actors as targets', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        testSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }); // 2m away - farther
        testSessionApi.addCombatant(charlie.id, Team.BRAVO, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }); // 1m away - closer

        const testSession = testSessionApi.session;

        // Bob is alive with low HP, Charlie is dead
        setHealthPercentage(bob, 1);
        setHealthPercentage(charlie, 0);

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose living target, not the closer dead one
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(2);
      });

      it('should ignore friendly actors as targets', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        testSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }); // 2m away - farther
        testSessionApi.addCombatant(charlie.id, Team.ALPHA, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }); // 1m away - closer, same team as alice

        const testSession = testSessionApi.session;

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose enemy, not ally
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(2);
      });

      it('should throw error when actor not found in world projection', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        const testSession = testSessionApi.session;

        const { chooseTargetForActor } = targetingApi(context, testSession);

        expect(() => {
          chooseTargetForActor('flux:actor:test:nonexistent' as ActorURN);
        }).toThrow('Actor flux:actor:test:nonexistent not found in world projection');
      });

      it('should throw error when actor not found in combatants', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        const testSession = testSessionApi.session;

        // Add actor to world but not to combatants
        const orphanActorId = 'flux:actor:test:orphan' as ActorURN;
        context.world.actors[orphanActorId] = context.world.actors[ALICE_ID]; // Copy existing actor

        const { chooseTargetForActor } = targetingApi(context, testSession);

        expect(() => {
          chooseTargetForActor(orphanActorId);
        }).toThrow('Actor flux:actor:test:orphan not found in combatants');
      });

      it('should throw error when no valid targets available', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        testSessionApi.addCombatant(bob.id, Team.ALPHA, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }); // Same team as alice - no enemies
        const testSession = testSessionApi.session;

        const { chooseTargetForActor } = targetingApi(context, testSession);

        expect(() => {
          chooseTargetForActor(ALICE_ID);
        }).toThrow('No valid targets available');
      });

      it('should return closest target when no targets within weapon range (for movement)', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        testSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 }); // 50m away - out of range for melee
        const testSession = testSessionApi.session;

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should return the out-of-range target so AI can move towards it
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(50);
      });
    });

    describe('weapon-specific behavior', () => {
      it('should handle reach weapons (2m optimal range)', () => {
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);

        // Assign spear weapons to all actors
        scenario.assignWeapon(alice, spearSchema);
        scenario.assignWeapon(bob, spearSchema);
        scenario.assignWeapon(charlie, spearSchema);
        scenario.assignWeapon(david, spearSchema);

        // Add combatants with different distances from Alice
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        testSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }); // 2m away - optimal range
        testSessionApi.addCombatant(charlie.id, Team.BRAVO, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }); // 1m away - too close for reach
        testSessionApi.addCombatant(david.id, Team.BRAVO, { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }); // 3m away - too far for reach

        const testSession = testSessionApi.session;

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose the target at optimal range (2m), not the closer or farther ones
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(2);
      });

      it('should prioritize low HP targets at optimal range', () => {
        // Create a session with two targets at the same distance but different HP
        const testSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION);
        testSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
        testSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }); // 1m away
        testSessionApi.addCombatant(charlie.id, Team.BRAVO, { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }); // Same distance
        const testSession = testSessionApi.session;

        // Set different HP values
        bob.hp = { current: 100, max: 100 }; // Full HP
        charlie.hp = { current: 25, max: 100 }; // Lower HP

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose the target with lower HP when both are at optimal range
        expect(result.actorId).toBe(CHARLIE_ID);
        expect(result.distance).toBe(1);
      });

      it('should use HP/distance ratio for ranged weapons beyond optimal range', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: bowSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 120, facing: CombatFacing.LEFT, speed: 0 }, // 20m away - beyond optimal
            weapon: bowSchema,
            hp: { current: 100, max: 100 }, // Full HP
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 124, facing: CombatFacing.LEFT, speed: 0 }, // 24m away - farther
            weapon: bowSchema,
            hp: { current: 10, max: 100 }, // Much lower HP
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose the farther target with much better HP/distance ratio
        // 20m target: 100HP/20m = 5.0, 24m target: 10HP/24m = 0.42 (much lower, so chosen)
        expect(result.actorId).toBe(CHARLIE_ID);
        expect(result.distance).toBe(24);
      });
    });

    describe('range tolerance', () => {
      it('should use tight tolerance (0.5m) for melee weapons', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - exactly optimal
            weapon: swordSchema,
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 100.4, facing: CombatFacing.LEFT, speed: 0 }, // 0.4m away - within tolerance
            weapon: swordSchema,
          },
          [DAVID_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 100.7, facing: CombatFacing.LEFT, speed: 0 }, // 0.7m away - outside tolerance
            weapon: swordSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose one of the targets within optimal tolerance, not the one outside
        expect([BOB_ID, CHARLIE_ID]).toContain(result.actorId);
        expect(result.actorId).not.toBe(DAVID_ID);
      });

      it('should use wide tolerance (2m) for ranged weapons', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: bowSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 115, facing: CombatFacing.LEFT, speed: 0 }, // 15m away - exactly optimal
            weapon: bowSchema,
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 117, facing: CombatFacing.LEFT, speed: 0 }, // 17m away - within 2m tolerance
            weapon: bowSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose one of the targets within optimal tolerance
        expect([BOB_ID, CHARLIE_ID]).toContain(result.actorId);
      });
    });

    describe('complex multi-target scenarios', () => {
      it('should handle multiple targets with mixed ranges and HP', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: bowSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 110, facing: CombatFacing.LEFT, speed: 0 }, // 10m - within optimal range
            weapon: bowSchema,
            hp: { current: 100, max: 100 }, // Full HP
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 114, facing: CombatFacing.LEFT, speed: 0 }, // 14m - within optimal
            weapon: bowSchema,
            hp: { current: 20, max: 100 }, // Low HP
          },
          [DAVID_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 122, facing: CombatFacing.LEFT, speed: 0 }, // 22m - beyond optimal
            weapon: bowSchema,
            hp: { current: 100, max: 100 }, // Full HP
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should prioritize the low HP target at optimal range over others
        expect(result.actorId).toBe(CHARLIE_ID);
        expect(result.distance).toBe(14);
      });

      it('should handle targets at exactly the same distance', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away
            weapon: swordSchema,
            hp: { current: 100, max: 100 }, // High HP
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // Same 1m distance
            weapon: swordSchema,
            hp: { current: 30, max: 100 }, // Lower HP
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose the target with lowest HP when distances are equal
        expect(result.actorId).toBe(CHARLIE_ID);
        expect(result.distance).toBe(1);
      });
    });

    describe('edge cases', () => {
      it('should handle weapons with min range requirements', () => {
        // Create a custom bow with min range
        const customBowSchema = {
          ...bowSchema,
          urn: 'flux:schema:weapon:test-bow-minrange',
          range: { optimal: 15, falloff: 5, max: 25, min: 5 }, // Min range of 5m
        } as WeaponSchema;

        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: customBowSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 120, facing: CombatFacing.LEFT, speed: 0 }, // 20m away - within valid range
            weapon: customBowSchema,
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }, // 3m away - below min range
            weapon: customBowSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should choose the target within valid range, not the one too close
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(20);
      });

      it('should handle empty combatants map gracefully', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);

        expect(() => {
          chooseTargetForActor(ALICE_ID);
        }).toThrow('No valid targets available');
      });

      it('should handle all targets out of weapon range', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 110, facing: CombatFacing.LEFT, speed: 0 }, // 10m away - out of range for melee
            weapon: swordSchema,
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 120, facing: CombatFacing.LEFT, speed: 0 }, // 20m away - even farther
            weapon: swordSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);
        const result = chooseTargetForActor(ALICE_ID);

        // Should return closest target for movement (defender at 10m vs target2 at 20m)
        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(10);
      });
    });

    describe('performance & hook behavior', () => {
      it('should maintain high throughput in 1v1 combat scenarios', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m apart
            weapon: swordSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);

        // Benchmark throughput: measure operations per second
        const iterations = 5000;
        const actorIds = [ALICE_ID, BOB_ID];

        const startTime = performance.now();

        // Simulate realistic targeting calls - each actor chooses target multiple times
        for (let i = 0; i < iterations; i++) {
          for (const actorId of actorIds) {
            chooseTargetForActor(actorId);
          }
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const totalOperations = iterations * actorIds.length;
        const operationsPerSecond = (totalOperations / totalTime) * 1000;
        const avgTimePerOperation = totalTime / totalOperations;

        console.log(`\n🎯 Targeting Throughput Benchmark (1v1 combat):`);
        console.log(`   Total operations: ${totalOperations.toLocaleString()}`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Operations/second: ${operationsPerSecond.toFixed(0).toLocaleString()}`);
        console.log(`   Avg time/operation: ${avgTimePerOperation.toFixed(3)}ms`);

        // Performance assertions - should handle thousands of operations per second
        expect(operationsPerSecond).toBeGreaterThan(5000); // At least 5K ops/sec for simple 1v1
        expect(avgTimePerOperation).toBeLessThan(0.5); // Less than 0.5ms per operation

        // Verify correctness wasn't sacrificed for speed
        const finalResult = chooseTargetForActor(ALICE_ID);
        expect(finalResult.actorId).toBe(BOB_ID);
        expect(finalResult.distance).toBe(5);
      });

      it('should work with custom dependencies', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 },
            weapon: swordSchema,
          },
        });

        const customDeps = {
          ...DEFAULT_COMBAT_PLANNING_DEPS,
          calculateWeaponApCost: () => 1.5, // Custom AP cost calculation
        };

        const { chooseTargetForActor } = targetingApi(context, testSession, customDeps);
        const result = chooseTargetForActor(ALICE_ID);

        expect(result.actorId).toBe(BOB_ID);
        expect(result.distance).toBe(1);
      });

      it('should return consistent results for multiple calls', () => {
        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 },
            weapon: swordSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);

        const result1 = chooseTargetForActor(ALICE_ID);
        const result2 = chooseTargetForActor(ALICE_ID);

        expect(result1).toEqual(result2);
      });

      it('should handle multiple actors targeting different enemies', () => {
        const ATTACKER2_ID: ActorURN = 'flux:actor:test:attacker2';

        // Create a second attacker actor and add it to the world
        const modifiedAttacker2 = { ...alice, id: ATTACKER2_ID };
        scenario.addActor(modifiedAttacker2);

        const testSession = createTestCombatSession(context, scenario, {
          [ALICE_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            weapon: swordSchema,
          },
          [ATTACKER2_ID]: {
            team: Team.ALPHA,
            position: { coordinate: 114, facing: CombatFacing.RIGHT, speed: 0 }, // Position closer to second target
            weapon: swordSchema,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m from first attacker
            weapon: swordSchema,
          },
          [CHARLIE_ID]: {
            team: Team.BRAVO,
            position: { coordinate: 115, facing: CombatFacing.LEFT, speed: 0 }, // 1m from second attacker
            weapon: swordSchema,
          },
        });

        const { chooseTargetForActor } = targetingApi(context, testSession);

        const result1 = chooseTargetForActor(ALICE_ID);
        const result2 = chooseTargetForActor(ATTACKER2_ID);

        // Each attacker should choose their closest target
        expect(result1.actorId).toBe(BOB_ID); // First attacker chooses first defender
        expect(result2.actorId).toBe(CHARLIE_ID); // Second attacker chooses second target
      });
    });
  });
});

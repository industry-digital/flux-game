import { describe, it, expect, beforeEach, vi } from 'vitest';
import { targetingApi } from './targeting';
import { useCombatScenario } from '../testing/scenario';
import { ActorURN } from '~/types/taxonomy';
import { CombatFacing, Team } from '~/types/combat';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createSpearSchema } from '~/worldkit/schema/weapon/spear';
import { createBowSchema } from '~/worldkit/schema/weapon/bow';
import { registerWeapons } from '../testing/schema';
import { DEFAULT_COMBAT_PLANNING_DEPS } from './deps';

describe('targetingApi', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let swordSchema: ReturnType<typeof createSwordSchema>;
  let spearSchema: ReturnType<typeof createSpearSchema>;
  let bowSchema: ReturnType<typeof createBowSchema>;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const DEFENDER_ID: ActorURN = 'flux:actor:test:defender';
  const TARGET2_ID: ActorURN = 'flux:actor:test:target2';
  const TARGET3_ID: ActorURN = 'flux:actor:test:target3';

  beforeEach(() => {
    context = createTransformerContext();
    context.declareEvent = vi.fn();

    // Create weapon schemas for different test scenarios
    swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test-sword',
      name: 'Test Sword',
      range: { optimal: 1, max: 1 }, // 1m melee weapon
    });

    spearSchema = createSpearSchema({
      urn: 'flux:schema:weapon:test-spear',
      name: 'Test Spear',
      range: { optimal: 2, max: 2 }, // 2m reach weapon
    });

    bowSchema = createBowSchema({
      urn: 'flux:schema:weapon:test-bow',
      name: 'Test Bow',
      range: { optimal: 15, falloff: 5, max: 25 }, // 15m optimal, 25m max ranged weapon
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema, spearSchema, bowSchema]);
  });

  describe('chooseTargetForActor', () => {
    describe('core targeting logic', () => {
      it('should choose the closest enemy within optimal weapon range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - closer
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }, // 3m away - farther
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the closer target (1m away) over the farther one (3m away)
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(1);
      });

      it('should maintain existing target if still valid and within range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // Also 1m away
            },
          },
        });

        // Set attacker to already target the defender
        const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
        attackerCombatant.target = DEFENDER_ID;

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should stick with existing target when it's still valid and within range
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(1);
      });

      it('should switch targets if existing target is out of range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 }, // 100m away - out of range
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - in range
            },
          },
        });

        // Set attacker to target the now out-of-range defender
        const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
        attackerCombatant.target = DEFENDER_ID;

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should switch to in-range target since current target is out of range
        expect(result.actorId).toBe(TARGET2_ID);
        expect(result.distance).toBe(1);
      });

      it('should choose targets within max range if none in optimal range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [bowSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 118, facing: CombatFacing.LEFT, speed: 0 }, // 18m away - beyond optimal but within max
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 122, facing: CombatFacing.LEFT, speed: 0 }, // 22m away - farther but still within max
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the farther target with better HP/distance ratio when both are beyond optimal range
        // 18m target: 100HP/18m = 5.56, 22m target: 100HP/22m = 4.55 (lower, so chosen)
        expect(result.actorId).toBe(TARGET2_ID);
        expect(result.distance).toBe(22);
      });

      it('should ignore dead actors as targets', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // 2m away - farther
              hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Alive
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - closer
              hp: { nat: { cur: 0, max: 100 }, eff: { cur: 0, max: 100 }, mods: {} }, // Dead
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose living target, not the closer dead one
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(2);
      });

      it('should ignore friendly actors as targets', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // 2m away - farther
            },
            [TARGET2_ID]: {
              team: Team.ALPHA, // Same team as attacker - friendly
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - closer
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose enemy, not ally
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(2);
      });

      it('should throw error when actor not found in world projection', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        expect(() => {
          chooseTargetForActor('flux:actor:test:nonexistent' as ActorURN);
        }).toThrow('Actor flux:actor:test:nonexistent not found in world projection');
      });

      it('should throw error when actor not found in combatants', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
          },
        });

        // Add actor to world but not to combatants
        const orphanActorId = 'flux:actor:test:orphan' as ActorURN;
        context.world.actors[orphanActorId] = context.world.actors[ATTACKER_ID]; // Copy existing actor

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        expect(() => {
          chooseTargetForActor(orphanActorId);
        }).toThrow('Actor flux:actor:test:orphan not found in combatants');
      });

      it('should throw error when no valid targets available', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.ALPHA, // Same team as attacker - no enemies
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 },
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        expect(() => {
          chooseTargetForActor(ATTACKER_ID);
        }).toThrow('No valid targets available');
      });

      it('should return closest target when no targets within weapon range (for movement)', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 }, // 50m away - out of range for melee
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should return the out-of-range target so AI can move towards it
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(50);
      });
    });

    describe('weapon-specific behavior', () => {
      it('should handle reach weapons (2m optimal range)', () => {
        const scenario = useCombatScenario(context, {
          weapons: [spearSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: spearSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: spearSchema.urn },
              position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // 2m away - optimal range
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: spearSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - too close for reach
            },
            [TARGET3_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: spearSchema.urn },
              position: { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }, // 3m away - too far for reach
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the target at optimal range (2m), not the closer or farther ones
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(2);
      });

      it('should prioritize low HP targets at optimal range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away
              hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Full HP
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // Same distance
              hp: { nat: { cur: 25, max: 100 }, eff: { cur: 25, max: 100 }, mods: {} }, // Lower HP
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the target with lower HP when both are at optimal range
        expect(result.actorId).toBe(TARGET2_ID);
        expect(result.distance).toBe(1);
      });

      it('should use HP/distance ratio for ranged weapons beyond optimal range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [bowSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 120, facing: CombatFacing.LEFT, speed: 0 }, // 20m away - beyond optimal
              hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Full HP
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 124, facing: CombatFacing.LEFT, speed: 0 }, // 24m away - farther
              hp: { nat: { cur: 10, max: 100 }, eff: { cur: 10, max: 100 }, mods: {} }, // Much lower HP
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the farther target with much better HP/distance ratio
        // 20m target: 100HP/20m = 5.0, 24m target: 10HP/24m = 0.42 (much lower, so chosen)
        expect(result.actorId).toBe(TARGET2_ID);
        expect(result.distance).toBe(24);
      });
    });

    describe('range tolerance', () => {
      it('should use tight tolerance (0.5m) for melee weapons', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away - exactly optimal
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100.4, facing: CombatFacing.LEFT, speed: 0 }, // 0.4m away - within tolerance
            },
            [TARGET3_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100.7, facing: CombatFacing.LEFT, speed: 0 }, // 0.7m away - outside tolerance
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose one of the targets within optimal tolerance, not the one outside
        expect([DEFENDER_ID, TARGET2_ID]).toContain(result.actorId);
        expect(result.actorId).not.toBe(TARGET3_ID);
      });

      it('should use wide tolerance (2m) for ranged weapons', () => {
        const scenario = useCombatScenario(context, {
          weapons: [bowSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 115, facing: CombatFacing.LEFT, speed: 0 }, // 15m away - exactly optimal
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 117, facing: CombatFacing.LEFT, speed: 0 }, // 17m away - within 2m tolerance
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose one of the targets within optimal tolerance
        expect([DEFENDER_ID, TARGET2_ID]).toContain(result.actorId);
      });
    });

    describe('complex multi-target scenarios', () => {
      it('should handle multiple targets with mixed ranges and HP', () => {
        const scenario = useCombatScenario(context, {
          weapons: [bowSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 110, facing: CombatFacing.LEFT, speed: 0 }, // 10m - within optimal range
              hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Full HP
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 114, facing: CombatFacing.LEFT, speed: 0 }, // 14m - within optimal
              hp: { nat: { cur: 20, max: 100 }, eff: { cur: 20, max: 100 }, mods: {} }, // Low HP
            },
            [TARGET3_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: bowSchema.urn },
              position: { coordinate: 122, facing: CombatFacing.LEFT, speed: 0 }, // 22m - beyond optimal
              hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // Full HP
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should prioritize the low HP target at optimal range over others
        expect(result.actorId).toBe(TARGET2_ID);
        expect(result.distance).toBe(14);
      });

      it('should handle targets at exactly the same distance', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m away
              hp: { nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} }, // High HP
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // Same 1m distance
              hp: { nat: { cur: 30, max: 100 }, eff: { cur: 30, max: 100 }, mods: {} }, // Lower HP
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the target with lowest HP when distances are equal
        expect(result.actorId).toBe(TARGET2_ID);
        expect(result.distance).toBe(1);
      });
    });

    describe('edge cases', () => {
      it('should handle weapons with min range requirements', () => {
        // Create a custom bow with min range
        const customBowSchema = createBowSchema({
          urn: 'flux:schema:weapon:test-bow-minrange',
          name: 'Test Bow with Min Range',
          range: { optimal: 15, falloff: 5, max: 25, min: 5 }, // Min range of 5m
        });

        const scenario = useCombatScenario(context, {
          weapons: [customBowSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: customBowSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: customBowSchema.urn },
              position: { coordinate: 120, facing: CombatFacing.LEFT, speed: 0 }, // 20m away - within valid range
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: customBowSchema.urn },
              position: { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }, // 3m away - below min range
            },
          },
        });

        // Register the custom weapon
        registerWeapons(context.schemaManager, [customBowSchema]);

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should choose the target within valid range, not the one too close
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(20);
      });

      it('should handle empty combatants map gracefully', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        expect(() => {
          chooseTargetForActor(ATTACKER_ID);
        }).toThrow('No valid targets available');
      });

      it('should handle all targets out of weapon range', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 110, facing: CombatFacing.LEFT, speed: 0 }, // 10m away - out of range for melee
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 120, facing: CombatFacing.LEFT, speed: 0 }, // 20m away - even farther
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);
        const result = chooseTargetForActor(ATTACKER_ID);

        // Should return closest target for movement (defender at 10m vs target2 at 20m)
        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(10);
      });
    });

    describe('performance & hook behavior', () => {
      it('should maintain high throughput in 1v1 combat scenarios', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m apart
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        // Benchmark throughput: measure operations per second
        const iterations = 5000;
        const actorIds = [ATTACKER_ID, DEFENDER_ID];

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
        const finalResult = chooseTargetForActor(ATTACKER_ID);
        expect(finalResult.actorId).toBe(DEFENDER_ID);
        expect(finalResult.distance).toBe(5);
      });

      it('should work with custom dependencies', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 },
            },
          },
        });

        const customDeps = {
          ...DEFAULT_COMBAT_PLANNING_DEPS,
          calculateWeaponApCost: () => 1.5, // Custom AP cost calculation
        };

        const { chooseTargetForActor } = targetingApi(context, scenario.session, customDeps);
        const result = chooseTargetForActor(ATTACKER_ID);

        expect(result.actorId).toBe(DEFENDER_ID);
        expect(result.distance).toBe(1);
      });

      it('should return consistent results for multiple calls', () => {
        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 },
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        const result1 = chooseTargetForActor(ATTACKER_ID);
        const result2 = chooseTargetForActor(ATTACKER_ID);

        expect(result1).toEqual(result2);
      });

      it('should handle multiple actors targeting different enemies', () => {
        const ATTACKER2_ID: ActorURN = 'flux:actor:test:attacker2';

        const scenario = useCombatScenario(context, {
          weapons: [swordSchema],
          schemaManager: context.schemaManager,
          participants: {
            [ATTACKER_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            },
            [ATTACKER2_ID]: {
              team: Team.ALPHA,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 114, facing: CombatFacing.RIGHT, speed: 0 }, // Position closer to second target
            },
            [DEFENDER_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 }, // 1m from first attacker
            },
            [TARGET2_ID]: {
              team: Team.BRAVO,
              stats: { pow: 10, fin: 10, res: 10 },
              equipment: { weapon: swordSchema.urn },
              position: { coordinate: 115, facing: CombatFacing.LEFT, speed: 0 }, // 1m from second attacker
            },
          },
        });

        const { chooseTargetForActor } = targetingApi(context, scenario.session);

        const result1 = chooseTargetForActor(ATTACKER_ID);
        const result2 = chooseTargetForActor(ATTACKER2_ID);

        // Each attacker should choose their closest target
        expect(result1.actorId).toBe(DEFENDER_ID); // First attacker chooses first defender
        expect(result2.actorId).toBe(TARGET2_ID); // Second attacker chooses second target
      });
    });
  });
});

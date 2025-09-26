import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluateDamageHeuristic,
  evaluateResourceEfficiency,
  evaluatePositioning,
  evaluateMomentum,
  evaluateRisk,
  createHeuristicProfile,
  evaluateNode,
  createScoredPlan,
  createHeuristicProfileFactory
} from './heuristics';
import { PlanNode, TacticalSituation, HeuristicProfile } from '~/types/combat-ai';
import { CombatAction, CombatFacing, Team } from '~/types/combat';
import { CommandType } from '~/types/intent';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createSpearSchema } from '~/worldkit/schema/weapon/spear';
import { createBowSchema } from '~/worldkit/schema/weapon/bow';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';

describe('Heuristic Evaluation System', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let swordSchema: ReturnType<typeof createSwordSchema>;
  let spearSchema: ReturnType<typeof createSpearSchema>;
  let bowSchema: ReturnType<typeof createBowSchema>;
  let situation: TacticalSituation;
  let baseNode: PlanNode;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const TARGET_ID: ActorURN = 'flux:actor:test:target';

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
      range: { optimal: 10, falloff: 5, max: 25 }, // 10m optimal, 5m falloff, 25m max ranged weapon
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema, spearSchema, bowSchema]);

    // Create a base combat scenario for testing
    const scenario = useCombatScenario(context, {
      weapons: [swordSchema],
      schemaManager: context.schemaManager,
      participants: {
        [ATTACKER_ID]: {
          team: Team.ALPHA,
          stats: { pow: 10, fin: 10, res: 10 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          ap: 6.0,
          energy: 20000,
        },
        [TARGET_ID]: {
          team: Team.BRAVO,
          stats: { pow: 10, fin: 10, res: 10 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m away
        },
      },
    });

    const combatant = scenario.session.data.combatants.get(ATTACKER_ID)!;
    const target = scenario.session.data.combatants.get(TARGET_ID)!;

    situation = {
      combatant,
      session: scenario.session,
      weapon: swordSchema,
      validTargets: [{
        actorId: target.actorId,
        combatant: target,
        distance: 5,
        isInRange: false,
        isOptimalRange: false,
      }],
      resources: {
        ap: { current: 6.0, max: 6.0 },
        energy: { current: 20000, max: 20000 },
      },
      assessments: {
        primaryTarget: target.actorId,
        primaryTargetDistance: 5,
        canAttack: true,
        needsRepositioning: true,
        optimalDistance: 1,
      },
    };

    baseNode = {
      id: 'test-node',
      parent: null,
      depth: 1,
      actions: [],
      combatantState: {
        ap: 4.0,
        energy: 18000,
        position: 102,
        facing: 1,
      },
      isTerminal: false,
    };
  });

  describe('evaluateDamageHeuristic', () => {
    it('should score attack actions highly', () => {
      // Create a situation where the melee weapon can actually hit (1m distance)
      // Need to adjust combatant position to be within 1m of target (target at 105m)
      const meleeHitSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          position: { ...situation.combatant.position, coordinate: 104 }, // 1m from target at 105m
        },
        assessments: {
          ...situation.assessments,
          primaryTargetDistance: 1, // Within melee range
        },
      };

      const attackAction: CombatAction = {
        actorId: situation.combatant.actorId,
        command: CommandType.ATTACK,
        args: { target: situation.assessments.primaryTarget },
        cost: { ap: 2.0, energy: 1000 },
      };

      const attackNode = {
        ...baseNode,
        actions: [attackAction],
        isTerminal: true,
      };

      const score = evaluateDamageHeuristic(context, attackNode, meleeHitSituation);
      expect(score).toBeGreaterThan(0);
    });

    it('should give bonus for optimal range attacks', () => {
      const optimalSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          position: { ...situation.combatant.position, coordinate: 104 }, // 1m from target at 105m (optimal)
        },
        assessments: {
          ...situation.assessments,
          primaryTargetDistance: 1, // Within optimal range for melee
        },
      };

      const attackAction: CombatAction = {
        actorId: situation.combatant.actorId,
        command: CommandType.ATTACK,
        args: { target: situation.assessments.primaryTarget },
        cost: { ap: 2.0, energy: 1000 },
      };

      const attackNode = {
        ...baseNode,
        actions: [attackAction],
        isTerminal: true,
      };

      // Create a suboptimal but still valid situation (at max range but not optimal)
      const suboptimalSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          position: { ...situation.combatant.position, coordinate: 101 }, // Same distance as optimal for melee (1m)
        },
        weapon: {
          ...situation.weapon,
          range: { optimal: 1, max: 2 }, // Make max range 2m so we can test suboptimal
        },
      };

      // Test at max range (2m) vs optimal range (1m)
      const suboptimalCombatant = {
        ...suboptimalSituation.combatant,
        position: { ...suboptimalSituation.combatant.position, coordinate: 103 }, // 2m from target at 105m
      };
      const suboptimalSituationAtMaxRange = {
        ...suboptimalSituation,
        combatant: suboptimalCombatant,
      };

      const optimalScore = evaluateDamageHeuristic(context, attackNode, optimalSituation);
      const suboptimalScore = evaluateDamageHeuristic(context, attackNode, suboptimalSituationAtMaxRange);

      expect(optimalScore).toBeGreaterThan(suboptimalScore);
    });

    it('should give bonus for multiple attacks (momentum)', () => {
      // Use a situation where attacks are valid (within range)
      const validSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          position: { ...situation.combatant.position, coordinate: 104 }, // 1m from target at 105m
        },
      };

      const doubleAttackNode = {
        ...baseNode,
        actions: [
          {
            actorId: validSituation.combatant.actorId,
            command: CommandType.ATTACK,
            args: { target: validSituation.assessments.primaryTarget },
            cost: { ap: 2.0, energy: 1000 },
          },
          {
            actorId: validSituation.combatant.actorId,
            command: CommandType.ATTACK,
            args: { target: validSituation.assessments.primaryTarget },
            cost: { ap: 2.0, energy: 1000 },
          },
        ],
        isTerminal: true,
      };

      const singleAttackNode = {
        ...baseNode,
        actions: [
          {
            actorId: validSituation.combatant.actorId,
            command: CommandType.ATTACK,
            args: { target: validSituation.assessments.primaryTarget },
            cost: { ap: 2.0, energy: 1000 },
          },
        ],
        isTerminal: true,
      };

      const doubleScore = evaluateDamageHeuristic(context, doubleAttackNode, validSituation);
      const singleScore = evaluateDamageHeuristic(context, singleAttackNode, validSituation);

      expect(doubleScore).toBeGreaterThan(singleScore);
    });
  });

  describe('evaluateResourceEfficiency', () => {
    it('should prefer efficient AP usage', () => {
      const initialResources = { ap: 6.0, energy: 20000 };

      // Efficient: 2 AP for 1 action (2.0 AP per action)
      const efficientNode = {
        ...baseNode,
        actions: [{ cost: { ap: 2.0 } } as CombatAction],
        combatantState: { ...baseNode.combatantState, ap: 4.0 },
      };

      // Inefficient: 4 AP for 1 action (4.0 AP per action)
      const inefficientNode = {
        ...baseNode,
        actions: [{ cost: { ap: 4.0 } } as CombatAction],
        combatantState: { ...baseNode.combatantState, ap: 2.0 },
      };

      const efficientScore = evaluateResourceEfficiency(efficientNode, initialResources);
      const inefficientScore = evaluateResourceEfficiency(inefficientNode, initialResources);

      expect(efficientScore).toBeGreaterThan(inefficientScore);
    });

    it('should prefer conservative energy usage', () => {
      const initialResources = { ap: 6.0, energy: 20000 };

      const conservativeNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, energy: 18000 }, // 10% usage
      };

      const wastefulNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, energy: 8000 }, // 60% usage
      };

      const conservativeScore = evaluateResourceEfficiency(conservativeNode, initialResources);
      const wastefulScore = evaluateResourceEfficiency(wastefulNode, initialResources);

      expect(conservativeScore).toBeGreaterThan(wastefulScore);
    });

    it('should give bonus for leaving resources for future turns', () => {
      const initialResources = { ap: 6.0, energy: 20000 };

      const reservedNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, ap: 2.0 }, // Leaves 2 AP
      };

      const exhaustedNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, ap: 0.5 }, // Almost no AP left
      };

      const reservedScore = evaluateResourceEfficiency(reservedNode, initialResources);
      const exhaustedScore = evaluateResourceEfficiency(exhaustedNode, initialResources);

      expect(reservedScore).toBeGreaterThan(exhaustedScore);
    });
  });

  describe('evaluatePositioning', () => {
    it('should score melee positioning correctly', () => {
      const meleeSituation = { ...situation, weapon: swordSchema };

      // Close position (good for melee)
      const closeNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 104 }, // 1m from target
      };

      // Far position (bad for melee)
      const farNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 90 }, // 15m from target
      };

      const closeScore = evaluatePositioning(closeNode, meleeSituation);
      const farScore = evaluatePositioning(farNode, meleeSituation);

      expect(closeScore).toBeGreaterThan(farScore);
    });

    it('should score ranged positioning correctly', () => {
      const rangedSituation = { ...situation, weapon: bowSchema };

      // Optimal range position
      const optimalNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 95 }, // 10m from target
      };

      // Too close position (dangerous for ranged)
      const tooCloseNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 104 }, // 1m from target
      };

      const optimalScore = evaluatePositioning(optimalNode, rangedSituation);
      const tooCloseScore = evaluatePositioning(tooCloseNode, rangedSituation);

      expect(optimalScore).toBeGreaterThan(tooCloseScore);
    });

    it('should score reach positioning correctly', () => {
      const reachSituation = { ...situation, weapon: spearSchema };

      // Perfect reach distance
      const perfectNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 103 }, // 2m from target
      };

      // Suboptimal distance
      const suboptimalNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 100 }, // 5m from target
      };

      const perfectScore = evaluatePositioning(perfectNode, reachSituation);
      const suboptimalScore = evaluatePositioning(suboptimalNode, reachSituation);

      expect(perfectScore).toBeGreaterThan(suboptimalScore);
    });
  });

  describe('evaluateMomentum', () => {
    it('should reward logical action sequences', () => {
      const goodSequenceNode = {
        ...baseNode,
        actions: [
          { command: CommandType.ADVANCE } as CombatAction,
          { command: CommandType.ATTACK } as CombatAction,
        ],
      };

      const poorSequenceNode = {
        ...baseNode,
        actions: [
          { command: CommandType.ATTACK } as CombatAction,
          { command: CommandType.ADVANCE } as CombatAction,
        ],
      };

      const goodScore = evaluateMomentum(goodSequenceNode, situation);
      const poorScore = evaluateMomentum(poorSequenceNode, situation);

      expect(goodScore).toBeGreaterThan(poorScore);
    });

    it('should reward plans ending with attacks', () => {
      const attackEndingNode = {
        ...baseNode,
        actions: [
          { command: CommandType.ADVANCE } as CombatAction,
          { command: CommandType.ATTACK } as CombatAction,
        ],
      };

      const moveEndingNode = {
        ...baseNode,
        actions: [
          { command: CommandType.ADVANCE } as CombatAction,
          { command: CommandType.ADVANCE } as CombatAction,
        ],
      };

      const attackScore = evaluateMomentum(attackEndingNode, situation);
      const moveScore = evaluateMomentum(moveEndingNode, situation);

      expect(attackScore).toBeGreaterThan(moveScore);
    });

    it('should prefer optimal action counts', () => {
      const optimalNode = {
        ...baseNode,
        actions: [
          { command: CommandType.ADVANCE } as CombatAction,
          { command: CommandType.ATTACK } as CombatAction,
        ], // 2 actions - good
      };

      const tooManyNode = {
        ...baseNode,
        actions: Array(6).fill({ command: CommandType.ADVANCE } as CombatAction), // 6 actions - too many
      };

      const optimalScore = evaluateMomentum(optimalNode, situation);
      const tooManyScore = evaluateMomentum(tooManyNode, situation);

      expect(optimalScore).toBeGreaterThan(tooManyScore);
    });
  });

  describe('evaluateRisk', () => {
    it('should penalize low resource states', () => {
      const safeNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, ap: 4.0, energy: 15000 },
      };

      const riskyNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, ap: 0.5, energy: 2000 },
      };

      const safeScore = evaluateRisk(safeNode, situation);
      const riskyScore = evaluateRisk(riskyNode, situation);

      expect(safeScore).toBeGreaterThan(riskyScore);
    });

    it('should penalize dangerous positioning for ranged weapons', () => {
      const rangedSituation = { ...situation, weapon: bowSchema };

      const safeNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 90 }, // Far from target
      };

      const dangerousNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 104 }, // Very close to target
      };

      const safeScore = evaluateRisk(safeNode, rangedSituation);
      const dangerousScore = evaluateRisk(dangerousNode, rangedSituation);

      expect(safeScore).toBeGreaterThan(dangerousScore);
    });

    it('should penalize battlefield edge positions', () => {
      const centerNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 150 }, // Center of battlefield
      };

      const edgeNode = {
        ...baseNode,
        combatantState: { ...baseNode.combatantState, position: 5 }, // Near edge
      };

      const centerScore = evaluateRisk(centerNode, situation);
      const edgeScore = evaluateRisk(edgeNode, situation);

      expect(centerScore).toBeGreaterThan(edgeScore);
    });
  });

  describe('createHeuristicProfile', () => {
    it('should create appropriate profile for melee weapons', () => {
      const profile = createHeuristicProfile(swordSchema);

      expect(profile.optimalDistance).toBe(1);
      expect(profile.minSafeDistance).toBe(0);
      expect(profile.maxEffectiveDistance).toBe(1);
      expect(profile.controlsSpace).toBe(false);
      expect(profile.priorities.damageWeight).toBeGreaterThan(profile.priorities.riskWeight);
    });

    it('should create appropriate profile for ranged weapons', () => {
      const profile = createHeuristicProfile(bowSchema);

      expect(profile.optimalDistance).toBe(10);
      expect(profile.minSafeDistance).toBe(5);
      expect(profile.maxEffectiveDistance).toBe(25); // optimal + 3 * falloff
      expect(profile.controlsSpace).toBe(false);
      expect(profile.priorities.riskWeight).toBeGreaterThan(0.2); // Higher risk consideration
    });

    it('should create appropriate profile for reach weapons', () => {
      const profile = createHeuristicProfile(spearSchema);

      expect(profile.optimalDistance).toBe(2);
      expect(profile.minSafeDistance).toBe(1);
      expect(profile.maxEffectiveDistance).toBe(2);
      expect(profile.controlsSpace).toBe(true);
      expect(profile.priorities.positioningWeight).toBeGreaterThan(0.3); // High positioning focus
    });
  });

  describe('evaluateNode', () => {
    it('should compute composite score using profile weights', () => {
      const profile = createHeuristicProfile(swordSchema);
      const attackNode = {
        ...baseNode,
        actions: [{ command: CommandType.ATTACK } as CombatAction],
        isTerminal: true,
      };

      const score = evaluateNode(context, attackNode, situation, profile);

      expect(score).toBeGreaterThan(0);
      expect(attackNode.score).toBe(score); // Should cache score in node
    });

    it('should weight different heuristics according to profile', () => {
      // Create a situation where the attack can actually hit
      const hitSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          position: { ...situation.combatant.position, coordinate: 104 }, // 1m from target at 105m
        },
        assessments: {
          ...situation.assessments,
          primaryTargetDistance: 1, // Within melee range
        },
      };

      const damageHeavyProfile: HeuristicProfile = {
        priorities: {
          damageWeight: 0.8,
          efficiencyWeight: 0.05,
          positioningWeight: 0.05,
          momentumWeight: 0.05,
          riskWeight: 0.05,
        },
        optimalDistance: 1,
        minSafeDistance: 0,
        maxEffectiveDistance: 1,
        controlsSpace: false,
      };

      const balancedProfile: HeuristicProfile = {
        priorities: {
          damageWeight: 0.2,
          efficiencyWeight: 0.2,
          positioningWeight: 0.2,
          momentumWeight: 0.2,
          riskWeight: 0.2,
        },
        optimalDistance: 1,
        minSafeDistance: 0,
        maxEffectiveDistance: 1,
        controlsSpace: false,
      };

      const attackNode = {
        ...baseNode,
        actions: [{ command: CommandType.ATTACK } as CombatAction],
        isTerminal: true,
      };

      const damageScore = evaluateNode(context, attackNode, hitSituation, damageHeavyProfile);
      const balancedScore = evaluateNode(context, attackNode, hitSituation, balancedProfile);

      // Damage-heavy profile should score attack actions higher
      expect(damageScore).toBeGreaterThan(balancedScore);
    });
  });

  describe('createScoredPlan', () => {
    it('should create scored plan with detailed breakdown', () => {
      const profile = createHeuristicProfile(swordSchema);
      const attackNode = {
        ...baseNode,
        actions: [{ command: CommandType.ATTACK } as CombatAction],
        isTerminal: true,
      };

      const scoredPlan = createScoredPlan(context, attackNode, situation, profile);

      expect(scoredPlan.actions).toHaveLength(1);
      expect(scoredPlan.score).toBeGreaterThan(0);
      expect(scoredPlan.scoreBreakdown.damage).toBeDefined();
      expect(scoredPlan.scoreBreakdown.efficiency).toBeDefined();
      expect(scoredPlan.scoreBreakdown.positioning).toBeDefined();
      expect(scoredPlan.scoreBreakdown.momentum).toBeDefined();
      expect(scoredPlan.scoreBreakdown.risk).toBeDefined();
      expect(scoredPlan.scoreBreakdown.total).toBe(scoredPlan.score);
    });

    it('should copy actions array (immutability)', () => {
      const profile = createHeuristicProfile(swordSchema);
      const originalActions = [{ command: CommandType.ATTACK } as CombatAction];
      const attackNode = {
        ...baseNode,
        actions: originalActions,
        isTerminal: true,
      };

      const scoredPlan = createScoredPlan(context, attackNode, situation, profile);

      expect(scoredPlan.actions).not.toBe(originalActions); // Different array reference
      expect(scoredPlan.actions).toEqual(originalActions); // Same content
    });
  });

  describe('createHeuristicProfileFactory', () => {
    it('should create factory with forWeapon and custom methods', () => {
      const factory = createHeuristicProfileFactory();

      expect(factory.forWeapon).toBeDefined();
      expect(factory.custom).toBeDefined();
    });

    it('should create profiles via factory', () => {
      const factory = createHeuristicProfileFactory();
      const profile = factory.forWeapon(swordSchema);

      expect(profile.optimalDistance).toBe(1);
      expect(profile.priorities).toBeDefined();
    });

    it('should create custom profiles with overrides', () => {
      const factory = createHeuristicProfileFactory();
      const baseProfile = factory.forWeapon(swordSchema);

      const customProfile = factory.custom(baseProfile, {
        optimalDistance: 5,
        priorities: {
          damageWeight: 0.9,
          efficiencyWeight: 0.1,
          positioningWeight: 0.0,
          momentumWeight: 0.0,
          riskWeight: 0.0,
        },
      });

      expect(customProfile.optimalDistance).toBe(5);
      expect(customProfile.priorities.damageWeight).toBe(0.9);
      expect(customProfile.priorities.efficiencyWeight).toBe(0.1); // Overridden value
    });
  });

  describe('Gap-Closing Scoring Improvements', () => {
    it('should give zero damage score for non-ranged STRIKE actions beyond optimal range', () => {
      // Create a melee weapon scenario where STRIKE is attempted beyond range
      const meleeWeapon = createSwordSchema({
        urn: 'flux:schema:weapon:melee-test',
        name: 'Melee Test Weapon',
        range: { optimal: 1, max: 1 }, // 1m optimal, no falloff (non-ranged)
      });

      const outOfRangeSituation = {
        ...situation,
        weapon: meleeWeapon,
        assessments: {
          ...situation.assessments,
          primaryTargetDistance: 10, // 10m away, far beyond optimal range
        },
      };

      // Plan that tries to STRIKE without getting into range
      const badStrikeNode = {
        ...baseNode,
        actions: [
          {
            actorId: situation.combatant.actorId,
            command: CommandType.STRIKE,
            args: { target: situation.assessments.primaryTarget },
            cost: { ap: 2.0, energy: 1000 },
          },
        ],
        isTerminal: true,
      };

      const damageScore = evaluateDamageHeuristic(context, badStrikeNode, outOfRangeSituation);

      // Should be zero because non-ranged weapon can't effectively strike at 10m
      expect(damageScore).toBe(0);
    });

    it('should reward gap-closing movement with positioning and momentum bonuses', () => {
      // Create scenario with combatant far from target
      const gapClosingSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        assessments: {
          ...situation.assessments,
          primaryTargetDistance: 50, // 50m away
        },
      };

      // Update validTargets to reflect the distance
      gapClosingSituation.validTargets = [{
        ...gapClosingSituation.validTargets[0],
        combatant: {
          ...gapClosingSituation.validTargets[0].combatant,
          position: { coordinate: 150, facing: -1, speed: 0 }, // 50m away
        },
      }];

      // Plan that makes significant progress toward target (30m movement)
      const gapClosingNode = {
        ...baseNode,
        actions: [
          {
            actorId: situation.combatant.actorId,
            command: CommandType.ADVANCE,
            args: { type: 'distance', distance: 30, direction: 1 },
            cost: { ap: 4.0, energy: 0 },
          },
        ],
        combatantState: {
          ...baseNode.combatantState,
          position: 130, // Moved from 100 to 130
          ap: 2.0, // 6.0 - 4.0
        },
        isTerminal: false,
      };

      // Plan that makes no progress
      const noProgressNode = {
        ...baseNode,
        actions: [
          {
            actorId: situation.combatant.actorId,
            command: CommandType.DEFEND,
            args: {},
            cost: { ap: 2.0, energy: 0 },
          },
        ],
        isTerminal: true,
      };

      const gapClosingPositioning = evaluatePositioning(gapClosingNode, gapClosingSituation);
      const noProgressPositioning = evaluatePositioning(noProgressNode, gapClosingSituation);

      const gapClosingMomentum = evaluateMomentum(gapClosingNode, gapClosingSituation);
      const noProgressMomentum = evaluateMomentum(noProgressNode, gapClosingSituation);

      // Gap-closing should score better than no progress
      expect(gapClosingPositioning).toBeGreaterThan(noProgressPositioning);
      expect(gapClosingMomentum).toBeGreaterThan(noProgressMomentum);

      console.log(`Gap-closing positioning: ${gapClosingPositioning}, momentum: ${gapClosingMomentum}`);
      console.log(`No progress positioning: ${noProgressPositioning}, momentum: ${noProgressMomentum}`);
    });

    it('should create viable scores for partial progress plans', () => {
      // Test the exact scenario from our sandbox: 62m apart, can only move 37m
      const sandboxSituation = {
        ...situation,
        weapon: createSwordSchema({
          urn: 'flux:schema:weapon:sandbox-sword',
          name: 'Sandbox Sword',
          range: { optimal: 1, max: 1 }, // Non-ranged melee weapon
        }),
        combatant: {
          ...situation.combatant,
          position: { coordinate: 200, facing: -1, speed: 0 }, // Bob's position
        },
        validTargets: [{
          actorId: 'flux:actor:alice' as ActorURN,
          combatant: {
            ...situation.validTargets[0].combatant,
            position: { coordinate: 138, facing: 1, speed: 0 }, // Alice's position
          },
          distance: 62,
          isInRange: false,
          isOptimalRange: false,
        }],
        assessments: {
          ...situation.assessments,
          primaryTarget: 'flux:actor:alice' as ActorURN,
          primaryTargetDistance: 62,
          canAttack: false,
          needsRepositioning: true,
          optimalDistance: 1,
        },
      };

      // Plan that moves 37m (60% progress) like our test showed
      const partialProgressNode = {
        ...baseNode,
        actions: [
          {
            actorId: situation.combatant.actorId,
            command: CommandType.ADVANCE,
            args: { type: 'distance', distance: 37, direction: -1 },
            cost: { ap: 5.9, energy: 0 },
          },
        ],
        combatantState: {
          ...baseNode.combatantState,
          position: 163, // 200 - 37 = 163 (25m from Alice at 138)
          ap: 0.1, // 6.0 - 5.9
        },
        isTerminal: false,
      };

      const profile = createHeuristicProfile(sandboxSituation.weapon);
      const totalScore = evaluateNode(context, partialProgressNode, sandboxSituation, profile);

      console.log(`\n🏟️ Sandbox partial progress plan score: ${totalScore.toFixed(1)}`);
      console.log(`   Damage: ${evaluateDamageHeuristic(context, partialProgressNode, sandboxSituation).toFixed(1)}`);
      console.log(`   Positioning: ${evaluatePositioning(partialProgressNode, sandboxSituation).toFixed(1)}`);
      console.log(`   Momentum: ${evaluateMomentum(partialProgressNode, sandboxSituation).toFixed(1)}`);
      console.log(`   Efficiency: ${evaluateResourceEfficiency(partialProgressNode, { ap: 6.0, energy: 20000 }).toFixed(1)}`);
      console.log(`   Risk: ${evaluateRisk(partialProgressNode, sandboxSituation).toFixed(1)}`);

      // The plan should score above the minimum threshold (10)
      expect(totalScore).toBeGreaterThan(10);
    });
  });
});

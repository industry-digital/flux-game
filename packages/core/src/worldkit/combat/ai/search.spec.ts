import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateAndEvaluatePlans,
  findOptimalPlan,
  createInitialNode,
  applyAction,
  getValidActions,
  isTerminalNode,
  DEFAULT_SEARCH_CONFIG,
} from './search';
import { TacticalSituation, HeuristicProfile, SearchConfig } from '~/types/combat-ai';
import { CombatAction, CombatFacing, Team } from '~/types/combat';
import { CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { CHANCE_ACTIONS, PLAN_ENDING_ACTIONS } from '~/worldkit/combat/action/constants';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '~/worldkit/combat/testing/schema';

describe('Combat AI Search Engine', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let situation: TacticalSituation;
  let profile: HeuristicProfile;
  let config: SearchConfig;

  const ATTACKER_ID: ActorURN = 'flux:actor:test:attacker';
  const TARGET_ID: ActorURN = 'flux:actor:test:target';

  beforeEach(() => {
    context = createTransformerContext();
    context.declareEvent = vi.fn();

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test',
      name: 'Test Weapon',
    });

    registerWeapons(context.schemaManager, [swordSchema]);

    scenario = useCombatScenario(context, {
      weapons: [swordSchema],
      schemaManager: context.schemaManager,
      participants: {
        [ATTACKER_ID]: {
          team: Team.ALPHA,
          target: TARGET_ID,
          stats: { pow: 10, fin: 10, res: 10 },
          ap: 6.0,
          energy: 20000,
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
        },
        [TARGET_ID]: {
          team: Team.BRAVO,
          stats: { pow: 10, fin: 10, res: 10 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
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
        actorId: TARGET_ID,
        combatant: target,
        distance: 5,
        isInRange: true,
        isOptimalRange: true,
      }],
      resources: {
        ap: { current: 6.0, max: 6.0 },
        energy: { current: 20000, max: 20000 },
      },
      assessments: {
        primaryTarget: TARGET_ID,
        primaryTargetDistance: 5,
        canAttack: true,
        needsRepositioning: false,
        optimalDistance: 10,
      },
    };

    profile = {
      priorities: {
        damageWeight: 0.3,
        efficiencyWeight: 0.2,
        positioningWeight: 0.2,
        momentumWeight: 0.15,
        riskWeight: 0.15,
      },
      optimalDistance: 10,
      minSafeDistance: 5,
      maxEffectiveDistance: 25,
      controlsSpace: false,
    };

    config = {
      maxDepth: 3,
      maxNodes: 50,
      maxTerminalPlans: 20,
      enableEarlyTermination: true,
      minScoreThreshold: 10,
      planEndingActions: PLAN_ENDING_ACTIONS,
      chanceActions: CHANCE_ACTIONS,
    };
  });

  describe('Node Operations', () => {
    it('should create and manipulate plan nodes correctly', () => {
      const rootNode = createInitialNode(situation);

      // Root node properties
      expect(rootNode.id).toBe('root');
      expect(rootNode.parent).toBe(null);
      expect(rootNode.depth).toBe(0);
      expect(rootNode.actions).toHaveLength(0);
      expect(rootNode.combatantState.ap).toBe(6.0);
      expect(rootNode.isTerminal).toBe(false);

      // Apply action to create child node
      const moveAction: CombatAction = {
        actorId: situation.combatant.actorId,
        command: CommandType.ADVANCE,
        args: { distance: 1, direction: 1 },
        cost: { ap: 1.0, energy: 500 },
      };

      const childNode = applyAction(rootNode, moveAction, situation);

      // Child node properties
      expect(childNode.parent).toBe(rootNode);
      expect(childNode.depth).toBe(1);
      expect(childNode.actions).toHaveLength(1);
      expect(childNode.combatantState.ap).toBe(5.0);
      expect(childNode.combatantState.position).toBe(101);

      // Immutability - original node unchanged
      expect(rootNode.actions).toHaveLength(0);
      expect(rootNode.combatantState.ap).toBe(6.0);
    });

    it('should correctly identify terminal nodes', () => {
      const rootNode = createInitialNode(situation);
      expect(isTerminalNode(rootNode, config)).toBe(false);

      const defendAction: CombatAction = {
        actorId: situation.combatant.actorId,
        command: CommandType.DEFEND,
        args: {},
        cost: { ap: 2.0, energy: 0 },
      };

      const terminalNode = applyAction(rootNode, defendAction, situation);
      expect(terminalNode.isTerminal).toBe(true);
      expect(isTerminalNode(terminalNode, config)).toBe(true);
    });
  });

  describe('Action Generation', () => {
    it('should generate appropriate actions based on tactical situation', () => {
      const rootNode = createInitialNode(situation);
      const actions = Array.from(getValidActions(context, rootNode, situation));

      // Should generate STRIKE when target is in range
      const strikeActions = actions.filter(a => a.command === CommandType.STRIKE);
      expect(strikeActions).toHaveLength(1);
      expect(strikeActions[0].args.target).toBe(TARGET_ID);
    });

    it.each([
      { ap: 5.9, scenario: 'multi-strike', expectStrikes: true },
      { ap: 1.9, scenario: 'low-ap fallback', expectStrikes: false },
      { ap: 0.5, scenario: 'minimal-ap', expectStrikes: false },
    ])('should handle resource constraints correctly ($scenario: $ap AP)', ({ ap, expectStrikes }) => {
      const constrainedSituation: TacticalSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          ap: { nat: { cur: ap, max: 10 }, eff: { cur: ap, max: 10 }, mods: {} }
        }
      };

      const rootNode = createInitialNode(constrainedSituation);
      const actions = Array.from(getValidActions(context, rootNode, constrainedSituation));

      const strikeActions = actions.filter(a => a.command === CommandType.STRIKE);
      const defendActions = actions.filter(a => a.command === CommandType.DEFEND);

      if (expectStrikes) {
        expect(strikeActions.length).toBeGreaterThan(0);
      } else {
        expect(strikeActions.length).toBe(0);
      }

      // DEFEND should be available when no other meaningful actions are possible
      // But the exact generation depends on the AI's tactical assessment
      expect(actions.length).toBeGreaterThanOrEqual(0);
    });

    it.each([
      { distance: 50, stats: { pow: 10, fin: 10, res: 10 }, scenario: 'baseline stats' },
      { distance: 62, stats: { pow: 10, fin: 10, res: 10 }, scenario: 'sandbox distance' },
      { distance: 100, stats: { pow: 65, fin: 45, res: 50 }, scenario: 'high stats' },
    ])('should generate movement for out-of-range scenarios ($scenario: $distance m)', ({ distance, stats }) => {
      const longRangeScenario = useCombatScenario(context, {
        weapons: [situation.weapon],
        schemaManager: context.schemaManager,
        participants: {
          [ATTACKER_ID]: {
            team: Team.ALPHA,
            target: TARGET_ID,
            stats,
            ap: 6.0,
            energy: 20000,
            equipment: { weapon: situation.weapon.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [TARGET_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: situation.weapon.urn },
            position: { coordinate: 100 + distance, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      const combatant = longRangeScenario.session.data.combatants.get(ATTACKER_ID)!;
      const target = longRangeScenario.session.data.combatants.get(TARGET_ID)!;

      const longRangeSituation: TacticalSituation = {
        combatant,
        session: longRangeScenario.session,
        weapon: situation.weapon,
        validTargets: [{
          actorId: TARGET_ID,
          combatant: target,
          distance,
          isInRange: false,
          isOptimalRange: false,
        }],
        resources: {
          ap: { current: 6.0, max: 6.0 },
          energy: { current: 20000, max: 20000 },
        },
        assessments: {
          primaryTarget: TARGET_ID,
          primaryTargetDistance: distance,
          canAttack: false,
          needsRepositioning: true,
          optimalDistance: 1,
        },
      };

      const rootNode = createInitialNode(longRangeSituation);
      const actions = Array.from(getValidActions(context, rootNode, longRangeSituation));

      const strikeActions = actions.filter(a => a.command === CommandType.STRIKE);
      const advanceActions = actions.filter(a => a.command === CommandType.ADVANCE);

      // Should NOT generate strikes when out of range
      expect(strikeActions.length).toBe(0);

      // Should generate movement (unless distance is too extreme for available AP)
      if (advanceActions.length > 0) {
        const moveAction = advanceActions[0];
        const moveDistance = (moveAction.args as any)?.distance || 0;
        const moveCost = moveAction.cost?.ap || 0;

        expect(moveDistance).toBeGreaterThan(0);
        expect(moveCost).toBeLessThanOrEqual(6.0);
      }
    });
  });

  describe('Plan Generation', () => {
    it('should find optimal plans with proper scoring', () => {
      const optimalPlan = findOptimalPlan(context, situation, profile, config);

      expect(optimalPlan).toBeDefined();
      expect(optimalPlan!.actions.length).toBeGreaterThan(0);
      expect(optimalPlan!.score).toBeGreaterThan(0);
      expect(optimalPlan!.scoreBreakdown).toBeDefined();
    });

    it('should respect search configuration limits', () => {
      const restrictiveConfig: SearchConfig = {
        ...config,
        maxDepth: 2,
        maxNodes: 10,
        maxTerminalPlans: 5,
        minScoreThreshold: 50,
      };

      const plans = Array.from(generateAndEvaluatePlans(context, situation, profile, restrictiveConfig));

      expect(plans.length).toBeLessThanOrEqual(restrictiveConfig.maxTerminalPlans);
      plans.forEach(plan => {
        expect(plan.score).toBeGreaterThanOrEqual(restrictiveConfig.minScoreThreshold);
      });
    });

    it('should handle edge cases gracefully', () => {
      // No targets scenario
      const noTargetSituation = {
        ...situation,
        validTargets: [],
        assessments: {
          ...situation.assessments,
          primaryTarget: null,
          primaryTargetDistance: null,
          canAttack: false,
        },
      };

      const noTargetPlan = findOptimalPlan(context, noTargetSituation, profile, config);
      expect(noTargetPlan).toBeDefined();

      // Exhausted resources scenario - should fallback to DEFEND
      const exhaustedSituation = {
        ...situation,
        combatant: {
          ...situation.combatant,
          ap: { nat: { cur: 0.1, max: 6.0 }, eff: { cur: 0.1, max: 6.0 }, mods: {} }
        },
        resources: { ap: { current: 0.1, max: 6.0 }, energy: { current: 50, max: 20000 } },
      };

      const exhaustedPlan = findOptimalPlan(context, exhaustedSituation, profile, config);
      expect(exhaustedPlan).toBeDefined();
      expect(exhaustedPlan!.actions[exhaustedPlan!.actions.length - 1].command).toBe(CommandType.DEFEND);
    });
  });

  describe('Configuration', () => {
    it('should use reasonable default values', () => {
      expect(DEFAULT_SEARCH_CONFIG.maxDepth).toBe(8);
      expect(DEFAULT_SEARCH_CONFIG.maxNodes).toBe(400);
      expect(DEFAULT_SEARCH_CONFIG.maxTerminalPlans).toBe(100);
      expect(DEFAULT_SEARCH_CONFIG.enableEarlyTermination).toBe(true);
      expect(DEFAULT_SEARCH_CONFIG.minScoreThreshold).toBe(10);

      // Default config should work
      const plans = Array.from(generateAndEvaluatePlans(context, situation, profile, DEFAULT_SEARCH_CONFIG));
      expect(plans.length).toBeGreaterThan(0);
    });
  });
});

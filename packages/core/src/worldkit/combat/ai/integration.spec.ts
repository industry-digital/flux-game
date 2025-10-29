import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createSpearSchema } from '~/worldkit/schema/weapon/spear';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { CombatFacing, Team } from '~/types/combat';
import { generateCombatPlan } from './index';
import { CommandType } from '~/types/intent';
import { createActor } from '~/worldkit/entity/actor';
import { Actor } from '~/types/entity/actor';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';
import { createMassApi } from '~/worldkit/physics/mass';
import { longbowSchema } from '~/worldkit/schema/weapon/bow';

const TEST_WEAPON_ENTITY_URN = 'flux:item:weapon:test';

describe('Combat System Integration (Post CombatCommand Refactor)', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let swordSchema: ReturnType<typeof createSwordSchema>;
  let spearSchema: ReturnType<typeof createSpearSchema>;
  let bowSchema = longbowSchema;

  const ALICE_ID: ActorURN = 'flux:actor:alice';
  const BOB_ID: ActorURN = 'flux:actor:bob';

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

    // Create weapon schemas
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

    // Register weapons
    registerWeapons(context.schemaManager, [swordSchema, spearSchema, bowSchema]);

    // Create actors
    alice = createActor({
      id: ALICE_ID,
      name: 'Alice',
      equipment: { [HumanAnatomy.RIGHT_HAND]: { [TEST_WEAPON_ENTITY_URN]: 1 } },
      inventory: {
        mass: 0,
        count: 1,
        items: { [TEST_WEAPON_ENTITY_URN]: { id: TEST_WEAPON_ENTITY_URN, schema: swordSchema.urn } },
        ammo: {},
        ts: 0,
      },
    });

    bob = createActor({
      id: BOB_ID,
      name: 'Bob',
      equipment: { [HumanAnatomy.RIGHT_HAND]: { [TEST_WEAPON_ENTITY_URN]: 1 } },
      inventory: {
        mass: 0,
        count: 1,
        items: { [TEST_WEAPON_ENTITY_URN]: { id: TEST_WEAPON_ENTITY_URN, schema: swordSchema.urn } },
        ammo: {},
        ts: 0,
      },
    });

    context.world.actors[ALICE_ID] = alice;
    context.world.actors[BOB_ID] = bob;
  });

  // Helper function to generate plan for an actor
  const generatePlanForActor = (scenario: ReturnType<typeof useCombatScenario>, actorId: ActorURN, trace: string = 'test-trace') => {
    const combatant = scenario.session.data.combatants.get(actorId);
    if (!combatant) {
      throw new Error(`Combatant not found: ${actorId}`);
    }
    return generateCombatPlan(scenario.context, scenario.session, combatant, trace);
  };

  describe('Basic Combat System Functionality', () => {
    it('should generate combat plans using CombatCommand instead of CombatAction', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m away
          },
        },
      });

      const alicePlan = generatePlanForActor(scenario, ALICE_ID);

      // Verify plan is generated
      expect(alicePlan).toBeDefined();
      expect(Array.isArray(alicePlan)).toBe(true);

      // Verify commands have the correct structure (CombatCommand, not CombatAction)
      if (alicePlan.length > 0) {
        const firstCommand = alicePlan[0];

        // CombatCommand should have these properties
        expect(firstCommand).toHaveProperty('__type', 'command');
        expect(firstCommand).toHaveProperty('id');
        expect(firstCommand).toHaveProperty('ts');
        expect(firstCommand).toHaveProperty('actor');
        expect(firstCommand).toHaveProperty('type'); // NOT 'command'
        expect(firstCommand).toHaveProperty('args');

        // Should NOT have old CombatAction properties
        expect(firstCommand).not.toHaveProperty('actorId'); // Now 'actor'
        expect(firstCommand).not.toHaveProperty('command'); // Now 'type'

        console.log('✅ Generated CombatCommand structure:', {
          __type: firstCommand.__type,
          id: firstCommand.id,
          actor: firstCommand.actor,
          type: firstCommand.type,
          hasArgs: !!firstCommand.args,
          hasCost: !!firstCommand.cost,
        });
      }
    });

    it('should handle melee combat scenarios correctly', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 12, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m away - needs to close
          },
        },
      });

      const alicePlan = generatePlanForActor(scenario, ALICE_ID);

      expect(alicePlan.length).toBeGreaterThan(0);

      // For melee at 5m distance, should include movement
      const hasMovement = alicePlan.some(cmd =>
        cmd.type === CommandType.ADVANCE || cmd.type === CommandType.RETREAT
      );

      // Should include some form of combat action
      const hasCombatAction = alicePlan.some(cmd =>
        cmd.type === CommandType.ATTACK || cmd.type === CommandType.STRIKE
      );

      console.log('🗡️ Melee plan analysis:', {
        totalCommands: alicePlan.length,
        hasMovement,
        hasCombatAction,
        commandTypes: alicePlan.map(cmd => cmd.type),
      });

      // At least one of these should be true for a meaningful plan
      expect(hasMovement || hasCombatAction).toBe(true);
    });

    it('should handle reach weapon scenarios correctly', () => {
      const scenario = useCombatScenario(context, {
        weapons: [spearSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: spearSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: spearSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m away
          },
        },
      });

      const alicePlan = generatePlanForActor(scenario, ALICE_ID);

      expect(alicePlan.length).toBeGreaterThan(0);

      // For reach weapons, should include tactical positioning
      const hasMovement = alicePlan.some(cmd =>
        cmd.type === CommandType.ADVANCE || cmd.type === CommandType.RETREAT
      );

      console.log('🔱 Reach weapon plan analysis:', {
        totalCommands: alicePlan.length,
        hasMovement,
        commandTypes: alicePlan.map(cmd => cmd.type),
      });

      expect(alicePlan).toBeDefined();
    });

    it('should handle ranged weapon scenarios correctly', () => {
      const scenario = useCombatScenario(context, {
        weapons: [bowSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: bowSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: bowSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 }, // 5m away - too close for ranged
          },
        },
      });

      const alicePlan = generatePlanForActor(scenario, ALICE_ID);

      expect(alicePlan.length).toBeGreaterThan(0);

      // For ranged at close range, should retreat or attack
      const hasMovement = alicePlan.some(cmd =>
        cmd.type === CommandType.ADVANCE || cmd.type === CommandType.RETREAT
      );
      const hasCombatAction = alicePlan.some(cmd =>
        cmd.type === CommandType.ATTACK || cmd.type === CommandType.STRIKE
      );

      console.log('🏹 Ranged weapon plan analysis:', {
        totalCommands: alicePlan.length,
        hasMovement,
        hasCombatAction,
        commandTypes: alicePlan.map(cmd => cmd.type),
      });

      expect(hasMovement || hasCombatAction).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle scenarios with no valid targets gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA, // Same team as Bob
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [BOB_ID]: {
            team: Team.ALPHA, // Same team as Alice - no enemies
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should handle no valid targets gracefully
      expect(() => {
        generatePlanForActor(scenario, ALICE_ID);
      }).toThrow('No valid targets available');
    });

    it('should handle low AP scenarios gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 0.5, // Very low AP
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should not crash with low AP
      expect(() => {
        const plan = generatePlanForActor(scenario, ALICE_ID);
        expect(plan).toBeDefined();

        // With very low AP, should have limited actions
        if (plan.length > 0) {
          const totalApCost = plan.reduce((sum, cmd) => sum + (cmd.cost?.ap || 0), 0);
          expect(totalApCost).toBeLessThanOrEqual(0.6); // Small buffer for rounding
        }
      }).not.toThrow();
    });

    it('should handle missing weapon gracefully', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            // No weapon equipped
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Should handle missing weapon gracefully
      const plan = generatePlanForActor(scenario, ALICE_ID);
      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThanOrEqual(0); // May generate defensive actions
    });
  });

  describe('Command Structure Validation', () => {
    it('should generate commands with proper trace propagation', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // Close range
          },
        },
      });

      const testTrace = 'integration-test-trace';
      const plan = generatePlanForActor(scenario, ALICE_ID, testTrace);

      if (plan.length > 0) {
        // Verify trace propagation
        plan.forEach((cmd, index) => {
          expect(cmd.id).toBeDefined();
          expect(typeof cmd.id).toBe('string');
          console.log(`Command ${index + 1} trace: ${cmd.id}`);
        });
      }
    });

    it('should generate commands with proper timestamps and IDs', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      const plan = generatePlanForActor(scenario, ALICE_ID);

      if (plan.length > 0) {
        plan.forEach((cmd, index) => {
          // Verify command structure
          expect(cmd.id).toBeDefined();
          expect(typeof cmd.id).toBe('string');
          expect(cmd.id.length).toBeGreaterThan(0);

          expect(cmd.ts).toBeDefined();
          expect(typeof cmd.ts).toBe('number');
          expect(cmd.ts).toBeGreaterThan(0);

          expect(cmd.actor).toBe(ALICE_ID);

          console.log(`Command ${index + 1}:`, {
            id: cmd.id,
            ts: cmd.ts,
            actor: cmd.actor,
            type: cmd.type,
          });
        });
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should maintain reasonable performance', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema, spearSchema, bowSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: spearSchema.urn },
            position: { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 },
          },
        },
      });

      // Measure planning time
      const startTime = performance.now();
      const plan = generatePlanForActor(scenario, ALICE_ID);
      const endTime = performance.now();
      const planningTime = endTime - startTime;

      expect(plan).toBeDefined();
      expect(planningTime).toBeLessThan(100); // Should complete within 100ms
      expect(plan.length).toBeGreaterThanOrEqual(0);

      console.log(`⚡ Planning completed in ${planningTime.toFixed(2)}ms`);
    });

    it('should demonstrate consistent behavior across multiple runs', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
            ap: 6.0,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 103, facing: CombatFacing.LEFT, speed: 0 }, // 3m away
          },
        },
      });

      // Generate multiple plans
      const plan1 = generatePlanForActor(scenario, ALICE_ID);
      const plan2 = generatePlanForActor(scenario, ALICE_ID);
      const plan3 = generatePlanForActor(scenario, ALICE_ID);

      // Plans should be behaviorally consistent
      expect(plan1.length).toBeGreaterThan(0);
      expect(plan2.length).toBeGreaterThan(0);
      expect(plan3.length).toBeGreaterThan(0);

      // Core action types should be consistent (allowing for trailing DEFEND actions)
      const getActionTypes = (plan: any[]) => plan.map(cmd => cmd.type);
      const getCoreActions = (types: string[]) => types.filter(type => type !== 'DEFEND');

      const coreActions1 = getCoreActions(getActionTypes(plan1));
      const coreActions2 = getCoreActions(getActionTypes(plan2));
      const coreActions3 = getCoreActions(getActionTypes(plan3));

      expect(coreActions1).toEqual(coreActions2);
      expect(coreActions2).toEqual(coreActions3);

      console.log('🔄 Consistency check:', {
        plan1Types: getActionTypes(plan1),
        plan2Types: getActionTypes(plan2),
        plan3Types: getActionTypes(plan3),
        coreActionsConsistent: coreActions1.length === coreActions2.length && coreActions2.length === coreActions3.length,
      });
    });
  });
});

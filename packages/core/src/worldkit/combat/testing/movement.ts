import { vi } from 'vitest';
import { createAdvanceMethod, DEFAULT_ADVANCE_DEPS, AdvanceDependencies } from '../action/advance';
import { createRetreatMethod, DEFAULT_RETREAT_DEPS, RetreatDependencies } from '../action/retreat';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { Battlefield, CombatFacing, Team } from '~/types/combat';
import { createWorldEvent } from '~/worldkit/event';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';

// Custom hook for advance test scenarios - eliminates boilerplate
type CombatMovementTestScenarioOptions = {
  attackerPosition?: number;
  enemyPosition?: number;
  attackerStats?: { pow: number; fin: number; res: number };
  enemyStats?: { pow: number; fin: number; res: number };
  attackerMass?: number;
  attackerAP?: number;
  stubPhysics?: boolean; // For tactical invariant tests
  battlefield?: Battlefield; // Custom battlefield
  mockCreateWorldEvent?: any;
  mockDistanceToAp?: any;
  mockApToDistance?: any;
  advanceDeps?: Partial<AdvanceDependencies>; // Custom advance dependencies
  retreatDeps?: Partial<RetreatDependencies>; // Custom retreat dependencies
};

export function useCombatMovementTestScenario({
  attackerPosition = 100,
  enemyPosition = 200,
  attackerStats = { pow: 50, fin: 30, res: 20 },
  enemyStats = { pow: 10, fin: 10, res: 10 },
  attackerMass = 70,
  attackerAP = 6.0,
  stubPhysics = false,
  battlefield,
  mockCreateWorldEvent = vi.fn((event) => event),
  mockDistanceToAp = distanceToAp,
  mockApToDistance = apToDistance,
  advanceDeps = {},
  retreatDeps = {},
}: CombatMovementTestScenarioOptions = {}) {

  // Create context with mocked mass computation
  const context = createTransformerContext();
  const mockComputeActorMass = vi.fn().mockReturnValue(attackerMass * 1000); // Convert to grams
  context.mass.computeActorMass = mockComputeActorMass;

  context.declareError = vi.fn();
  context.declareEvent = vi.fn();

  // Create weapon schema
  const swordSchema = createSwordSchema({
    urn: 'flux:schema:weapon:test',
    name: 'Test Weapon',
  });

  // Register weapons
  registerWeapons(context.schemaManager, [swordSchema]);

  // Actor IDs
  const ATTACKER_ID: ActorURN = 'flux:actor:attacker';
  const ENEMY_ID: ActorURN = 'flux:actor:enemy';

  // Create scenario
  const scenario = useCombatScenario(context, {
    weapons: [swordSchema],
    schemaManager: context.schemaManager,
    battlefield,
    participants: {
      [ATTACKER_ID]: {
        team: Team.ALPHA,
        stats: attackerStats,
        equipment: { weapon: swordSchema.urn },
        position: { coordinate: attackerPosition, facing: CombatFacing.RIGHT, speed: 0 },
        ap: attackerAP,
      },
      [ENEMY_ID]: {
        team: Team.BRAVO,
        stats: enemyStats,
        equipment: { weapon: swordSchema.urn },
        position: { coordinate: enemyPosition, facing: CombatFacing.LEFT, speed: 0 },
      },
    },
  });

  // Create dependencies with custom overrides
  const finalAdvanceDeps: AdvanceDependencies = {
    ...DEFAULT_ADVANCE_DEPS,
    createWorldEvent: mockCreateWorldEvent as unknown as typeof createWorldEvent,
    distanceToAp: stubPhysics ? mockDistanceToAp : distanceToAp,
    apToDistance: stubPhysics ? mockApToDistance : apToDistance,
    ...advanceDeps, // Apply custom dependencies last to override defaults
  };

  const finalRetreatDeps: RetreatDependencies = {
    ...DEFAULT_RETREAT_DEPS,
    createWorldEvent: mockCreateWorldEvent as unknown as typeof createWorldEvent,
    distanceToAp: stubPhysics ? mockDistanceToAp : distanceToAp,
    apToDistance: stubPhysics ? mockApToDistance : apToDistance,
    ...retreatDeps, // Apply custom dependencies last to override defaults
  };

  // Create movement methods
  const attackerActor = scenario.actors[ATTACKER_ID].actor;
  const attackerCombatant = scenario.session.data.combatants.get(ATTACKER_ID)!;

  const advance = createAdvanceMethod(
    context,
    scenario.session,
    attackerActor,
    attackerCombatant,
    finalAdvanceDeps
  );

  const retreat = createRetreatMethod(
    context,
    scenario.session,
    attackerActor,
    attackerCombatant,
    finalRetreatDeps
  );

  return {
    // Core utilities
    context,
    scenario,
    advance,
    retreat,

    // Actor references
    ATTACKER_ID,
    ENEMY_ID,
    attackerActor,
    enemyActor: scenario.actors[ENEMY_ID].actor,

    // Combatant references with clean destructuring
    get attacker() {
      return scenario.actors[ATTACKER_ID].hooks.combatant.combatant;
    },
    get enemy() {
      return scenario.actors[ENEMY_ID].hooks.combatant.combatant;
    },

    // Mocks for assertions
    mockComputeActorMass,
    mockCreateWorldEvent,
    mockDistanceToAp,
    mockApToDistance,
  };
}

/**
 * Parameterized test data generators for common test scenarios
 */
export const createStatTestCases = () => {
  return {
    /**
     * Generate test cases for different stat levels
     */
    statLevels: [
      { name: '10/10', pow: 10, fin: 10, res: 10 },
      { name: '20/20', pow: 20, fin: 20, res: 20 },
      { name: '40/40', pow: 40, fin: 40, res: 40 },
      { name: '60/60', pow: 60, fin: 60, res: 60 },
      { name: '80/80', pow: 80, fin: 80, res: 80 },
      { name: '100/100', pow: 100, fin: 100, res: 100 },
    ],

    /**
     * Generate asymmetric stat matchups for balance testing
     */
    asymmetricMatchups: [
      { name: '80/20 vs 20/80', attacker: { pow: 80, fin: 20, res: 50 }, defender: { pow: 20, fin: 80, res: 50 } },
      { name: '90/70 vs 30/30', attacker: { pow: 90, fin: 70, res: 10 }, defender: { pow: 30, fin: 30, res: 90 } },
      { name: '50/50 vs 100/25', attacker: { pow: 50, fin: 50, res: 50 }, defender: { pow: 100, fin: 25, res: 25 } },
    ],

    /**
     * Generate weapon type test cases
     */
    weaponTypes: [
      { name: 'melee', type: 'melee' as const, expectedRange: 1 },
      { name: 'reach', type: 'reach' as const, expectedRange: 2 },
      { name: 'ranged', type: 'ranged' as const, expectedRange: 15 },
    ],
  };
};

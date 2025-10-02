import { describe, it, expect } from 'vitest';
import {
  areEnemies, // deprecated but still available
  computeAlliesAndEnemies,
  AlliesAndEnemies,
} from './team';
import { Combatant, Team } from '~/types/combat';
import { ActorURN } from '~/types/taxonomy';
import { useCombatScenario } from './testing/scenario';
import { createTestTransformerContext } from '~/testing/context-testing';

/**
 * Test suite for team filtering and relationship computation functions
 * Focuses on happy path scenarios with performance benchmarks
 */

describe('Team System', () => {

  /**
   * Helper function to create a combat scenario with specified team configuration
   */
  const createTeamScenario = (teamConfig: Array<{ id: ActorURN; team: string }>) => {
    const context = createTestTransformerContext();

    const participants = teamConfig.reduce((acc, { id, team }) => {
      acc[id] = { team, name: id.split(':').pop() || 'Test Actor' };
      return acc;
    }, {} as Record<ActorURN, { team: string; name: string }>);

    const scenario = useCombatScenario(context, {
      participants,
      weapons: [], // No weapons needed for team tests
    });

    return scenario.session.data.combatants;
  };

  describe('areEnemies', () => {
    it('should identify enemies with different teams', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.BRAVO },
      ]);

      const result = areEnemies(
        'flux:actor:alice' as ActorURN,
        'flux:actor:bob' as ActorURN,
        combatants
      );

      expect(result).toBe(true);
    });

    it('should not identify allies as enemies', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:charlie' as ActorURN, team: Team.ALPHA },
      ]);

      const result = areEnemies(
        'flux:actor:alice' as ActorURN,
        'flux:actor:charlie' as ActorURN,
        combatants
      );

      expect(result).toBe(false);
    });

    it('should handle custom team strings', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: 'rebels' },
        { id: 'flux:actor:bob' as ActorURN, team: 'empire' },
      ]);

      const result = areEnemies(
        'flux:actor:alice' as ActorURN,
        'flux:actor:bob' as ActorURN,
        combatants
      );

      expect(result).toBe(true);
    });
  });

  describe('areEnemies (deprecated)', () => {
    it('should still work for backward compatibility', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.BRAVO },
      ]);

      const result = areEnemies(
        'flux:actor:alice' as ActorURN,
        'flux:actor:bob' as ActorURN,
        combatants
      );

      expect(result).toBe(true);
    });
  });

  describe('computeAlliesAndEnemies', () => {
    it('should compute allies and enemies correctly', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.BRAVO },
        { id: 'flux:actor:charlie' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:david' as ActorURN, team: Team.BRAVO },
      ]);

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants);

      expect(result.allies).toEqual(['flux:actor:charlie']);
      expect(result.enemies).toEqual(['flux:actor:bob', 'flux:actor:david']);
    });

    it('should handle single combatant scenario', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
      ]);

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants);

      expect(result.allies).toEqual([]);
      expect(result.enemies).toEqual([]);
    });

    it('should handle empty combatants map', () => {
      const combatants = new Map<ActorURN, Combatant>();

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants);

      expect(result.allies).toEqual([]);
      expect(result.enemies).toEqual([]);
    });

    it('should reuse provided output object', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.BRAVO },
      ]);

      const output: AlliesAndEnemies = { allies: [], enemies: [] };
      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants, output);

      expect(result).toBe(output); // Same reference
      expect(result.enemies).toEqual(['flux:actor:bob']);
    });

    it('should clear existing arrays when reusing output', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.BRAVO },
      ]);

      const output: AlliesAndEnemies = {
        allies: ['flux:actor:old-ally' as ActorURN],
        enemies: ['flux:actor:old-enemy' as ActorURN]
      };

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants, output);

      expect(result.allies).toEqual([]);
      expect(result.enemies).toEqual(['flux:actor:bob']);
      expect(result.allies).not.toContain('flux:actor:old-ally');
      expect(result.enemies).not.toContain('flux:actor:old-enemy');
    });
  });

  describe.each([
    { size: 2, description: 'small combat (2 combatants)' },
    { size: 4, description: 'typical combat (4 combatants)' },
    { size: 8, description: 'large combat (8 combatants)' },
    { size: 16, description: 'massive combat (16 combatants)' },
  ])('Performance Benchmarks - $description', ({ size, description }) => {

    it(`should perform efficiently with ${description}`, () => {
      // Create test scenario using combat infrastructure
      const combatants = createTeamScenario(
        Array.from({ length: size }, (_, i) => ({
          id: `flux:actor:combatant-${i}` as ActorURN,
          team: i % 2 === 0 ? Team.ALPHA : Team.BRAVO,
        }))
      );

      const referenceActor = 'flux:actor:combatant-0' as ActorURN;
      const iterations = 1000;
      const output: AlliesAndEnemies = { allies: [], enemies: [] };

      // Benchmark computeAlliesAndEnemies
      console.log(`\n=== ${description.toUpperCase()} BENCHMARK ===`);
      console.log(`Combatants: ${size}, Iterations: ${iterations}`);

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        computeAlliesAndEnemies(referenceActor, combatants, output);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      const opsPerSecond = Math.round(1000 / avgTime);

      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average per operation: ${avgTime.toFixed(4)}ms`);
      console.log(`Operations per second: ${opsPerSecond.toLocaleString()}`);
      console.log(`Memory efficiency: Reused output object ${iterations} times`);

      // Verify correctness wasn't compromised for performance
      const expectedAllies = Math.floor(size / 2) - 1; // Same team, excluding self
      const expectedEnemies = Math.ceil(size / 2); // Different team

      expect(output.allies).toHaveLength(expectedAllies);
      expect(output.enemies).toHaveLength(expectedEnemies);

      console.log(`Correctness: ✓ ${expectedAllies} allies, ${expectedEnemies} enemies`);
    });

    it(`should benchmark individual team operations with ${description}`, () => {
      const combatants = createTeamScenario(
        Array.from({ length: size }, (_, i) => ({
          id: `flux:actor:combatant-${i}` as ActorURN,
          team: i % 2 === 0 ? Team.ALPHA : Team.BRAVO,
        }))
      );

      const actor1 = 'flux:actor:combatant-0' as ActorURN;
      const actor2 = 'flux:actor:combatant-1' as ActorURN;
      const iterations = 10000;

      console.log(`\n=== INDIVIDUAL OPERATIONS - ${description.toUpperCase()} ===`);

      // Benchmark areEnemies
      const enemiesStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        areEnemies(actor1, actor2, combatants);
      }
      const enemiesTime = performance.now() - enemiesStart;
      console.log(`areEnemies: ${(enemiesTime / iterations).toFixed(6)}ms avg, ${Math.round(iterations * 1000 / enemiesTime).toLocaleString()} ops/sec`);

      // Note: areAllies was removed from the public API
      // Only areEnemies remains for backward compatibility

      // Note: filterEnemies and filterAllies were removed from the public API
      // The optimized computeAlliesAndEnemies function replaces their functionality
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed team types', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: 'custom-team' },
        { id: 'flux:actor:charlie' as ActorURN, team: Team.ALPHA },
      ]);

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants);

      expect(result.allies).toEqual(['flux:actor:charlie']);
      expect(result.enemies).toEqual(['flux:actor:bob']);
    });

    it('should handle three-way combat', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.BRAVO },
        { id: 'flux:actor:charlie' as ActorURN, team: Team.CHARLIE },
      ]);

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants);

      expect(result.allies).toEqual([]);
      expect(result.enemies).toEqual(['flux:actor:bob', 'flux:actor:charlie']);
    });

    it('should handle all combatants on same team', () => {
      const combatants = createTeamScenario([
        { id: 'flux:actor:alice' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:bob' as ActorURN, team: Team.ALPHA },
        { id: 'flux:actor:charlie' as ActorURN, team: Team.ALPHA },
      ]);

      const result = computeAlliesAndEnemies('flux:actor:alice' as ActorURN, combatants);

      expect(result.allies).toEqual(['flux:actor:bob', 'flux:actor:charlie']);
      expect(result.enemies).toEqual([]);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { createTacticalCacheKey } from './search';
import { TacticalSituation, HeuristicProfile } from '~/types/combat-ai';
import { WeaponSchema } from '~/types/schema/weapon';
import { ActorURN } from '~/types/taxonomy';
import { DEFAULT_SEARCH_CONFIG } from './search';
import { Combatant } from '~/types/combat';

type TacticalTestSitationInput = Omit<Partial<TacticalSituation>, 'combatant' | 'assessments'> & {
  combatant?: Partial<Combatant>;
  assessments?: Partial<TacticalSituation['assessments']>;
};

/**
 * Create a minimal tactical situation for testing
 */
function createTestSituation(overrides: TacticalTestSitationInput = {}): TacticalSituation {
  const baseCombatant = {
    actorId: 'flux:actor:test-combatant' as ActorURN,
    position: { coordinate: 100, facing: 1 },
    ap: { eff: { cur: 10.0 } },
    energy: { eff: { cur: 50 } },
    target: null,
  };

  const baseResources = {
    ap: { current: 10.0, max: 20.0 },
    energy: { current: 50, max: 100 },
  };

  const baseAssessments = {
    primaryTarget: null,
    primaryTargetDistance: null,
    canAttack: false,
    needsRepositioning: false,
    optimalDistance: 1,
  };

  return {
    combatant: {
      ...baseCombatant,
      ...(overrides.combatant || {}),
      position: {
        ...baseCombatant.position,
        ...(overrides.combatant?.position || {}),
      },
    },
    session: {} as any,
    weapon: {} as WeaponSchema,
    validTargets: [],
    resources: {
      ...baseResources,
      ...overrides.resources,
    },
    assessments: {
      ...baseAssessments,
      ...overrides.assessments,
    },
    ...overrides,
  } as TacticalSituation;
}

/**
 * Create a test heuristic profile
 */
function createTestProfile(overrides: Partial<HeuristicProfile> = {}): HeuristicProfile {
  return {
    priorities: {
      damageWeight: 0.3,
      efficiencyWeight: 0.2,
      positioningWeight: 0.2,
      momentumWeight: 0.15,
      riskWeight: 0.15,
      ...overrides.priorities,
    },
    ...overrides,
  } as HeuristicProfile;
}

describe('createTacticalCacheKey', () => {
  describe('Key Stability', () => {
    it('should generate identical keys for identical situations', () => {
      const situation1 = createTestSituation();
      const situation2 = createTestSituation();
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).toBe(key2);
    });

    it('should be stable across multiple calls with same inputs', () => {
      const situation = createTestSituation();
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const keys = Array.from({ length: 10 }, () =>
        createTacticalCacheKey(situation, profile, config)
      );

      expect(new Set(keys).size).toBe(1);
    });
  });

  describe('Key Uniqueness - Combatant State', () => {
    it('should generate different keys for different actor IDs', () => {
      const situation1 = createTestSituation({
        combatant: { actorId: 'flux:actor:test-1' as ActorURN } as Combatant,
      });
      const situation2 = createTestSituation({
        combatant: { actorId: 'flux:actor:test-2' as ActorURN } as Combatant,
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different positions', () => {
      const situation1 = createTestSituation({
        combatant: { position: { coordinate: 100, facing: 1 } } as Combatant,
      });
      const situation2 = createTestSituation({
        combatant: { position: { coordinate: 150, facing: 1 } } as Combatant,
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different facing directions', () => {
      const situation1 = createTestSituation({
        combatant: { position: { coordinate: 100, facing: 1 } } as Combatant,
      });
      const situation2 = createTestSituation({
        combatant: { position: { coordinate: 100, facing: -1 } } as Combatant,
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different AP values', () => {
      const situation1 = createTestSituation({
        resources: { ap: { current: 10.0, max: 20.0 }, energy: { current: 50, max: 100 } }
      });
      const situation2 = createTestSituation({
        resources: { ap: { current: 15.0, max: 20.0 }, energy: { current: 50, max: 100 } }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different energy values', () => {
      const situation1 = createTestSituation({
        resources: { ap: { current: 10.0, max: 20.0 }, energy: { current: 50, max: 100 } }
      });
      const situation2 = createTestSituation({
        resources: { ap: { current: 10.0, max: 20.0 }, energy: { current: 75, max: 100 } }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Key Uniqueness - Tactical Assessments', () => {
    it('should generate different keys for different primary targets', () => {
      const situation1 = createTestSituation({
        assessments: { primaryTarget: null }
      });
      const situation2 = createTestSituation({
        assessments: { primaryTarget: 'flux:actor:enemy-1' as ActorURN }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different attack capabilities', () => {
      const situation1 = createTestSituation({
        assessments: { canAttack: false }
      });
      const situation2 = createTestSituation({
        assessments: { canAttack: true }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different repositioning needs', () => {
      const situation1 = createTestSituation({
        assessments: { needsRepositioning: false }
      });
      const situation2 = createTestSituation({
        assessments: { needsRepositioning: true }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Key Uniqueness - Configuration Parameters', () => {
    it('should generate different keys for different max depths', () => {
      const situation = createTestSituation();
      const profile = createTestProfile();
      const config1 = { ...DEFAULT_SEARCH_CONFIG, maxDepth: 3 };
      const config2 = { ...DEFAULT_SEARCH_CONFIG, maxDepth: 5 };

      const key1 = createTacticalCacheKey(situation, profile, config1);
      const key2 = createTacticalCacheKey(situation, profile, config2);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different max nodes', () => {
      const situation = createTestSituation();
      const profile = createTestProfile();
      const config1 = { ...DEFAULT_SEARCH_CONFIG, maxNodes: 100 };
      const config2 = { ...DEFAULT_SEARCH_CONFIG, maxNodes: 200 };

      const key1 = createTacticalCacheKey(situation, profile, config1);
      const key2 = createTacticalCacheKey(situation, profile, config2);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different score thresholds', () => {
      const situation = createTestSituation();
      const profile = createTestProfile();
      const config1 = { ...DEFAULT_SEARCH_CONFIG, minScoreThreshold: 5 };
      const config2 = { ...DEFAULT_SEARCH_CONFIG, minScoreThreshold: 15 };

      const key1 = createTacticalCacheKey(situation, profile, config1);
      const key2 = createTacticalCacheKey(situation, profile, config2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Key Uniqueness - Heuristic Profile', () => {
    it('should generate different keys for different damage weights', () => {
      const situation = createTestSituation();
      const profile1 = createTestProfile();
      const profile2 = createTestProfile();
      profile1.priorities.damageWeight = 0.3;
      profile2.priorities.damageWeight = 0.5;
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation, profile1, config);
      const key2 = createTacticalCacheKey(situation, profile2, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different efficiency weights', () => {
      const situation = createTestSituation();
      const profile1 = createTestProfile();
      const profile2 = createTestProfile();
      profile1.priorities.efficiencyWeight = 0.2;
      profile2.priorities.efficiencyWeight = 0.4;
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation, profile1, config);
      const key2 = createTacticalCacheKey(situation, profile2, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different positioning weights', () => {
      const situation = createTestSituation();
      const profile1 = createTestProfile();
      const profile2 = createTestProfile();
      profile1.priorities.positioningWeight = 0.2;
      profile2.priorities.positioningWeight = 0.3;
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation, profile1, config);
      const key2 = createTacticalCacheKey(situation, profile2, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different momentum weights', () => {
      const situation = createTestSituation();
      const profile1 = createTestProfile();
      const profile2 = createTestProfile();
      profile1.priorities.momentumWeight = 0.15;
      profile2.priorities.momentumWeight = 0.25;
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation, profile1, config);
      const key2 = createTacticalCacheKey(situation, profile2, config);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different risk weights', () => {
      const situation = createTestSituation();
      const profile1 = createTestProfile();
      const profile2 = createTestProfile();
      profile1.priorities.riskWeight = 0.15;
      profile2.priorities.riskWeight = 0.05;
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation, profile1, config);
      const key2 = createTacticalCacheKey(situation, profile2, config);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null primary target', () => {
      const situation = createTestSituation({
        assessments: { primaryTarget: null }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      expect(() => createTacticalCacheKey(situation, profile, config)).not.toThrow();
      const key = createTacticalCacheKey(situation, profile, config);
      expect(key).toContain('none');
    });

    it('should handle zero AP', () => {
      const situation = createTestSituation({
        resources: { ap: { current: 0.0, max: 20.0 }, energy: { current: 50, max: 100 } }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      expect(() => createTacticalCacheKey(situation, profile, config)).not.toThrow();
      const key = createTacticalCacheKey(situation, profile, config);
      expect(key).toContain('0.0');
    });

    it('should handle zero energy', () => {
      const situation = createTestSituation({
        resources: { ap: { current: 10.0, max: 20.0 }, energy: { current: 0, max: 100 } }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      expect(() => createTacticalCacheKey(situation, profile, config)).not.toThrow();
      const key = createTacticalCacheKey(situation, profile, config);
      expect(key).toContain('0');
    });

    it('should handle extreme positions', () => {
      const situation = createTestSituation({
        combatant: { position: { coordinate: 999999, facing: 1, speed: 0 } }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      expect(() => createTacticalCacheKey(situation, profile, config)).not.toThrow();
    });

    it('should handle fractional AP values consistently', () => {
      const situation1 = createTestSituation({
        resources: { ap: { current: 10.123, max: 20.0 }, energy: { current: 50, max: 100 } }
      });
      const situation2 = createTestSituation({
        resources: { ap: { current: 10.127, max: 20.0 }, energy: { current: 50, max: 100 } }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key1 = createTacticalCacheKey(situation1, profile, config);
      const key2 = createTacticalCacheKey(situation2, profile, config);

      // Should be the same due to .toFixed(1) rounding
      expect(key1).toBe(key2);
    });
  });

  describe('Property-Based Testing', () => {
    it('should generate unique keys across parameter space', () => {
      const keys = new Set<string>();
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      // Test across different combinations
      const actorIds = ['flux:actor:test-1', 'flux:actor:test-2', 'flux:actor:test-3'];
      const positions = [0, 50, 100, 150, 200];
      const facings = [-1, 1];
      const apValues = [0, 2.5, 5.0, 10.0, 15.0];
      const energyValues = [0, 25, 50, 75, 100];
      const canAttackValues = [true, false];
      const needsRepositioningValues = [true, false];

      for (const actorId of actorIds) {
        for (const position of positions) {
          for (const facing of facings) {
            for (const ap of apValues) {
              for (const energy of energyValues) {
                for (const canAttack of canAttackValues) {
                  for (const needsRepositioning of needsRepositioningValues) {
                    const situation = createTestSituation({
                      combatant: {
                        actorId: actorId as ActorURN,
                        position: { coordinate: position, facing, speed: 0 }
                      },
                      resources: {
                        ap: { current: ap, max: 20.0 },
                        energy: { current: energy, max: 100 }
                      },
                      assessments: { canAttack, needsRepositioning }
                    });

                    const key = createTacticalCacheKey(situation, profile, config);
                    keys.add(key);
                  }
                }
              }
            }
          }
        }
      }

      // Should have generated unique keys for each combination
      const expectedCombinations = actorIds.length * positions.length * facings.length *
                                  apValues.length * energyValues.length * canAttackValues.length *
                                  needsRepositioningValues.length;

      expect(keys.size).toBe(expectedCombinations);
    });

    it('should handle weight precision consistently', () => {
      const situation = createTestSituation();
      const config = DEFAULT_SEARCH_CONFIG;

      // Test that small weight differences are captured
      const profile1 = createTestProfile();
      const profile2 = createTestProfile();
      profile1.priorities.damageWeight = 0.30;
      profile2.priorities.damageWeight = 0.31;

      const key1 = createTacticalCacheKey(situation, profile1, config);
      const key2 = createTacticalCacheKey(situation, profile2, config);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Key Format and Structure', () => {
    it('should produce keys with expected structure', () => {
      const situation = createTestSituation({
        combatant: { actorId: 'flux:actor:test' as ActorURN },
        assessments: { primaryTarget: 'flux:actor:enemy' as ActorURN }
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key = createTacticalCacheKey(situation, profile, config);

      // Should be a concatenated string without separators (performance optimization)
      expect(typeof key).toBe('string');

      // Should contain actor ID
      expect(key).toContain('flux:actor:test');

      // Should contain target
      expect(key).toContain('flux:actor:enemy');

      // Should contain numeric values
      expect(key).toMatch(/\d+/);
    });

    it('should produce reasonably sized keys', () => {
      const situation = createTestSituation();
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      const key = createTacticalCacheKey(situation, profile, config);

      // Keys shouldn't be excessively long
      expect(key.length).toBeLessThan(500);
      expect(key.length).toBeGreaterThan(50);
    });
  });

  describe.skip('Performance Benchmarks', () => {
    it('should generate cache keys efficiently (performance benchmark)', () => {
      const situation = createTestSituation({
        combatant: { actorId: 'flux:actor:benchmark' as ActorURN } as Combatant,
        assessments: { primaryTarget: 'flux:actor:target' as ActorURN },
      });
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      // Warmup - JIT optimization
      for (let i = 0; i < 1000; i++) {
        createTacticalCacheKey(situation, profile, config);
      }

      // Benchmark different batch sizes
      const benchmarkSizes = [1000, 10000, 100000];

      for (const iterations of benchmarkSizes) {
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          createTacticalCacheKey(situation, profile, config);
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTimePerKey = totalTime / iterations;
        const keysPerSecond = Math.round(iterations / (totalTime / 1000));

        console.log(`🚀 Cache Key Generation Benchmark (${iterations.toLocaleString()} iterations):`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Average per key: ${(avgTimePerKey * 1000).toFixed(3)}μs`);
        console.log(`   Keys per second: ${keysPerSecond.toLocaleString()}`);

        // Performance assertions - should be very fast
        expect(avgTimePerKey).toBeLessThan(0.1); // Less than 0.1ms (100μs) per key
        expect(keysPerSecond).toBeGreaterThan(10000); // At least 10k keys/sec
      }
    });

    it('should handle varied inputs efficiently (stress test)', () => {
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      // Generate varied test data
      const testCases = [];
      for (let i = 0; i < 1000; i++) {
        testCases.push(createTestSituation({
          combatant: {
            actorId: `flux:actor:stress-${i}` as ActorURN,
            position: { coordinate: Math.random() * 1000, facing: Math.random() > 0.5 ? 1 : -1, speed: Math.random() * 10 }
          },
          resources: {
            ap: { current: Math.random() * 20, max: 20 },
            energy: { current: Math.random() * 100, max: 100 }
          },
          assessments: {
            canAttack: Math.random() > 0.5,
            needsRepositioning: Math.random() > 0.5,
            primaryTarget: Math.random() > 0.3 ? `flux:actor:target-${Math.floor(Math.random() * 10)}` as ActorURN : null
          }
        }));
      }

      // Warmup
      for (let i = 0; i < 100; i++) {
        createTacticalCacheKey(testCases[i % testCases.length], profile, config);
      }

      // Benchmark with varied inputs
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const testCase = testCases[i % testCases.length];
        createTacticalCacheKey(testCase, profile, config);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerKey = totalTime / iterations;
      const keysPerSecond = Math.round(iterations / (totalTime / 1000));

      console.log(`🎯 Varied Input Stress Test (${iterations.toLocaleString()} iterations):`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Average per key: ${(avgTimePerKey * 1000).toFixed(3)}μs`);
      console.log(`   Keys per second: ${keysPerSecond.toLocaleString()}`);
      console.log(`   Input variation: ${testCases.length} unique situations`);

      // Should maintain performance with varied inputs
      expect(avgTimePerKey).toBeLessThan(0.15); // Slightly more lenient for varied inputs
      expect(keysPerSecond).toBeGreaterThan(8000); // Still very fast
    });

    it('should demonstrate zero-allocation benefits (memory benchmark)', () => {
      const situation = createTestSituation();
      const profile = createTestProfile();
      const config = DEFAULT_SEARCH_CONFIG;

      // Measure memory usage pattern (indirect via timing)
      const iterations = 50000;
      const batchSize = 1000;
      const timings: number[] = [];

      for (let batch = 0; batch < iterations / batchSize; batch++) {
        const batchStart = performance.now();

        for (let i = 0; i < batchSize; i++) {
          createTacticalCacheKey(situation, profile, config);
        }

        const batchTime = performance.now() - batchStart;
        timings.push(batchTime);
      }

      // Calculate statistics
      const avgBatchTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const minBatchTime = Math.min(...timings);
      const maxBatchTime = Math.max(...timings);
      const variance = timings.reduce((acc, time) => acc + Math.pow(time - avgBatchTime, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgBatchTime;

      console.log(`💾 Memory Efficiency Analysis (${iterations.toLocaleString()} keys in ${timings.length} batches):`);
      console.log(`   Average batch time: ${avgBatchTime.toFixed(3)}ms`);
      console.log(`   Min/Max batch time: ${minBatchTime.toFixed(3)}ms / ${maxBatchTime.toFixed(3)}ms`);
      console.log(`   Standard deviation: ${stdDev.toFixed(3)}ms`);
      console.log(`   Coefficient of variation: ${(coefficientOfVariation * 100).toFixed(2)}%`);

      // Zero-allocation should show consistent performance (low variance)
      expect(coefficientOfVariation).toBeLessThan(0.5); // Less than 50% variation
      expect(maxBatchTime / minBatchTime).toBeLessThan(3); // Max shouldn't be more than 3x min

      console.log(`✅ Performance characteristics suggest minimal GC pressure (zero-allocation working!)`);
    });
  });
});

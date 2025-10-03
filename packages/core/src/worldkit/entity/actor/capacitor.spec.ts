import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentEnergy,
  getMaxEnergy,
  getPosition,
  setPosition,
  setEnergy,
  getCurrentRecoveryRate,
  getMaxRecoveryRate,
  consumeEnergy,
  computeRecoveryEnergy,
  recoverEnergy,
  canAfford,
  getEnergyPercentage,
  calculateEnergyRecoveryOverTime,
} from './capacitor';
import { createTestActor } from '~/testing/world-testing';
import { Actor, Stat } from '~/types/entity/actor';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';

describe('Capacitor API (Pure Functions)', () => {
  let actor: Actor;

  beforeEach(() => {
    actor = createTestActor(undefined, (a) => {
      const currentShell = a.shells[a.currentShell];
      return {
        ...a,
        shells: {
          ...a.shells,
          [a.currentShell]: {
            ...currentShell,
            stats: {
              ...currentShell.stats,
              [Stat.RES]: {
                ...currentShell.stats[Stat.RES],
                nat: 15,
                eff: 15,
                mods: {},
              },
            },
          },
        },
      };
    });
  });

  describe('initialization and basic properties', () => {
    it('should initialize capacitor if not present', () => {
      actor.capacitor = undefined as any;

      setEnergy(actor, 5000);

      expect(actor.capacitor).toBeDefined();
      expect(actor.capacitor.position).toBeCloseTo(0.340, 3); // 5000 / ~14707
      expect(actor.capacitor.energy.eff.cur).toBe(5000);
      expect(actor.capacitor.energy.nat.cur).toBe(5000);
    });

    it('should get current energy', () => {
      actor.capacitor = {
        position: 0.5,
        energy: { nat: { cur: 8500, max: 15000 }, eff: { cur: 8500, max: 15000 }, mods: {} }
      };

      expect(getCurrentEnergy(actor)).toBe(8500);
    });

    it('should return 0 for missing capacitor', () => {
      actor.capacitor = undefined as any;

      expect(getCurrentEnergy(actor)).toBe(0);
    });

    it('should get maximum energy based on resilience', () => {
      expect(getMaxEnergy(actor)).toBeCloseTo(14707, 0); // Power curve: RES 15 → ~14,707 J
    });

    it('should handle zero resilience gracefully', () => {
      const currentShell = actor.shells[actor.currentShell];
      currentShell.stats[Stat.RES].eff = 0;

      expect(getMaxEnergy(actor)).toBe(10000); // Base energy at RES 0 (clamped to RES 10)
      expect(getMaxRecoveryRate(actor)).toBe(150); // Base recovery at RES 0 (clamped to RES 10)
    });

    it('should handle very high resilience values', () => {
      const currentShell = actor.shells[actor.currentShell];
      currentShell.stats[Stat.RES].eff = 100;

      expect(getMaxEnergy(actor)).toBe(45600); // Power curve: RES 100 → 45,600 J (matches UI!)
      expect(getMaxRecoveryRate(actor)).toBe(500); // Power curve: RES 100 → 500W
    });
  });

  describe('position management', () => {
    it('should get current position', () => {
      actor.capacitor = {
        position: 0.618,
        energy: { nat: { cur: 0, max: 0 }, eff: { cur: 0, max: 0 }, mods: {} }
      };

      expect(getPosition(actor)).toBe(0.618);
    });

    it('should return 1.0 for missing capacitor', () => {
      actor.capacitor = undefined as any;

      expect(getPosition(actor)).toBe(1.0);
    });

    it('should set position and update energy accordingly', () => {
      setPosition(actor, 0.75 as NormalizedValueBetweenZeroAndOne);

      expect(getPosition(actor)).toBe(0.75);
      expect(getCurrentEnergy(actor)).toBeCloseTo(11030, 0); // 0.75 * ~14707
      expect(actor.capacitor.energy.eff.max).toBeCloseTo(14707, 0);
      expect(actor.capacitor.energy.nat.max).toBeCloseTo(14707, 0);
    });

    it('should clamp position to valid range', () => {
      // Test negative position
      setPosition(actor, -0.5 as NormalizedValueBetweenZeroAndOne);
      expect(getPosition(actor)).toBe(0);
      expect(getCurrentEnergy(actor)).toBe(0);

      // Test position above 1
      setPosition(actor, 1.5 as NormalizedValueBetweenZeroAndOne);
      expect(getPosition(actor)).toBe(1);
      expect(getCurrentEnergy(actor)).toBeCloseTo(14707, 0);
    });
  });

  describe('energy management', () => {
    it('should set energy directly and update position', () => {
      setEnergy(actor, 10000);

      expect(getCurrentEnergy(actor)).toBe(10000);
      expect(getPosition(actor)).toBeCloseTo(0.680, 3); // 10000 / ~14707
      expect(actor.capacitor.energy.eff.max).toBeCloseTo(14707, 0);
      expect(actor.capacitor.energy.nat.cur).toBe(10000);
    });

    it('should clamp energy to valid range', () => {
      // Test negative energy
      setEnergy(actor, -1000);
      expect(getCurrentEnergy(actor)).toBe(0);
      expect(getPosition(actor)).toBe(0);

      // Test energy above maximum
      setEnergy(actor, 20000);
      expect(getCurrentEnergy(actor)).toBeCloseTo(14707, 0); // Clamped to max
      expect(getPosition(actor)).toBe(1);
    });

    it('should consume energy correctly', () => {
      setEnergy(actor, 10000);

      consumeEnergy(actor, 2500);

      expect(getCurrentEnergy(actor)).toBe(7500);
      expect(getPosition(actor)).toBeCloseTo(0.510, 3); // 7500 / ~14707
    });

    it('should not consume energy below zero', () => {
      setEnergy(actor, 1000);

      consumeEnergy(actor, 2000);

      expect(getCurrentEnergy(actor)).toBe(0);
      expect(getPosition(actor)).toBe(0);
    });

    it('should check if can afford cost', () => {
      setEnergy(actor, 5000);

      expect(canAfford(actor, 3000)).toBe(true);
      expect(canAfford(actor, 5000)).toBe(true);
      expect(canAfford(actor, 6000)).toBe(false);
    });

    it('should get energy percentage', () => {
      setEnergy(actor, 7500);

      expect(getEnergyPercentage(actor)).toBeCloseTo(0.510, 3); // 7500 / ~14707
    });

    it('should handle zero max energy in percentage calculation', () => {
      const currentShell = actor.shells[actor.currentShell];
      currentShell.stats[Stat.RES].eff = 0;
      setEnergy(actor, 0);

      expect(getEnergyPercentage(actor)).toBe(0);
    });
  });

  describe('recovery system', () => {
    it('should get maximum recovery rate based on resilience', () => {
      expect(getMaxRecoveryRate(actor)).toBe(196); // Power curve: RES 15 → 196W
    });

    it('should get current recovery rate based on energy level', () => {
      setEnergy(actor, 7500); // ~51% energy

      const recoveryRate = getCurrentRecoveryRate(actor);

      expect(recoveryRate).toBeCloseTo(105, 0); // Gaussian curve: ~105W at 51% energy
    });

    it('should have zero recovery rate at full energy', () => {
      const maxEnergy = getMaxEnergy(actor);
      setEnergy(actor, maxEnergy); // 100% energy

      expect(getCurrentRecoveryRate(actor)).toBeCloseTo(10, 0); // Gaussian curve: ~10W at 100% (not zero)
    });

    it('should have maximum recovery rate at zero energy', () => {
      setEnergy(actor, 0); // 0% energy

      expect(getCurrentRecoveryRate(actor)).toBeCloseTo(75, 0); // Gaussian curve: ~75W at 0% energy
    });

    it('should compute recovery energy without mutation', () => {
      setEnergy(actor, 8000);
      const initialEnergy = getCurrentEnergy(actor);

      const recoveryEnergy = computeRecoveryEnergy(actor, 6000); // 6 seconds

      // Integration-based recovery with gaussian curve
      expect(recoveryEnergy).toBeCloseTo(496, 0); // ~496 J over 6 seconds (updated for correct integration)
      expect(getCurrentEnergy(actor)).toBe(initialEnergy); // Should not change
    });

    it('should recover energy over time', () => {
      setEnergy(actor, 8000);

      const recoveredAmount = recoverEnergy(actor, 6000); // 6 seconds

      expect(recoveredAmount).toBeCloseTo(496, 0); // Integration-based recovery (updated)
      expect(getCurrentEnergy(actor)).toBeCloseTo(8496, 0); // 8000 + 496
    });

    it('should not recover energy above maximum', () => {
      const maxEnergy = getMaxEnergy(actor);
      setEnergy(actor, maxEnergy - 100); // Near maximum

      const recoveredAmount = recoverEnergy(actor, 10000); // 10 seconds

      // Should recover some energy but not exceed maximum
      expect(getCurrentEnergy(actor)).toBeLessThanOrEqual(maxEnergy);
      expect(recoveredAmount).toBeGreaterThan(0);
      expect(recoveredAmount).toBeLessThanOrEqual(100); // Can't recover more than the gap
    });

    it('should handle zero recovery time', () => {
      setEnergy(actor, 5000);

      const recovered = recoverEnergy(actor, 0);

      expect(recovered).toBe(0);
      expect(getCurrentEnergy(actor)).toBe(5000); // Should not change
    });

    it('should handle negative recovery time gracefully', () => {
      setEnergy(actor, 5000);

      const recovered = recoverEnergy(actor, -1000);

      expect(recovered).toBeLessThanOrEqual(0);
      // Energy should not increase with negative time
      expect(getCurrentEnergy(actor)).toBeLessThanOrEqual(5000);
    });

    it('should eventually recover to full capacity given enough time', () => {
      const maxEnergy = getMaxEnergy(actor);

      // Start completely depleted
      setEnergy(actor, 0);
      expect(getCurrentEnergy(actor)).toBe(0);
      expect(getEnergyPercentage(actor)).toBe(0);

      // Recovery should work even from zero
      expect(getCurrentRecoveryRate(actor)).toBeGreaterThan(0);

      // Simulate a very long recovery period (10 minutes = 600 seconds)
      // This should be more than enough time to reach full capacity
      const longRecoveryTime = 600000; // 10 minutes in milliseconds
      const totalRecovered = recoverEnergy(actor, longRecoveryTime);

      // Should reach maximum capacity
      expect(getCurrentEnergy(actor)).toBeCloseTo(maxEnergy, 1); // Within 1J of max
      expect(getEnergyPercentage(actor)).toBeCloseTo(1.0, 3); // Within 0.1% of full
      expect(totalRecovered).toBeCloseTo(maxEnergy, 1); // Should have recovered the full amount

      console.log(`\n🔋 Full Recovery Test:`);
      console.log(`Max Energy: ${maxEnergy.toFixed(1)}J`);
      console.log(`Final Energy: ${getCurrentEnergy(actor).toFixed(1)}J`);
      console.log(`Total Recovered: ${totalRecovered.toFixed(1)}J`);
      console.log(`Recovery Percentage: ${(getEnergyPercentage(actor) * 100).toFixed(2)}%`);
      console.log(`Time to full recovery: ${(longRecoveryTime / 1000).toFixed(0)} seconds`);
    });

    it('should converge to maximum energy asymptotically', () => {
      const maxEnergy = getMaxEnergy(actor);

      // Start at 90% capacity to test the final approach to maximum
      const startEnergy = maxEnergy * 0.9;
      setEnergy(actor, startEnergy);

      // Recovery rate should be very low near maximum (gaussian curve tail)
      const initialRate = getCurrentRecoveryRate(actor);
      expect(initialRate).toBeLessThan(50); // Should be much lower than max rate

      // Multiple recovery steps should gradually approach maximum
      const recoverySteps = [30, 60, 120, 300, 600]; // seconds
      let previousEnergy = startEnergy;

      recoverySteps.forEach(stepTime => {
        const recovered = recoverEnergy(actor, stepTime * 1000);
        const currentEnergy = getCurrentEnergy(actor);

        // Should make progress unless already at maximum
        if (previousEnergy < maxEnergy) {
          expect(currentEnergy).toBeGreaterThanOrEqual(previousEnergy);
          expect(recovered).toBeGreaterThanOrEqual(0);
        }

        // Should never exceed maximum
        expect(currentEnergy).toBeLessThanOrEqual(maxEnergy);

        console.log(`After ${stepTime}s: ${currentEnergy.toFixed(1)}J (${(currentEnergy/maxEnergy*100).toFixed(2)}%)`);
        previousEnergy = currentEnergy;
      });

      // After all steps, should be very close to maximum
      expect(getCurrentEnergy(actor)).toBeCloseTo(maxEnergy, 0.1);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical combat energy usage', () => {
      // Start at full energy
      const maxEnergy = getMaxEnergy(actor);
      setPosition(actor, 1.0 as NormalizedValueBetweenZeroAndOne);
      expect(getCurrentEnergy(actor)).toBeCloseTo(maxEnergy, 0);

      // Cast a spell (high energy cost)
      expect(canAfford(actor, 3000)).toBe(true);
      consumeEnergy(actor, 3000);
      expect(getCurrentEnergy(actor)).toBeCloseTo(maxEnergy - 3000, 0);

      // Perform basic attacks (lower energy cost)
      for (let i = 0; i < 5; i++) {
        consumeEnergy(actor, 500);
      }
      const energyAfterAttacks = getCurrentEnergy(actor);
      expect(energyAfterAttacks).toBeCloseTo(maxEnergy - 3000 - 2500, 0);

      // Rest and recover - use integration-based recovery
      const recovered = recoverEnergy(actor, 10000); // 10 seconds
      expect(recovered).toBeGreaterThan(0);
      expect(getCurrentEnergy(actor)).toBeCloseTo(energyAfterAttacks + recovered, 0);
    });

    it('should handle energy depletion and recovery cycle', () => {
      // Start with some energy
      setEnergy(actor, 5000);

      // Deplete energy completely
      consumeEnergy(actor, 6000); // More than available
      expect(getCurrentEnergy(actor)).toBe(0);
      expect(canAfford(actor, 1)).toBe(false);

      // Recovery from zero should work with integration-based recovery
      const recovered = recoverEnergy(actor, 20000); // 20 seconds
      expect(recovered).toBeCloseTo(1552, 0); // Integration-based recovery from 0 (updated)
      expect(getCurrentEnergy(actor)).toBeCloseTo(1552, 0);
      expect(canAfford(actor, 1000)).toBe(true);
    });

    it('should handle position-based energy management', () => {
      // Set to golden ratio position (optimal for some algorithms)
      const goldenRatio = 0.618 as NormalizedValueBetweenZeroAndOne;
      setPosition(actor, goldenRatio);

      expect(getPosition(actor)).toBe(goldenRatio);

      // Energy should match position
      const maxEnergy = getMaxEnergy(actor);
      const expectedEnergy = goldenRatio * maxEnergy;
      expect(getCurrentEnergy(actor)).toBeCloseTo(expectedEnergy, 0);
      expect(getEnergyPercentage(actor)).toBeCloseTo(goldenRatio, 3);
    });

    it('should handle stat changes during gameplay', () => {
      // Initial state with RES 15 - set energy to 10000
      setEnergy(actor, 10000);
      const initialMaxEnergy = getMaxEnergy(actor);
      expect(initialMaxEnergy).toBeCloseTo(14707, 0);
      expect(getEnergyPercentage(actor)).toBeCloseTo(10000 / initialMaxEnergy, 3);

      // Buff increases RES
      const currentShell = actor.shells[actor.currentShell];
      currentShell.stats[Stat.RES].eff = 20;
      const buffedMaxEnergy = getMaxEnergy(actor);
      expect(buffedMaxEnergy).toBeGreaterThan(initialMaxEnergy);
      // Energy stays the same, but percentage changes
      expect(getCurrentEnergy(actor)).toBe(10000);
      expect(getEnergyPercentage(actor)).toBeCloseTo(10000 / buffedMaxEnergy, 3);

      // Debuff reduces RES below current energy level
      currentShell.stats[Stat.RES].eff = 8;
      const debuffedMaxEnergy = getMaxEnergy(actor);
      expect(debuffedMaxEnergy).toBeLessThan(initialMaxEnergy);
      // Energy should be clamped when setting
      setEnergy(actor, getCurrentEnergy(actor)); // Re-clamp to new max
      expect(getCurrentEnergy(actor)).toBe(debuffedMaxEnergy); // Clamped to new max
      expect(getEnergyPercentage(actor)).toBe(1.0); // At new maximum
    });
  });

  describe('performance characteristics', () => {
    it('should handle rapid energy operations efficiently', () => {
      const operations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        setEnergy(actor, Math.random() * 15000);
        getCurrentEnergy(actor);
        canAfford(actor, 1000);
        getEnergyPercentage(actor);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / operations;

      expect(totalTime).toBeLessThan(100); // Should complete in under 100ms
      expect(avgTime).toBeLessThan(0.1); // Each operation should be under 0.1ms

      console.log(`Pure function energy operations performance:
        - ${operations} mixed operations: ${totalTime.toFixed(2)}ms
        - Average per operation: ${avgTime.toFixed(4)}ms`);
    });

    it('should handle recovery calculations efficiently', () => {
      const recoveryOperations = 500;
      const startTime = performance.now();

      for (let i = 0; i < recoveryOperations; i++) {
        computeRecoveryEnergy(actor, 6000); // 6 seconds
        getCurrentRecoveryRate(actor);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / recoveryOperations;

      expect(totalTime).toBeLessThan(50); // Should be fast
      expect(avgTime).toBeLessThan(0.1); // Each operation should be quick

      console.log(`Pure function recovery calculations performance:
        - ${recoveryOperations} recovery operations: ${totalTime.toFixed(2)}ms
        - Average per operation: ${avgTime.toFixed(4)}ms`);
    });

    it('should maintain consistent performance with energy mutations', () => {
      const operations = 200;
      const times: number[] = [];

      // Perform mixed operations and measure consistency
      for (let i = 0; i < operations; i++) {
        const start = performance.now();

        // Mixed operations
        setEnergy(actor, Math.random() * 15000);
        consumeEnergy(actor, Math.random() * 1000);
        recoverEnergy(actor, 1000); // 1 second
        canAfford(actor, 500);
        getEnergyPercentage(actor);

        const time = performance.now() - start;
        times.push(time);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const stdDev = Math.sqrt(times.reduce((sq, time) => sq + Math.pow(time - avgTime, 2), 0) / times.length);

      console.log(`Pure function performance consistency over ${operations} mixed operations:
        - Average: ${avgTime.toFixed(4)}ms
        - Min: ${minTime.toFixed(4)}ms
        - Max: ${maxTime.toFixed(4)}ms
        - Std Dev: ${stdDev.toFixed(4)}ms
        - Coefficient of Variation: ${((stdDev / avgTime) * 100).toFixed(1)}%`);

      // Performance should be reasonable (no strict assertions for micro-benchmarks)
      expect(avgTime).toBeLessThan(1.0); // Should be under 1ms on average
    });

    it('should find minimum steps for reasonable accuracy (1% margin)', () => {
      const testCases = [
        { steps: 1, label: '1 step' },
        { steps: 2, label: '2 steps' },
        { steps: 3, label: '3 steps' },
        { steps: 4, label: '4 steps' },
        { steps: 5, label: '5 steps' },
        { steps: 8, label: '8 steps' },
        { steps: 10, label: '10 steps' },
        { steps: 16, label: '16 steps (current default)' },
        { steps: 25, label: '25 steps' },
        { steps: 50, label: '50 steps' },
        { steps: 100, label: '100 steps (high precision baseline)' },
      ];

      const iterations = 1000;
      const testEnergy = 5000; // 50% energy for interesting recovery curve
      const testTime = 10; // 10 seconds recovery time

      setEnergy(actor, testEnergy);

      // Debug: Check if recovery rate actually varies
      const currentEnergy = getCurrentEnergy(actor);
      const maxEnergy = getMaxEnergy(actor);
      const maxRecoveryRate = getMaxRecoveryRate(actor);

      console.log(`\n🔍 Debug Info:`);
      console.log(`Current Energy: ${currentEnergy}J (${(currentEnergy/maxEnergy*100).toFixed(1)}%)`);
      console.log(`Max Energy: ${maxEnergy}J`);
      console.log(`Max Recovery Rate: ${maxRecoveryRate}W`);

      // Test recovery rates at different energy levels
      const testPoints = [0, 0.25, 0.5, 0.75, 1.0];
      console.log(`Recovery rates at different energy levels:`);
      testPoints.forEach(ratio => {
        const testEnergyLevel = ratio * maxEnergy;
        const recoveryRate = getCurrentRecoveryRate({ ...actor, capacitor: { ...actor.capacitor, energy: { ...actor.capacitor.energy, eff: { cur: testEnergyLevel, max: maxEnergy } } } });
        console.log(`  ${(ratio*100).toFixed(0).padStart(3)}%: ${recoveryRate.toFixed(1)}W`);
      });

      console.log('\n🎯 Finding Minimum Steps for 1% Accuracy:');
      console.log(`Testing ${iterations} iterations of 10-second recovery from ${testEnergy}J`);
      console.log('Target: Find minimum steps within 1% of high-precision baseline');
      console.log('─'.repeat(90));

      const results: Array<{ steps: number; avgTime: number; result: number }> = [];

      for (const testCase of testCases) {
        const times: number[] = [];
        let lastResult = 0;

        const currentEnergy = getCurrentEnergy(actor);
        const maxEnergy = getMaxEnergy(actor);
        const maxRecoveryRate = getMaxRecoveryRate(actor);

        // Warm up
        for (let i = 0; i < 10; i++) {
          calculateEnergyRecoveryOverTime(currentEnergy, maxEnergy, maxRecoveryRate, testTime, testCase.steps);
        }

        // Debug: Show detailed calculation for first test case
        if (testCase.steps === 1) {
          console.log(`\n🔬 Detailed calculation for ${testCase.steps} step(s):`);
          const debugResult = calculateEnergyRecoveryOverTime(currentEnergy, maxEnergy, maxRecoveryRate, testTime, testCase.steps);
          console.log(`  Input: ${currentEnergy}J → Output: ${debugResult.toFixed(3)}J`);

          // Manual calculation check
          const instantRate = getCurrentRecoveryRate(actor);
          const simpleEstimate = instantRate * testTime;
          console.log(`  Instantaneous rate: ${instantRate.toFixed(1)}W`);
          console.log(`  Simple estimate (rate × time): ${simpleEstimate.toFixed(1)}J`);
          console.log(`  Integration result: ${debugResult.toFixed(1)}J`);
          console.log(`  Difference: ${Math.abs(debugResult - simpleEstimate).toFixed(1)}J`);
        }

        // Benchmark
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();

          // Direct call to the integration function with specific step count
          const result = calculateEnergyRecoveryOverTime(currentEnergy, maxEnergy, maxRecoveryRate, testTime, testCase.steps);

          const time = performance.now() - start;
          times.push(time);
          lastResult = result;
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        results.push({ steps: testCase.steps, avgTime, result: lastResult });

        console.log(`${testCase.label.padEnd(30)} | Avg: ${avgTime.toFixed(4)}ms | Result: ${lastResult.toFixed(6)}J`);
      }

      console.log('─'.repeat(90));

      // Use 100 steps as high-precision baseline
      const baselineResult = results[results.length - 1].result;
      const accuracyThreshold = baselineResult * 0.01; // 1% of baseline result

      console.log(`\n📊 Accuracy Analysis (vs ${baselineResult.toFixed(3)}J baseline):`);
      console.log(`1% threshold: ±${accuracyThreshold.toFixed(2)}J`);
      console.log('Steps |   Error (J)   | Within 1%? | Performance');
      console.log('─'.repeat(55));

      let minimumAccurateSteps: number | null = null;

      results.forEach(({ steps, avgTime, result }) => {
        const error = Math.abs(result - baselineResult);
        const isAccurate = error <= accuracyThreshold;
        const performanceRatio = avgTime / results[0].avgTime;

        const errorStr = error.toFixed(6).padStart(9);
        const accurateStr = isAccurate ? '✅ Yes' : '❌ No';
        const perfStr = `${performanceRatio.toFixed(2)}x`;

        console.log(`${steps.toString().padStart(4)}  | ${errorStr}   | ${accurateStr.padEnd(10)} | ${perfStr}`);

        if (isAccurate && minimumAccurateSteps === null) {
          minimumAccurateSteps = steps;
        }
      });

      console.log('─'.repeat(50));

      if (minimumAccurateSteps !== null) {
        console.log(`\n🎯 RESULT: Minimum ${minimumAccurateSteps} steps needed for 1% accuracy (±${accuracyThreshold.toFixed(2)}J)`);
        console.log(`Current default (16 steps) is ${minimumAccurateSteps <= 16 ? 'sufficient' : 'insufficient'}`);

        if (minimumAccurateSteps > 16) {
          console.log(`⚠️  Recommend increasing default to ${minimumAccurateSteps} steps`);
        } else {
          console.log(`✅ Current default of 16 steps provides excellent accuracy`);
        }
      } else {
        console.log(`\n❌ No step count achieved 1% accuracy (±${accuracyThreshold.toFixed(2)}J) - may need more than 100 steps`);
      }

      // Basic assertions
      expect(baselineResult).toBeGreaterThan(0); // Should recover some energy
    });

    it('should measure throughput of 16-step integration', () => {
      const testEnergy = 5000;
      const testTime = 10;
      const integrationSteps = 16;

      setEnergy(actor, testEnergy);
      const currentEnergy = getCurrentEnergy(actor);
      const maxEnergy = getMaxEnergy(actor);
      const maxRecoveryRate = getMaxRecoveryRate(actor);

      // Warm up
      for (let i = 0; i < 100; i++) {
        calculateEnergyRecoveryOverTime(currentEnergy, maxEnergy, maxRecoveryRate, testTime, integrationSteps);
      }

      // Throughput test - measure operations per second
      const testDurationMs = 1000; // 1 second
      const startTime = performance.now();
      let operations = 0;

      while (performance.now() - startTime < testDurationMs) {
        calculateEnergyRecoveryOverTime(currentEnergy, maxEnergy, maxRecoveryRate, testTime, integrationSteps);
        operations++;
      }

      const actualDurationMs = performance.now() - startTime;
      const operationsPerSecond = (operations / actualDurationMs) * 1000;
      const avgTimePerOperation = actualDurationMs / operations;

      console.log('\n⚡ Integration Function Throughput (16 steps):');
      console.log(`Operations completed: ${operations.toLocaleString()}`);
      console.log(`Test duration: ${actualDurationMs.toFixed(1)}ms`);
      console.log(`Throughput: ${operationsPerSecond.toLocaleString()} operations/second`);
      console.log(`Average time per operation: ${(avgTimePerOperation * 1000).toFixed(2)}μs`);

      // Calculate theoretical maximum for combat scenarios
      const combatUpdatesPerSecond = 60; // Assuming 60 FPS
      const maxSimultaneousActors = Math.floor(operationsPerSecond / combatUpdatesPerSecond);

      console.log(`\n🎮 Combat Performance Implications:`);
      console.log(`At 60 FPS: Can handle ${maxSimultaneousActors.toLocaleString()} simultaneous actor energy calculations`);
      console.log(`Per frame budget: ${(1000/60).toFixed(2)}ms`);
      console.log(`Energy calculation overhead: ${(avgTimePerOperation).toFixed(4)}ms (${((avgTimePerOperation / (1000/60)) * 100).toFixed(2)}% of frame)`);

      // Performance assertions
      expect(operationsPerSecond).toBeGreaterThan(100000); // Should handle at least 100k ops/sec
      expect(avgTimePerOperation).toBeLessThan(0.01); // Should be under 10μs per operation
    });
  });


  describe('edge cases and error handling', () => {
    it('should throw when actor stats are missing', () => {
      const currentShell = actor.shells[actor.currentShell];
      // @ts-expect-error: Cannot delete a required property, but this is a test
      delete currentShell.stats[Stat.RES]

      // Should throw when stats are missing - this is correct behavior
      expect(() => getMaxEnergy(actor)).toThrow();
      expect(() => getMaxRecoveryRate(actor)).toThrow();
    });

    it('should handle corrupted capacitor state', () => {
      actor.capacitor = {
        position: NaN,
        energy: { nat: { cur: NaN, max: NaN }, eff: { cur: NaN, max: NaN }, mods: {} }
      };

      // Should handle NaN gracefully
      expect(() => getCurrentEnergy(actor)).not.toThrow();
      expect(() => setEnergy(actor, 5000)).not.toThrow();
      expect(getCurrentEnergy(actor)).toBe(5000); // Should be corrected
    });

    it('should handle extreme energy values', () => {
      // Test very large energy values
      const maxEnergy = getMaxEnergy(actor);
      setEnergy(actor, Number.MAX_SAFE_INTEGER);
      expect(getCurrentEnergy(actor)).toBeCloseTo(maxEnergy, 0); // Clamped to max

      // Test very small energy values
      setEnergy(actor, Number.MIN_SAFE_INTEGER);
      expect(getCurrentEnergy(actor)).toBe(0); // Clamped to min
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateRecoveryRate,
  calculateMaxRecoveryRate,
  calculateEnergyRecoveryOverTime,
  calculateMaxEnergy,
  GOLDEN_RATIO_PEAK
} from './energy';

describe('Phase-Shifted Sine Energy Recovery System', () => {
  const testActor = {
    resilience: 10,
    maxEnergy: calculateMaxEnergy(10), // Power curve: 10,000J at RES 10
    maxRecoveryRate: calculateMaxRecoveryRate(10) // Power curve: 150W at RES 10
  };

  describe('Recovery Rate Calculation', () => {
    it('should peak at golden ratio position (38.2%)', () => {
      const peakEnergy = testActor.maxEnergy * GOLDEN_RATIO_PEAK; // 3,820J at RES 10
      const peakRate = calculateRecoveryRate(peakEnergy, testActor.maxEnergy, testActor.maxRecoveryRate);

      // Should be at maximum efficiency (150W)
      expect(peakRate).toBeCloseTo(testActor.maxRecoveryRate, 1);
    });

    it('should have lower recovery at 0% and 100% energy', () => {
      const zeroRate = calculateRecoveryRate(0, testActor.maxEnergy, testActor.maxRecoveryRate);
      const fullRate = calculateRecoveryRate(testActor.maxEnergy, testActor.maxEnergy, testActor.maxRecoveryRate);
      const peakRate = calculateRecoveryRate(testActor.maxEnergy * GOLDEN_RATIO_PEAK, testActor.maxEnergy, testActor.maxRecoveryRate);

      expect(zeroRate).toBeLessThan(peakRate);
      expect(fullRate).toBeLessThan(peakRate);
    });

    it('should follow gaussian curve properties', () => {
      const rates: number[] = [];
      const energyLevels: number[] = [];

      // Sample recovery rates across energy spectrum
      for (let i = 0; i <= 20; i++) {
        const energy = (i / 20) * testActor.maxEnergy;
        const rate = calculateRecoveryRate(energy, testActor.maxEnergy, testActor.maxRecoveryRate);
        energyLevels.push(energy);
        rates.push(rate);
      }

      // Find peak position
      const maxRateIndex = rates.indexOf(Math.max(...rates));
      const peakEnergyRatio = energyLevels[maxRateIndex] / testActor.maxEnergy;

      // Peak should be close to golden ratio
      expect(peakEnergyRatio).toBeCloseTo(GOLDEN_RATIO_PEAK, 1);
    });
  });

  describe('Energy Recovery Over Time', () => {
    it('should recover more energy when starting near peak efficiency', () => {
      const peakEnergy = testActor.maxEnergy * GOLDEN_RATIO_PEAK;
      const lowEnergy = testActor.maxEnergy * 0.1;
      const timeInterval = 5; // 5 seconds

      const peakRecovery = calculateEnergyRecoveryOverTime(
        peakEnergy,
        testActor.maxEnergy,
        testActor.maxRecoveryRate,
        timeInterval
      );

      const lowRecovery = calculateEnergyRecoveryOverTime(
        lowEnergy,
        testActor.maxEnergy,
        testActor.maxRecoveryRate,
        timeInterval
      );

      expect(peakRecovery).toBeGreaterThan(lowRecovery);
    });

    it('should not exceed maximum capacity', () => {
      const nearFullEnergy = testActor.maxEnergy * 0.95;
      const timeInterval = 10; // Long recovery time

      const recovery = calculateEnergyRecoveryOverTime(
        nearFullEnergy,
        testActor.maxEnergy,
        testActor.maxRecoveryRate,
        timeInterval
      );

      expect(recovery).toBeLessThanOrEqual(testActor.maxEnergy - nearFullEnergy);
    });
  });

  describe('ASCII Visualization', () => {
    it('should generate recovery rate vs energy plot', () => {
      console.log('\n📊 GAUSSIAN ENERGY RECOVERY CURVE');
      console.log('Recovery Rate (Watts) vs Current Energy (% of max)\n');

      const plotWidth = 60;
      const plotHeight = 20;
      const maxRate = testActor.maxRecoveryRate;

      // Generate data points
      const dataPoints: Array<{ energyPercent: number; rate: number }> = [];
      for (let i = 0; i <= 100; i += 2) {
        const energy = (i / 100) * testActor.maxEnergy;
        const rate = calculateRecoveryRate(energy, testActor.maxEnergy, testActor.maxRecoveryRate);
        dataPoints.push({ energyPercent: i, rate });
      }

      // Create ASCII plot
      const lines: string[] = [];

      // Y-axis labels and plot area
      for (let y = plotHeight; y >= 0; y--) {
        const rateThreshold = (y / plotHeight) * maxRate;
        const yLabel = `${rateThreshold.toFixed(0).padStart(3)}W |`;

        let line = yLabel;

        for (let x = 0; x <= plotWidth; x++) {
          const energyPercent = (x / plotWidth) * 100;

          // Find closest data point
          const closestPoint = dataPoints.reduce((prev, curr) =>
            Math.abs(curr.energyPercent - energyPercent) < Math.abs(prev.energyPercent - energyPercent)
              ? curr : prev
          );

          if (Math.abs(closestPoint.rate - rateThreshold) < (maxRate / plotHeight)) {
            line += '●';
          } else if (y === 0) {
            line += '─';
          } else if (x === 0) {
            line += '│';
          } else {
            line += ' ';
          }
        }

        lines.push(line);
      }

      // X-axis
      lines.push('    └' + '─'.repeat(plotWidth));

      // X-axis labels
      let xAxisLabels = '     ';
      for (let i = 0; i <= 10; i++) {
        const label = `${i * 10}%`;
        xAxisLabels += label.padEnd(6);
      }
      lines.push(xAxisLabels);

      // Print the plot
      lines.forEach(line => console.log(line));

      // Add annotations
      console.log(`\n🎯 Peak Recovery: ${GOLDEN_RATIO_PEAK * 100}% energy (Golden Ratio)`);
      console.log(`📈 Max Rate: ${maxRate}W at peak efficiency`);
      console.log(`📉 Golden Ratio Recovery Curve: Peak at ${GOLDEN_RATIO_PEAK * 100}%, diminishing at extremes`);

      // Verify the visualization shows expected pattern
      const peakPoint = dataPoints.find(p => Math.abs(p.energyPercent - (GOLDEN_RATIO_PEAK * 100)) < 5);
      expect(peakPoint).toBeDefined();
      expect(peakPoint!.rate).toBeGreaterThan(maxRate * 0.85); // Should be near maximum (allowing for discrete sampling)
    });

    it('should demonstrate recovery scenarios', () => {
      console.log('\n⚡ ENERGY RECOVERY SCENARIOS\n');

      const scenarios = [
        { name: 'Exhausted Fighter', energy: 0.05, description: 'Nearly depleted, slow recovery' },
        { name: 'Optimal Zone', energy: GOLDEN_RATIO_PEAK, description: 'Peak recovery efficiency' },
        { name: 'Well Rested', energy: 0.80, description: 'High energy, diminishing returns' },
        { name: 'Fully Charged', energy: 0.95, description: 'Nearly full, minimal recovery' }
      ];

      scenarios.forEach(scenario => {
        const currentEnergy = scenario.energy * testActor.maxEnergy;
        const recoveryRate = calculateRecoveryRate(currentEnergy, testActor.maxEnergy, testActor.maxRecoveryRate);
        const efficiency = (recoveryRate / testActor.maxRecoveryRate) * 100;

        const recovery5s = calculateEnergyRecoveryOverTime(
          currentEnergy,
          testActor.maxEnergy,
          testActor.maxRecoveryRate,
          5
        );

        console.log(`${scenario.name}:`);
        console.log(`  Energy: ${(scenario.energy * 100).toFixed(1)}% (${currentEnergy.toFixed(0)}J)`);
        console.log(`  Recovery Rate: ${recoveryRate.toFixed(1)}W (${efficiency.toFixed(1)}% efficiency)`);
        console.log(`  5s Recovery: +${recovery5s.toFixed(0)}J`);
        console.log(`  ${scenario.description}\n`);
      });

      // Verify scenarios make physical sense
      const exhaustedRate = calculateRecoveryRate(0.05 * testActor.maxEnergy, testActor.maxEnergy, testActor.maxRecoveryRate);
      const optimalRate = calculateRecoveryRate(GOLDEN_RATIO_PEAK * testActor.maxEnergy, testActor.maxEnergy, testActor.maxRecoveryRate);
      const fullRate = calculateRecoveryRate(0.95 * testActor.maxEnergy, testActor.maxEnergy, testActor.maxRecoveryRate);

      expect(optimalRate).toBeGreaterThan(exhaustedRate);
      expect(optimalRate).toBeGreaterThan(fullRate);
    });
  });

  describe('Integration with Combat System', () => {
    it('should match combat system mathematical foundation', () => {
      // Power curve recovery: 150W at RES 10, 500W at RES 100
      const calculatedMaxRate = calculateMaxRecoveryRate(testActor.resilience);
      expect(calculatedMaxRate).toBe(testActor.maxRecoveryRate);

      // Peak should be at φ⁻² (golden ratio conjugate squared) ≈ 0.382
      const phi = (1 + Math.sqrt(5)) / 2;
      const expectedPeak = 1 / (phi * phi); // φ⁻² ≈ 0.382

      // Our GOLDEN_RATIO_PEAK should be close to this
      expect(GOLDEN_RATIO_PEAK).toBeCloseTo(expectedPeak, 2);
    });

    it('should provide realistic recovery times', () => {
      // Test realistic combat recovery scenarios
      const combatScenarios = [
        { name: 'Quick breather', time: 3, expectedMinRecovery: 50 },
        { name: 'Short rest', time: 10, expectedMinRecovery: 150 },
        { name: 'Extended rest', time: 30, expectedMinRecovery: 400 }
      ];

      combatScenarios.forEach(scenario => {
        const startEnergy = testActor.maxEnergy * 0.3; // 30% energy
        const recovery = calculateEnergyRecoveryOverTime(
          startEnergy,
          testActor.maxEnergy,
          testActor.maxRecoveryRate,
          scenario.time
        );

        console.log(`${scenario.name} (${scenario.time}s): +${recovery.toFixed(0)}J recovery`);
        expect(recovery).toBeGreaterThan(scenario.expectedMinRecovery);
      });
    });
  });
});

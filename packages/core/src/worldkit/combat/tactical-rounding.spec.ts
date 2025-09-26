import { describe, it, expect } from 'vitest';
import {
  roundApCostUp,
  roundDistanceDown,
  roundPosition,
  calculateTacticalApCost,
  calculateTacticalDistance,
  calculateTacticalMovement,
} from './tactical-rounding';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';

describe('Tactical Rounding Universe', () => {

  describe('Core Rounding Functions', () => {
    describe('roundApCostUp', () => {
      it('should round AP costs up to nearest 0.1', () => {
        expect(roundApCostUp(1.01)).toBe(1.1);
        expect(roundApCostUp(1.95)).toBe(2.0);
        expect(roundApCostUp(2.00)).toBe(2.0);
        expect(roundApCostUp(2.751)).toBe(2.8);
        expect(roundApCostUp(3.999)).toBe(4.0);
        expect(roundApCostUp(0.001)).toBe(0.1);
      });

      it('should handle edge cases', () => {
        expect(roundApCostUp(0)).toBe(0);
        expect(roundApCostUp(1.0)).toBe(1.0);
        expect(roundApCostUp(1.1)).toBe(1.1);
      });
    });

    describe('roundDistanceDown', () => {
      it('should round distances down to whole meters', () => {
        expect(roundDistanceDown(5.99)).toBe(5);
        expect(roundDistanceDown(10.01)).toBe(10);
        expect(roundDistanceDown(15.00)).toBe(15);
        expect(roundDistanceDown(7.999)).toBe(7);
        expect(roundDistanceDown(0.999)).toBe(0);
      });

      it('should handle edge cases', () => {
        expect(roundDistanceDown(0)).toBe(0);
        expect(roundDistanceDown(1.0)).toBe(1);
        expect(roundDistanceDown(10.0)).toBe(10);
      });
    });

    describe('roundPosition', () => {
      it('should round positions down to whole meters (distance-related)', () => {
        expect(roundPosition(100.99)).toBe(100);
        expect(roundPosition(50.01)).toBe(50);
        expect(roundPosition(75.00)).toBe(75);
        expect(roundPosition(99.999)).toBe(99);
        expect(roundPosition(0.999)).toBe(0);
      });

      it('should handle negative positions', () => {
        expect(roundPosition(-0.1)).toBe(-1);
        expect(roundPosition(-1.9)).toBe(-2);
        expect(roundPosition(-5.0)).toBe(-5);
      });
    });
  });

  describe('Tactical Calculations', () => {
    describe('calculateTacticalApCost', () => {
      it('should use high-precision calculation then round up', () => {
        // Test case: 50 POW, 50 FIN, 10m, 70kg
        const preciseAp = distanceToAp(50, 50, 10, 70);
        const tacticalAp = calculateTacticalApCost(50, 50, 10, 70, distanceToAp);

        console.log(`\n🎯 AP Cost Calculation:`);
        console.log(`  Precise: ${preciseAp} AP`);
        console.log(`  Tactical: ${tacticalAp} AP (rounded up)`);

        expect(tacticalAp).toBe(roundApCostUp(preciseAp));
        expect(tacticalAp).toBeGreaterThanOrEqual(preciseAp);
      });
    });

    describe('calculateTacticalDistance', () => {
      it('should use high-precision calculation then round down', () => {
        // Test case: 50 POW, 50 FIN, 2.0 AP, 70kg
        const preciseDistance = apToDistance(50, 50, 2.0, 70);
        const tacticalDistance = calculateTacticalDistance(50, 50, 2.0, 70, apToDistance);

        console.log(`\n🎯 Distance Calculation:`);
        console.log(`  Precise: ${preciseDistance}m`);
        console.log(`  Tactical: ${tacticalDistance}m (rounded down)`);

        expect(tacticalDistance).toBe(roundDistanceDown(preciseDistance));
        expect(tacticalDistance).toBeLessThanOrEqual(preciseDistance);
      });
    });
  });

  describe('Complete Tactical Movement', () => {
    describe('distance-based movement', () => {
      it('should provide both precise and tactical values', () => {
        const result = calculateTacticalMovement(
          50, 50, // POW, FIN
          { type: 'distance', distance: 12.7 }, // Input
          70, // mass
          100, // current position
          1, // forward direction
          distanceToAp,
          apToDistance
        );

        console.log(`\n🏃 Distance-Based Movement (12.7m forward from position 100):`);
        console.log(`  Precise AP Cost: ${result.precise.apCost}`);
        console.log(`  Tactical AP Cost: ${result.tactical.apCost} (rounded up)`);
        console.log(`  Precise Distance: ${result.precise.distance}m`);
        console.log(`  Tactical Distance: ${result.tactical.distance}m (rounded down)`);
        console.log(`  Precise Position: ${result.precise.position}`);
        console.log(`  Tactical Position: ${result.tactical.position} (rounded down)`);

        // Validate rounding behavior
        expect(result.tactical.apCost).toBe(roundApCostUp(result.precise.apCost));
        expect(result.tactical.distance).toBe(roundDistanceDown(result.precise.distance));
        expect(result.tactical.position).toBe(roundPosition(result.precise.position));

        // Validate conservative rounding
        expect(result.tactical.apCost).toBeGreaterThanOrEqual(result.precise.apCost);
        expect(result.tactical.distance).toBeLessThanOrEqual(result.precise.distance);
        expect(result.tactical.position).toBeLessThanOrEqual(result.precise.position);
      });
    });

    describe('AP-based movement', () => {
      it('should provide both precise and tactical values', () => {
        const result = calculateTacticalMovement(
          75, 40, // POW, FIN
          { type: 'ap', ap: 3.7 }, // Input
          80, // mass
          150, // current position
          -1, // backward direction (retreat)
          distanceToAp,
          apToDistance
        );

        console.log(`\n🏃 AP-Based Movement (3.7 AP retreat from position 150):`);
        console.log(`  Precise AP Cost: ${result.precise.apCost}`);
        console.log(`  Tactical AP Cost: ${result.tactical.apCost} (rounded up)`);
        console.log(`  Precise Distance: ${result.precise.distance}m`);
        console.log(`  Tactical Distance: ${result.tactical.distance}m (rounded down)`);
        console.log(`  Precise Position: ${result.precise.position}`);
        console.log(`  Tactical Position: ${result.tactical.position} (rounded down)`);

        // Validate rounding behavior
        expect(result.tactical.apCost).toBe(roundApCostUp(result.precise.apCost));
        expect(result.tactical.distance).toBe(roundDistanceDown(result.precise.distance));
        expect(result.tactical.position).toBe(roundPosition(result.precise.position));
      });
    });
  });

  describe('Tactical Implications', () => {
    it('should demonstrate conservative rounding prevents exploitation', () => {
      console.log(`\n⚔️  TACTICAL ROUNDING IMPLICATIONS\n`);

      const testCases = [
        { distance: 5.1, description: 'Tiny overshoot (5.1m)' },
        { distance: 10.9, description: 'Large fractional (10.9m)' },
        { distance: 15.01, description: 'Minimal overshoot (15.01m)' },
        { distance: 20.99, description: 'Near whole number (20.99m)' },
      ];

      console.log('Distance   Precise AP   Tactical AP   AP Penalty   Tactical Distance   Distance Loss');
      console.log('--------   ----------   -----------   ----------   -----------------   -------------');

      for (const testCase of testCases) {
        const preciseAp = distanceToAp(50, 50, testCase.distance, 70);
        const tacticalAp = roundApCostUp(preciseAp);
        const tacticalDistance = roundDistanceDown(testCase.distance);

        const apPenalty = tacticalAp - preciseAp;
        const distanceLoss = testCase.distance - tacticalDistance;

        console.log(
          `${testCase.distance.toString().padStart(6)}m   ${preciseAp.toFixed(3).padStart(8)}   ` +
          `${tacticalAp.toFixed(1).padStart(9)}   ${apPenalty.toFixed(3).padStart(8)}   ` +
          `${tacticalDistance.toString().padStart(15)}m   ${distanceLoss.toFixed(2).padStart(11)}m`
        );

        // Validate conservative behavior
        expect(tacticalAp).toBeGreaterThanOrEqual(preciseAp);
        expect(tacticalDistance).toBeLessThanOrEqual(testCase.distance);
      }

      console.log('\n💡 TACTICAL INSIGHTS:');
      console.log('• AP costs rounded UP prevent fractional AP exploitation');
      console.log('• Distances rounded DOWN prevent fractional positioning advantages');
      console.log('• Players must account for rounding penalties in tactical planning');
      console.log('• Conservative rounding creates predictable, fair gameplay mechanics');
    });

    it('should show positioning implications', () => {
      console.log(`\n📍 POSITIONING IMPLICATIONS\n`);

      const startPosition = 100;
      const movements = [
        { distance: 7.9, direction: 1, description: 'Advance 7.9m' },
        { distance: 12.3, direction: -1, description: 'Retreat 12.3m' },
        { distance: 5.01, direction: 1, description: 'Advance 5.01m' },
        { distance: 8.99, direction: -1, description: 'Retreat 8.99m' },
      ];

      console.log('Movement           Precise End   Tactical End   Position Loss');
      console.log('---------------    -----------   ------------   -------------');

      for (const movement of movements) {
        const preciseEnd = startPosition + (movement.direction * movement.distance);
        const tacticalEnd = roundPosition(preciseEnd);
        const positionLoss = Math.abs(preciseEnd - tacticalEnd);

        console.log(
          `${movement.description.padEnd(15)}    ${preciseEnd.toFixed(2).padStart(9)}   ` +
          `${tacticalEnd.toString().padStart(10)}   ${positionLoss.toFixed(2).padStart(11)}m`
        );

        // Validate position rounding
        expect(tacticalEnd).toBe(Math.floor(preciseEnd));
      }

      console.log('\n💡 POSITIONING INSIGHTS:');
      console.log('• All positions rounded down to whole meters');
      console.log('• Creates grid-based tactical positioning');
      console.log('• Prevents fractional positioning advantages');
      console.log('• Players lose fractional position gains (conservative)');
    });
  });

  describe('Real Combat Scenarios', () => {
    it('should demonstrate Major Kusanagi tactical movement', () => {
      console.log(`\n🤖 MAJOR KUSANAGI TACTICAL MOVEMENT\n`);

      const kusanagi = { power: 100, finesse: 100, mass: 60 };
      const scenarios = [
        { distance: 10.7, description: 'Close engagement (10.7m)' },
        { distance: 25.3, description: 'Medium range (25.3m)' },
        { distance: 50.9, description: 'Long range (50.9m)' },
      ];

      console.log('Scenario              Precise AP   Tactical AP   Distance Loss   Tactical Advantage');
      console.log('-------------------   ----------   -----------   -------------   ------------------');

      for (const scenario of scenarios) {
        const result = calculateTacticalMovement(
          kusanagi.power, kusanagi.finesse,
          { type: 'distance', distance: scenario.distance },
          kusanagi.mass,
          0, 1,
          distanceToAp, apToDistance
        );

        const distanceLoss = result.precise.distance - result.tactical.distance;
        const apPenalty = result.tactical.apCost - result.precise.apCost;

        console.log(
          `${scenario.description.padEnd(19)}   ${result.precise.apCost.toFixed(3).padStart(8)}   ` +
          `${result.tactical.apCost.toFixed(1).padStart(9)}   ${distanceLoss.toFixed(1).padStart(11)}m   ` +
          `+${apPenalty.toFixed(3)} AP penalty`
        );
      }

      console.log('\n💡 SUPERHUMAN TACTICAL IMPLICATIONS:');
      console.log('• Even superhuman characters face rounding penalties');
      console.log('• High-precision capabilities still subject to tactical grid');
      console.log('• Creates consistent gameplay rules regardless of character power');
    });
  });
});

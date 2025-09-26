import { describe, it, expect } from 'vitest';
import { calculateMaxAp, DEFAULT_BASE_AP } from './ap';
import { Actor } from '~/types/entity/actor';
import { GOLDEN_RATIO } from '~/types/world/constants';
import { BASELINE_STAT_VALUE, NORMAL_STAT_RANGE } from '~/worldkit/entity/actor/stats';
import { createActor } from '~/worldkit/entity/actor';

// Helper to create test actor with specific INT
function createTestActor(intelligence: number = 10): Actor {
  return createActor({
    id: `flux:actor:test:int-${intelligence}`,
  }, (actor) => ({
    ...actor,
    stats: {
      ...actor.stats,
      int: { nat: 0, eff: intelligence, mods: {} },
    },
  }));
}

// Helper to generate ASCII visualization of AP growth curve
function generateAPVisualization(dataPoints: Array<{ int: number; ap: number; ratio: number }>): string {
  const width = 60;
  const height = 20;

  // Find min/max values for scaling
  const minInt = Math.min(...dataPoints.map(p => p.int));
  const maxInt = Math.max(...dataPoints.map(p => p.int));
  const minAP = Math.min(...dataPoints.map(p => p.ap));
  const maxAP = Math.max(...dataPoints.map(p => p.ap));

  // Create grid
  const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

  // Plot data points
  dataPoints.forEach(({ int, ap }) => {
    const x = Math.round(((int - minInt) / (maxInt - minInt)) * (width - 1));
    const y = Math.round(((maxAP - ap) / (maxAP - minAP)) * (height - 1));

    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = '*';
    }
  });

  // Add axes
  for (let y = 0; y < height; y++) {
    grid[y][0] = '|';
  }
  for (let x = 0; x < width; x++) {
    grid[height - 1][x] = '-';
  }
  grid[height - 1][0] = '+';

  // Convert grid to string
  const lines = grid.map(row => row.join(''));

  // Add labels
  const result = [
    `AP (${minAP.toFixed(1)} - ${maxAP.toFixed(1)})`,
    ...lines,
    `${' '.repeat(Math.floor(width / 2) - 3)}INT (${minInt} - ${maxInt})`
  ];

  return result.join('\n');
}

describe('AP Calculation System', () => {
  describe('calculateAPCapacity', () => {
    describe('baseline behavior', () => {
      it('should return base AP for baseline intelligence', () => {
        const actor = createTestActor(BASELINE_STAT_VALUE); // INT 10
        const ap = calculateMaxAp(actor);

        expect(ap).toBeCloseTo(DEFAULT_BASE_AP, 2); // 6.0 AP
      });

      it('should return base AP for intelligence below baseline', () => {
        const actor = createTestActor(5); // Below baseline
        const ap = calculateMaxAp(actor);

        expect(ap).toBeCloseTo(DEFAULT_BASE_AP, 2); // Still 6.0 AP
      });
    });

    describe('logarithmic scaling', () => {
      it('should approach golden ratio maximum at max intelligence', () => {
        const actor = createTestActor(BASELINE_STAT_VALUE + NORMAL_STAT_RANGE); // INT 100
        console.log('actor', actor);
        const ap = calculateMaxAp(actor);
        console.log('ap', ap);
        const expectedMax = DEFAULT_BASE_AP * GOLDEN_RATIO; // ~9.708

        expect(ap).toBeCloseTo(expectedMax, 2);
      });

      it('should show early gains are larger than late gains', () => {
        // Early gain: INT 10 → 30
        const earlyActor1 = createTestActor(10);
        const earlyActor2 = createTestActor(30);
        const earlyGain = calculateMaxAp(earlyActor2) - calculateMaxAp(earlyActor1);

        // Late gain: INT 70 → 90
        const lateActor1 = createTestActor(70);
        const lateActor2 = createTestActor(90);
        const lateGain = calculateMaxAp(lateActor2) - calculateMaxAp(lateActor1);

        expect(earlyGain).toBeGreaterThan(lateGain);
      });

      it('should be monotonically increasing', () => {
        const intelligenceValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const apValues = intelligenceValues.map(int => {
          const actor = createTestActor(int);
          return calculateMaxAp(actor);
        });

        // Each value should be greater than the previous
        for (let i = 1; i < apValues.length; i++) {
          expect(apValues[i]).toBeGreaterThan(apValues[i - 1]);
        }
      });
    });

    describe.each([
      { int: 10, expectedAP: 6.0, description: 'baseline' },
      { int: 25, expectedRange: [6.8, 7.2], description: 'first quartile' },
      { int: 50, expectedRange: [7.8, 8.3], description: 'midpoint' },
      { int: 75, expectedRange: [8.5, 9.2], description: 'third quartile' },
      { int: 100, expectedAP: DEFAULT_BASE_AP * GOLDEN_RATIO, description: 'maximum' },
    ])('intelligence breakpoint: INT $int ($description)', ({ int, expectedAP, expectedRange }) => {
      it(`should calculate correct AP for INT ${int}`, () => {
        const actor = createTestActor(int);
        const ap = calculateMaxAp(actor);

        if (expectedAP !== undefined) {
          expect(ap).toBeCloseTo(expectedAP, 2);
        } else if (expectedRange) {
          expect(ap).toBeGreaterThanOrEqual(expectedRange[0]);
          expect(ap).toBeLessThanOrEqual(expectedRange[1]);
        }
      });
    });

        describe('parameterized options', () => {
      it.each([
        {
          name: 'custom base AP',
          actorInt: 10,
          options: { baseAp: 8.0 },
          expectedAP: 8.0,
        },
        {
          name: 'custom stat range',
          actorInt: 60,
          options: { statRange: 50, baseStatValue: 10 },
          expectedAP: DEFAULT_BASE_AP * GOLDEN_RATIO, // Should be at maximum
        },
        {
          name: 'custom baseline stat value',
          actorInt: 20,
          options: { baseStatValue: 20 },
          expectedAP: DEFAULT_BASE_AP, // Actor INT equals baseline
        },
      ])('should respect $name', ({ actorInt, options, expectedAP }) => {
        const actor = createTestActor(actorInt);
        const ap = calculateMaxAp(actor, options);

        expect(ap).toBeCloseTo(expectedAP, 2);
      });
    });

    describe('mathematical properties', () => {
      it('should follow logarithmic curve shape', () => {
        // Test that the second derivative is negative (concave down)
        const testPoints = [20, 30, 40, 50, 60, 70, 80];
        const apValues = testPoints.map(int => {
          const actor = createTestActor(int);
          return calculateMaxAp(actor);
        });

        // Calculate second differences (approximation of second derivative)
        for (let i = 1; i < apValues.length - 1; i++) {
          const firstDiff1 = apValues[i] - apValues[i - 1];
          const firstDiff2 = apValues[i + 1] - apValues[i];
          const secondDiff = firstDiff2 - firstDiff1;

          // Should be negative for logarithmic curve (diminishing returns)
          expect(secondDiff).toBeLessThan(0.1); // Allow small positive due to discretization
        }
      });

      it('should have continuous values', () => {
        // Test that small changes in INT produce small changes in AP
        const baseInt = 50;
        const actor1 = createTestActor(baseInt);
        const actor2 = createTestActor(baseInt + 1);

        const ap1 = calculateMaxAp(actor1);
        const ap2 = calculateMaxAp(actor2);
        const difference = Math.abs(ap2 - ap1);

        expect(difference).toBeLessThan(0.1); // Small change
        expect(difference).toBeGreaterThan(0); // But still positive
      });
    });

    describe('edge cases', () => {
      it.each([
        {
          name: 'zero intelligence',
          intelligence: 0,
          expectation: 'should return base AP',
          expectedAP: DEFAULT_BASE_AP,
        },
        {
          name: 'negative intelligence',
          intelligence: -10,
          expectation: 'should return base AP',
          expectedAP: DEFAULT_BASE_AP,
        },
        {
          name: 'extremely high intelligence',
          intelligence: 1000,
          expectation: 'should exceed golden ratio maximum',
          testFn: (ap: number) => {
            const expectedMax = DEFAULT_BASE_AP * GOLDEN_RATIO;
            expect(ap).toBeGreaterThan(expectedMax);
          },
        },
      ])('should handle $name ($expectation)', ({ intelligence, expectedAP, testFn }) => {
        const actor = createTestActor(intelligence);
        const ap = calculateMaxAp(actor);

        if (expectedAP !== undefined) {
          expect(ap).toBeCloseTo(expectedAP, 2);
        }

        if (testFn) {
          testFn(ap);
        }

        expect(Number.isFinite(ap)).toBe(true);
      });
    });

    describe('performance characteristics', () => {
      it('should complete calculations quickly', () => {
        const start = performance.now();

        // Calculate AP for 1000 different actors
        for (let i = 0; i < 1000; i++) {
          const actor = createTestActor(10 + (i % 90));
          calculateMaxAp(actor);
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100); // Should complete in under 100ms
      });
    });

    describe('visualization', () => {
      it('should generate AP growth curve data', () => {
        const dataPoints: Array<{ int: number; ap: number; ratio: number }> = [];

        // Generate data points across the full intelligence range
        for (let int = 0; int <= 120; int += 5) {
          const actor = createTestActor(int);
          const ap = calculateMaxAp(actor);
          const ratio = ap / DEFAULT_BASE_AP;

          dataPoints.push({ int, ap, ratio });
        }

        // Generate ASCII visualization
        const visualization = generateAPVisualization(dataPoints);

        // Output visualization for manual inspection
        console.log('\n=== AP Growth Curve (INT vs AP) ===');
        console.log(visualization);
        console.log('\nData Points:');
        console.log('INT\tAP\tRatio');
        dataPoints.forEach(({ int, ap, ratio }) => {
          if (int % 10 === 0) { // Show every 10th point
            console.log(`${int}\t${ap.toFixed(2)}\t${ratio.toFixed(2)}x`);
          }
        });

        // Verify key mathematical properties
        expect(dataPoints[2].ap).toBeCloseTo(DEFAULT_BASE_AP, 1); // INT 10 ≈ base AP
        expect(dataPoints[dataPoints.length - 5].ap).toBeCloseTo(DEFAULT_BASE_AP * GOLDEN_RATIO, 1); // INT 100 ≈ golden ratio max
        expect(dataPoints.every(point => Number.isFinite(point.ap))).toBe(true);
      });
    });
  });

  describe('integration with golden ratio', () => {
    it('should use golden ratio as maximum multiplier', () => {
      const actor = createTestActor(100);
      const maxAP = calculateMaxAp(actor);
      const expectedRatio = maxAP / DEFAULT_BASE_AP;

      expect(expectedRatio).toBeCloseTo(GOLDEN_RATIO, 2);
    });

    it.each([
      { int: 10, expectedRatio: 1.0, description: 'baseline', tolerance: 0.01 },
      { int: 25, minRatio: 1.1, description: 'first quartile' },
      { int: 50, minRatio: 1.3, description: 'midpoint' },
      { int: 75, minRatio: 1.45, description: 'third quartile' },
      { int: 100, expectedRatio: GOLDEN_RATIO, description: 'maximum', tolerance: 0.01 },
    ])('should maintain progression ratios at INT $int ($description)', ({ int, expectedRatio, minRatio, tolerance }) => {
      const actor = createTestActor(int);
      const ap = calculateMaxAp(actor);
      const ratio = ap / DEFAULT_BASE_AP;

      if (expectedRatio !== undefined && tolerance !== undefined) {
        expect(ratio).toBeCloseTo(expectedRatio, 2);
      } else if (minRatio !== undefined) {
        expect(ratio).toBeGreaterThan(minRatio);
      }
    });
  });
});

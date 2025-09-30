import { describe, it, expect } from 'vitest';
import { calculateMutationCost, createShellStatMutation } from './planning';
import { createShell, setShellStats } from '~/worldkit/entity/shell';
import { ActorStat, ShellStat } from '~/types/entity/actor';
import { BASELINE_STAT_VALUE, MAX_STAT_VALUE } from '~/worldkit/entity/actor';
import { StatMutationOperation } from '~/types/workbench';
import { calculateShellStatUpgradeCost } from './cost';

describe('Workbench: Planning Utilities', () => {
  describe('calculateShellStatUpgradeCost', () => {
    it('should show cost progression with visualization table', () => {
      const shell = createShell({ name: 'Test Shell' });
      const stat: ShellStat = ActorStat.POW;

      // Create visualization data
      const costTable: Array<{ statValue: number; stepCost: number; totalCost: number }> = [];
      let totalCumulativeCost = 0;

      // Test cost progression from baseline to max
      for (let currentValue = BASELINE_STAT_VALUE; currentValue < MAX_STAT_VALUE; currentValue++) {
        // Update shell to current stat value
        const testShell = setShellStats(shell, { [stat]: currentValue });

        // Calculate cost to upgrade by 1
        const mutation = createShellStatMutation(stat, StatMutationOperation.ADD, 1);
        const stepCost = calculateMutationCost(testShell, mutation);
        totalCumulativeCost += stepCost;

        costTable.push({
          statValue: currentValue + 1, // The target value after upgrade
          stepCost,
          totalCost: totalCumulativeCost,
        });
      }

      // Print visualization table
      console.log('\n📊 Shell Stat Upgrade Cost Progression (POW)');
      console.log('═'.repeat(60));
      console.log('│ Stat Value │ Step Cost │ Total Cumulative Cost │');
      console.log('├────────────┼───────────┼───────────────────────┤');

      // Show key milestones
      const milestones = [11, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];

      for (const milestone of milestones) {
        const entry = costTable.find(row => row.statValue === milestone);
        if (entry) {
          const statStr = entry.statValue.toString().padStart(10);
          const stepStr = entry.stepCost.toString().padStart(9);
          const totalStr = entry.totalCost.toLocaleString().padStart(19);
          console.log(`│ ${statStr} │ ${stepStr} │ ${totalStr} │`);
        }
      }
      console.log('└────────────┴───────────┴───────────────────────┘');

      // Verify expectations based on the new 10-level tier system
      // Tier = Math.floor(level / 10), Cost = 3^tier
      const cost11 = costTable.find(row => row.statValue === 11)!;
      const cost15 = costTable.find(row => row.statValue === 15)!;
      const cost20 = costTable.find(row => row.statValue === 20)!;
      const cost25 = costTable.find(row => row.statValue === 25)!;
      const cost30 = costTable.find(row => row.statValue === 30)!;
      const cost40 = costTable.find(row => row.statValue === 40)!;
      const cost50 = costTable.find(row => row.statValue === 50)!;

      // Tier 1 (10-19): tier = floor(10-19/10) = 1, cost = 3^1 = 3
      expect(cost11.stepCost).toBe(3);
      expect(cost15.stepCost).toBe(3);
      expect(cost20.stepCost).toBe(3);

      // Tier 2 (20-29): tier = floor(20-29/10) = 2, cost = 3^2 = 9
      expect(cost25.stepCost).toBe(9);
      expect(cost30.stepCost).toBe(9);

      // Tier 3 (30-39): tier = floor(30-39/10) = 3, cost = 3^3 = 27
      expect(cost40.stepCost).toBe(27);

      // Tier 4 (40-49): tier = floor(40-49/10) = 4, cost = 3^4 = 81
      expect(cost50.stepCost).toBe(81);

      // Verify the progression matches design goals
      console.log(`\n💰 Key Cost Points (Much Better!):`);
      console.log(`  - Reach level 20: ${cost20.totalCost.toLocaleString()} total cost`);
      console.log(`  - Reach level 30: ${cost30.totalCost.toLocaleString()} total cost`);
      console.log(`  - Reach level 50: ${cost50.totalCost.toLocaleString()} total cost`);

      // Verify design goals are met
      expect(cost30.totalCost).toBeLessThan(200); // "Low cost to reach ~30" ✅
      expect(cost50.totalCost).toBeLessThan(2000); // "Low cost to reach ~50" ✅
    });

    it('should calculate direct upgrade costs correctly', () => {
      // Test the direct cost calculation function with 10-level tiers
      // Cost = 3^(floor(level/10)) for each level
      const testCases = [
        { from: 10, to: 11, expected: 3 },      // Level 10: tier=1, cost=3^1=3
        { from: 15, to: 16, expected: 3 },      // Level 15: tier=1, cost=3^1=3
        { from: 19, to: 20, expected: 3 },      // Level 19: tier=1, cost=3^1=3
        { from: 20, to: 21, expected: 9 },      // Level 20: tier=2, cost=3^2=9
        { from: 25, to: 26, expected: 9 },      // Level 25: tier=2, cost=3^2=9
        { from: 30, to: 31, expected: 27 },     // Level 30: tier=3, cost=3^3=27
        { from: 40, to: 41, expected: 81 },     // Level 40: tier=4, cost=3^4=81
      ];

      for (const testCase of testCases) {
        const actualCost = calculateShellStatUpgradeCost(testCase.from, testCase.to);
        expect(actualCost).toBe(testCase.expected);
      }

      // Test multi-level upgrades
      expect(calculateShellStatUpgradeCost(10, 20)).toBe(30);   // 10 levels at 3 each = 30
      expect(calculateShellStatUpgradeCost(20, 30)).toBe(90);   // 10 levels at 9 each = 90
      expect(calculateShellStatUpgradeCost(30, 40)).toBe(270);  // 10 levels at 27 each = 270
      expect(calculateShellStatUpgradeCost(10, 50)).toBe(1200); // 30+90+270+810 = 1200
    });

    it('should handle edge cases correctly', () => {
      // No cost for same value
      expect(calculateShellStatUpgradeCost(15, 15)).toBe(0);

      // No cost for downgrades
      expect(calculateShellStatUpgradeCost(20, 15)).toBe(0);

      // Below baseline recovery cost
      expect(calculateShellStatUpgradeCost(5, 8)).toBe(5);
    });

    it('should work with mutation system', () => {
      const shell = createShell({ name: 'Test Shell' });

      // Test single step upgrade
      const mutation = createShellStatMutation(ActorStat.POW, StatMutationOperation.ADD, 1);
      const cost = calculateMutationCost(shell, mutation);

      // From baseline (10) to 11: tier = floor(10/10) = 1, cost = 3^1 = 3
      expect(cost).toBe(3);

      // Test larger upgrade
      const bigMutation = createShellStatMutation(ActorStat.POW, StatMutationOperation.ADD, 10);
      const bigCost = calculateMutationCost(shell, bigMutation);

      // From 10 to 20: 10 levels at 3 each = 30
      expect(bigCost).toBe(30);
      expect(bigCost).toBeGreaterThan(cost);

      console.log(`Single step cost (10→11): ${cost}`);
      console.log(`Big upgrade cost (10→20): ${bigCost}`);
    });

    it('should compute costs correctly as stat level traverses tiers', () => {
      // Test that costs change correctly at tier boundaries
      // Tier boundaries: 10, 20, 30, 40, 50, 60, 70, 80, 90

      const testCases = [
        // Tier 1 (10-19): cost = 3^1 = 3
        { from: 10, to: 11, expectedCost: 3, tier: 1 },
        { from: 15, to: 16, expectedCost: 3, tier: 1 },
        { from: 18, to: 19, expectedCost: 3, tier: 1 },
        { from: 19, to: 20, expectedCost: 3, tier: 1 }, // Last level of tier 1

        // Tier 2 (20-29): cost = 3^2 = 9
        { from: 20, to: 21, expectedCost: 9, tier: 2 }, // First level of tier 2
        { from: 25, to: 26, expectedCost: 9, tier: 2 },
        { from: 29, to: 30, expectedCost: 9, tier: 2 }, // Last level of tier 2

        // Tier 3 (30-39): cost = 3^3 = 27
        { from: 30, to: 31, expectedCost: 27, tier: 3 }, // First level of tier 3
        { from: 35, to: 36, expectedCost: 27, tier: 3 },
        { from: 39, to: 40, expectedCost: 27, tier: 3 }, // Last level of tier 3

        // Tier 4 (40-49): cost = 3^4 = 81
        { from: 40, to: 41, expectedCost: 81, tier: 4 }, // First level of tier 4
        { from: 45, to: 46, expectedCost: 81, tier: 4 },
        { from: 49, to: 50, expectedCost: 81, tier: 4 }, // Last level of tier 4

        // Tier 5 (50-59): cost = 3^5 = 243
        { from: 50, to: 51, expectedCost: 243, tier: 5 }, // First level of tier 5
        { from: 55, to: 56, expectedCost: 243, tier: 5 },

        // Higher tiers for verification
        { from: 60, to: 61, expectedCost: 729, tier: 6 },   // 3^6
        { from: 70, to: 71, expectedCost: 2187, tier: 7 },  // 3^7
        { from: 80, to: 81, expectedCost: 6561, tier: 8 },  // 3^8
        { from: 90, to: 91, expectedCost: 19683, tier: 9 },  // 3^9
      ];

      console.log('\n🎯 Tier Boundary Testing');
      console.log('═'.repeat(70));
      console.log('│ From→To │ Tier │ Expected │ Actual │ Status │');
      console.log('├─────────┼──────┼──────────┼────────┼────────┤');

      for (const testCase of testCases) {
        const actualCost = calculateShellStatUpgradeCost(testCase.from, testCase.to);
        const status = actualCost === testCase.expectedCost ? '✅' : '❌';

        const fromTo = `${testCase.from}→${testCase.to}`.padEnd(7);
        const tier = testCase.tier.toString().padStart(4);
        const expected = testCase.expectedCost.toString().padStart(8);
        const actual = actualCost.toString().padStart(6);

        console.log(`│ ${fromTo} │ ${tier} │ ${expected} │ ${actual} │   ${status}   │`);

        expect(actualCost).toBe(testCase.expectedCost);
      }

      console.log('└─────────┴──────┴──────────┴────────┴────────┘');

      // Test multi-tier upgrades to ensure cumulative costs work correctly
      console.log('\n🔄 Multi-Tier Upgrade Testing');
      console.log('═'.repeat(50));

      const multiTierTests = [
        // Cross single tier boundary
        { from: 18, to: 22, description: 'Cross tier 1→2 boundary' },
        { from: 28, to: 32, description: 'Cross tier 2→3 boundary' },
        { from: 38, to: 42, description: 'Cross tier 3→4 boundary' },

        // Cross multiple tier boundaries
        { from: 15, to: 25, description: 'Span tiers 1→2' },
        { from: 25, to: 35, description: 'Span tiers 2→3' },
        { from: 15, to: 35, description: 'Span tiers 1→2→3' },
      ];

      for (const test of multiTierTests) {
        const cost = calculateShellStatUpgradeCost(test.from, test.to);
        console.log(`${test.description}: ${test.from}→${test.to} = ${cost.toLocaleString()}`);

        // Verify the cost is reasonable (should be sum of individual tier costs)
        expect(cost).toBeGreaterThan(0);

        // For boundary crossing tests, verify cost increases appropriately
        if (test.from < 20 && test.to >= 20) {
          // Should include both tier 1 and tier 2 costs
          expect(cost).toBeGreaterThan(3); // More than just tier 1
        }
      }

      // Test that tier calculation formula is correct
      console.log('\n🧮 Tier Calculation Verification');
      const tierTests = [
        { level: 10, expectedTier: 1 }, { level: 19, expectedTier: 1 },
        { level: 20, expectedTier: 2 }, { level: 29, expectedTier: 2 },
        { level: 30, expectedTier: 3 }, { level: 39, expectedTier: 3 },
        { level: 40, expectedTier: 4 }, { level: 49, expectedTier: 4 },
        { level: 50, expectedTier: 5 }, { level: 59, expectedTier: 5 },
        { level: 99, expectedTier: 9 },
      ];

      for (const test of tierTests) {
        const actualTier = Math.floor(test.level / 10);
        const expectedCost = Math.pow(3, actualTier);
        const actualCost = calculateShellStatUpgradeCost(test.level, test.level + 1);

        console.log(`Level ${test.level}: tier=${actualTier}, cost=${actualCost}`);
        expect(actualTier).toBe(test.expectedTier);
        expect(actualCost).toBe(expectedCost);
      }

      // Test the ultimate upgrade: baseline to maximum
      console.log('\n🚀 Ultimate Upgrade Test: 10 → 100');
      console.log('═'.repeat(60));

      const ultimateCost = calculateShellStatUpgradeCost(10, 100);

      // Calculate expected cost manually for verification
      // Tier 1 (10-19): 10 levels × 3 = 30
      // Tier 2 (20-29): 10 levels × 9 = 90
      // Tier 3 (30-39): 10 levels × 27 = 270
      // Tier 4 (40-49): 10 levels × 81 = 810
      // Tier 5 (50-59): 10 levels × 243 = 2,430
      // Tier 6 (60-69): 10 levels × 729 = 7,290
      // Tier 7 (70-79): 10 levels × 2,187 = 21,870
      // Tier 8 (80-89): 10 levels × 6,561 = 65,610
      // Tier 9 (90-99): 10 levels × 19,683 = 196,830
      const expectedUltimateCost = 30 + 90 + 270 + 810 + 2430 + 7290 + 21870 + 65610 + 196830;

      console.log(`Actual cost: ${ultimateCost.toLocaleString()}`);
      console.log(`Expected cost: ${expectedUltimateCost.toLocaleString()}`);
      console.log(`Match: ${ultimateCost === expectedUltimateCost ? '✅' : '❌'}`);

      // Break down by tier for detailed verification
      console.log('\nTier-by-tier breakdown:');
      const tierBreakdown = [
        { tier: 1, range: '10-19', levels: 10, costPerLevel: 3, totalCost: 30 },
        { tier: 2, range: '20-29', levels: 10, costPerLevel: 9, totalCost: 90 },
        { tier: 3, range: '30-39', levels: 10, costPerLevel: 27, totalCost: 270 },
        { tier: 4, range: '40-49', levels: 10, costPerLevel: 81, totalCost: 810 },
        { tier: 5, range: '50-59', levels: 10, costPerLevel: 243, totalCost: 2430 },
        { tier: 6, range: '60-69', levels: 10, costPerLevel: 729, totalCost: 7290 },
        { tier: 7, range: '70-79', levels: 10, costPerLevel: 2187, totalCost: 21870 },
        { tier: 8, range: '80-89', levels: 10, costPerLevel: 6561, totalCost: 65610 },
        { tier: 9, range: '90-99', levels: 10, costPerLevel: 19683, totalCost: 196830 },
      ];

      let runningTotal = 0;
      for (const tier of tierBreakdown) {
        runningTotal += tier.totalCost;
        console.log(`Tier ${tier.tier} (${tier.range}): ${tier.levels} × ${tier.costPerLevel.toLocaleString()} = ${tier.totalCost.toLocaleString()} | Running total: ${runningTotal.toLocaleString()}`);
      }

      expect(ultimateCost).toBe(expectedUltimateCost);
      expect(ultimateCost).toBe(295230); // The value we saw in the visualization table

      console.log(`\n💰 Total cost to max out a single stat: ${ultimateCost.toLocaleString()}`);
      console.log(`🎯 This confirms our "100 effectively impossible" design goal!`);
    });
  });
});

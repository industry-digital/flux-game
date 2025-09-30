import { describe, it, expect } from 'vitest';
import { calculateMutationCost, createShellStatMutation } from './planning';
import { createShell, setShellStats } from '~/worldkit/entity/shell';
import { ActorStat, ShellStat } from '~/types/entity/actor';
import { BASELINE_STAT_VALUE, MAX_STAT_VALUE } from '~/worldkit/entity/actor';
import { StatMutationOperation } from '~/types/workbench';
import { calculateShellStatUpgradeCost } from '../cost';

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
      console.log(`🎯 Much more reasonable progression!`);
    });
  });
});

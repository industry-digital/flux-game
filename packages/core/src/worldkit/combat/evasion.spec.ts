import { describe, it, expect } from 'vitest';
import {
  calculateDefenderEvasionRating,
  calculateBaseEvasionProbability,
  calculateEvasionEfficiency,
  resolveHitAttempt,
  calculateExpectedEvasion, BASE_EVASION_EQUAL_RATINGS, GOLDEN_RATIO_PEAK,
  PEAK_EFFICIENCY
} from './evasion';
import { calculatePeakPowerOutput, calculateInertialMass } from '../physics/physics';
import { createStatTestCases } from './testing/movement';
/**
* Helper function to calculate evasion rating for given POW/FIN/Skill combination
*/
function calculateEvasionForBuild(
 power: number,
 finesse: number,
 evasionSkill: number,
 baseMass: number = 70
): number {
 const powerOutput = calculatePeakPowerOutput(power);
 const effectiveMass = calculateInertialMass(finesse, baseMass);
 return calculateDefenderEvasionRating(powerOutput, effectiveMass, baseMass, evasionSkill);
}
describe('Hit Resolution System', () => {
 describe('Evasion Rating Calculation', () => {
   it('should calculate defender evasion rating with proper 67/33 split', () => {
     // Test maximum stats (should approach 67 points from stats)
     const maxStatsRating = calculateEvasionForBuild(100, 100, 0);
     expect(maxStatsRating).toBeCloseTo(67.0, 1);
     // Test maximum skill (should add 33 points)
     const maxSkillBonus = calculateEvasionForBuild(10, 10, 100);
     const baselineRating = calculateEvasionForBuild(10, 10, 0);
     const skillContribution = maxSkillBonus - baselineRating;
     expect(skillContribution).toBeCloseTo(33, 0);
     // Test perfect build (should approach 100 points total)
     const perfectRating = calculateEvasionForBuild(100, 100, 100);
     expect(perfectRating).toBeCloseTo(100.0, 1); // Sigmoid reaches closer to theoretical maximum
   });
  describe('should show increasing evasion rating as stats improve', () => {
    const { statLevels } = createStatTestCases();
    let previousRating = 0;

    it.each(statLevels)('$name stats ($pow/$fin) should exceed previous rating', ({ name, pow, fin }) => {
      const rating = calculateEvasionForBuild(pow, fin, 0);
      console.log(`${name} (${pow}/${fin}): ${rating.toFixed(1)} points`);
      expect(rating).toBeGreaterThan(previousRating);
      previousRating = rating;
    });
  });
   describe('should show linear skill progression', () => {
     const baseRating = calculateEvasionForBuild(50, 50, 0);

     it.each([
       [0, 0], [25, 8.25], [50, 16.5], [75, 24.75], [100, 33]
     ])('skill level %s should provide %s bonus points', (skill, expectedBonus) => {
       const rating = calculateEvasionForBuild(50, 50, skill);
       const actualSkillBonus = rating - baseRating;
       expect(actualSkillBonus).toBeCloseTo(expectedBonus, 1);
     });
   });
 });
 describe('Base Evasion Probability', () => {
  it('should return 50% for equal ratings', () => {
    const evasionChance = calculateBaseEvasionProbability(0);
    expect(evasionChance).toBeCloseTo(BASE_EVASION_EQUAL_RATINGS, 3);
  });
  it.each([
    [0, 50.0], [10, 60.0], [25, 75.0], [50, 100.0]
  ])('should show linear growth: rating difference %s gives %s%% evasion', (diff, expected) => {
     const evasionChance = calculateBaseEvasionProbability(diff);
     expect(evasionChance * 100).toBeCloseTo(expected, 1);
   });
  it.each([
    [0, 50.0], [-10, 32.0], [-25, 12.5], [-50, 0.0]
  ])('should show quadratic decline: rating difference %s gives %s%% evasion', (diff, expected) => {
     const evasionChance = calculateBaseEvasionProbability(diff);
     expect(evasionChance * 100).toBeCloseTo(expected, 1);
   });
   it('should handle extreme rating differences gracefully', () => {
     // Very large positive difference should cap at 100%
     expect(calculateBaseEvasionProbability(100)).toBe(1.0);
     // Very large negative difference should approach 0%
     expect(calculateBaseEvasionProbability(-100)).toBeCloseTo(0, 3);
   });
   it('should demonstrate asymmetric curve behavior', () => {
     // Compare +25 vs -25 to show asymmetry
     const advantage25 = calculateBaseEvasionProbability(25);
     const disadvantage25 = calculateBaseEvasionProbability(-25);
     console.log(`+25 rating: ${(advantage25 * 100).toFixed(1)}%`);
     console.log(`-25 rating: ${(disadvantage25 * 100).toFixed(1)}%`);
    // Current curve: quadratic disadvantage loss is larger than linear advantage gain
    const advantageGain = advantage25 - BASE_EVASION_EQUAL_RATINGS;
    const disadvantageLoss = BASE_EVASION_EQUAL_RATINGS - disadvantage25;
    // Verify the asymmetric behavior (disadvantage loss > advantage gain with current curve)
    expect(disadvantageLoss).toBeGreaterThan(advantageGain);
   });
 });
 describe('Capacitor Efficiency', () => {
   it('should return correct efficiency at key points', () => {
     // Full capacitor should be 100% efficient
     expect(calculateEvasionEfficiency(1.0)).toBeCloseTo(1.0, 3);
     // Golden ratio peak should be 61.8% efficient
     expect(calculateEvasionEfficiency(GOLDEN_RATIO_PEAK)).toBeCloseTo(PEAK_EFFICIENCY, 3);
     // Empty capacitor should be 0% efficient
     expect(calculateEvasionEfficiency(0.0)).toBeCloseTo(0.0, 3);
   });
   it('should show linear progression from peak to full', () => {
     const positions = [GOLDEN_RATIO_PEAK, 0.5, 0.75, 1.0];
     let previousEfficiency = PEAK_EFFICIENCY;
     positions.forEach(position => {
       const efficiency = calculateEvasionEfficiency(position);
       if (position > GOLDEN_RATIO_PEAK) {
         expect(efficiency).toBeGreaterThanOrEqual(previousEfficiency);
       }
       previousEfficiency = efficiency;
     });
   });
   it('should show quadratic decline from peak to empty', () => {
     const positions = [0.0, 0.1, 0.2, 0.3, GOLDEN_RATIO_PEAK];
     positions.forEach(position => {
       const efficiency = calculateEvasionEfficiency(position);
       const expectedProgress = position / GOLDEN_RATIO_PEAK;
       const expectedEfficiency = PEAK_EFFICIENCY * Math.pow(expectedProgress, 2);
       expect(efficiency).toBeCloseTo(expectedEfficiency, 3);
     });
   });
   it('should handle out-of-range inputs gracefully', () => {
     // Should clamp to valid range
     expect(calculateEvasionEfficiency(-0.5)).toBeCloseTo(0.0, 3);
     expect(calculateEvasionEfficiency(1.5)).toBeCloseTo(1.0, 3);
   });
 });
 describe('Complete Hit Resolution', () => {
   it('should integrate all components correctly', () => {
     const defenderRating = 75; // Strong defender
     const attackerRating = 50;  // Moderate attacker
     const capacitorPosition = 0.8; // Good energy state
     const result = resolveHitAttempt(defenderRating, attackerRating, capacitorPosition);
     // Verify result structure
     expect(result).toHaveProperty('evaded');
     expect(result).toHaveProperty('evasionChance');
     expect(result).toHaveProperty('efficiency');
     expect(result).toHaveProperty('ratingDifference');
     expect(result).toHaveProperty('rngValue');
     // Verify calculations
     expect(result.ratingDifference).toBe(25);
     expect(result.efficiency).toBeGreaterThan(0.8); // Good capacitor position
     expect(result.evasionChance).toBeGreaterThan(0.5); // Should have advantage
     expect(result.rngValue).toBeGreaterThanOrEqual(0);
     expect(result.rngValue).toBeLessThan(1);
   });
   it('should produce consistent results for expected evasion calculation', () => {
     const defenderRating = 60;
     const attackerRating = 40;
     const capacitorPosition = 0.5;
     const efficiency = calculateEvasionEfficiency(capacitorPosition);
     const expected = calculateExpectedEvasion(defenderRating, attackerRating, efficiency);
     const resolution = resolveHitAttempt(defenderRating, attackerRating, capacitorPosition);
     // Expected calculation should match resolution calculation (minus the random roll)
     expect(expected.evasionChance).toBeCloseTo(resolution.evasionChance, 6);
     expect(expected.ratingDifference).toBe(resolution.ratingDifference);
   });
   it('should never exceed 99% evasion chance', () => {
     // Even with perfect ratings and full capacitor
     const result = resolveHitAttempt(100, 0, 1.0);
     expect(result.evasionChance).toBeLessThanOrEqual(0.99);
   });
   it('should allow dependency injection for RNG', () => {
     // Test with deterministic RNG
     const mockRandom = () => 0.5; // Always return 50%
     const result = resolveHitAttempt(75, 50, 0.8, { random: mockRandom });
     expect(result.rngValue).toBe(0.5);
     // With 75 vs 50 rating and good capacitor, should have >50% evasion chance
     expect(result.evaded).toBe(true); // 0.5 < evasionChance, so evaded
   });
   it('should be deterministic with injected RNG', () => {
     const mockRandom = () => 0.3;
     const result1 = resolveHitAttempt(60, 40, 0.6, { random: mockRandom });
     const result2 = resolveHitAttempt(60, 40, 0.6, { random: mockRandom });
     // Should produce identical results
     expect(result1.evaded).toBe(result2.evaded);
     expect(result1.rngValue).toBe(result2.rngValue);
     expect(result1.evasionChance).toBe(result2.evasionChance);
   });
 });
 describe('Combat Scenarios', () => {
   it('should handle veteran vs newbie scenario', () => {
     // Veteran: high stats + maxed skill
     const veteranRating = calculateEvasionForBuild(70, 80, 90);
     // Newbie: low stats + no skill
     const newbieAttackRating = 20;
     const result = resolveHitAttempt(veteranRating, newbieAttackRating, 0.8);
     console.log(`Veteran (${veteranRating.toFixed(1)}) vs Newbie (${newbieAttackRating}): ${(result.evasionChance * 100).toFixed(1)}% evasion`);
     // Should heavily favor veteran
     expect(result.evasionChance).toBeGreaterThan(0.85);
   });
   it('should handle slightly mismatched opponents with energy impact', () => {
     const rating1 = calculateEvasionForBuild(50, 60, 50);
     const rating2 = calculateEvasionForBuild(60, 50, 50);
     const result = resolveHitAttempt(rating1, rating2, 0.5);
     console.log(`Slightly mismatched (${rating1.toFixed(1)} vs ${rating2.toFixed(1)}): ${(result.evasionChance * 100).toFixed(1)}% evasion`);
     // Should be below baseline due to small disadvantage + energy efficiency
     expect(result.evasionChance).toBeGreaterThan(0.15);
     expect(result.evasionChance).toBeLessThan(0.35);
   });
  it('should return 50% base evasion for perfectly equal ratings', () => {
    const equalRating = 60;

    // Test with full energy (100% efficiency)
    const fullEnergyResult = resolveHitAttempt(equalRating, equalRating, 1.0);
    expect(fullEnergyResult.evasionChance).toBeCloseTo(0.50, 2);

    // Test with expected evasion utility (no energy modifier)
    const expectedResult = calculateExpectedEvasion(equalRating, equalRating);
    expect(expectedResult.evasionChance).toBeCloseTo(0.50, 2);
    expect(expectedResult.ratingDifference).toBe(0);
  });
   it('should show energy management impact', () => {
     const defenderRating = 70;
     const attackerRating = 60;
     const fullEnergy = resolveHitAttempt(defenderRating, attackerRating, 1.0);
     const lowEnergy = resolveHitAttempt(defenderRating, attackerRating, 0.1);
     console.log(`Full energy: ${(fullEnergy.evasionChance * 100).toFixed(1)}%`);
     console.log(`Low energy: ${(lowEnergy.evasionChance * 100).toFixed(1)}%`);
     // Energy should significantly impact evasion
     expect(fullEnergy.evasionChance).toBeGreaterThan(lowEnergy.evasionChance * 2);
    });
});
describe('Mass Penalty System', () => {
  it('should show enhanced mass penalties with sigmoid curve', () => {
    console.log('\n=== Mass Penalty Analysis ===');
    console.log('Same stats (50/50), different masses:');

    const masses = [50, 70, 90, 120, 150];
    const baseRating = calculateEvasionForBuild(50, 50, 50, 70); // Reference at 70kg

    masses.forEach(mass => {
      const rating = calculateEvasionForBuild(50, 50, 50, mass);
      const penalty = ((baseRating - rating) / baseRating * 100);
      console.log(`Mass ${mass}kg: ${rating.toFixed(1)} points (${penalty >= 0 ? '-' : '+'}${Math.abs(penalty).toFixed(1)}% vs 70kg)`);

      // Verify mass penalties are more severe for heavy actors
      if (mass > 70) {
        expect(rating).toBeLessThan(baseRating);
      } else if (mass < 70) {
        expect(rating).toBeGreaterThan(baseRating);
      }
    });
  });

  it('should maintain FIN effectiveness while penalizing mass', () => {
    // High FIN should still provide significant benefit even for heavy actors
    const heavyLowFin = calculateEvasionForBuild(50, 20, 0, 120);
    const heavyHighFin = calculateEvasionForBuild(50, 80, 0, 120);

    // FIN should still provide substantial improvement
    expect(heavyHighFin).toBeGreaterThan(heavyLowFin * 1.5);

    // But heavy actors should still be penalized compared to light actors
    const lightHighFin = calculateEvasionForBuild(50, 80, 0, 50);
    expect(lightHighFin).toBeGreaterThan(heavyHighFin);
  });
});
 describe('Build Comparison', () => {
   console.log('\n=== Build Comparison ===');
   console.log('Build        | Rating | vs Moderate (50) | vs Strong (75)');
   console.log('-------------|--------|------------------|---------------');

   it.each([
     ['Stat Heavy', 80, 70, 20],
     ['Skill Heavy', 40, 50, 90],
     ['Balanced', 60, 60, 60],
     ['Perfect', 80, 80, 100]
   ])('%s build should produce valid evasion ratings', (name, pow, fin, skill) => {
     const rating = calculateEvasionForBuild(pow, fin, skill);
     const efficiency = calculateEvasionEfficiency(0.6);
     const vsMod = calculateExpectedEvasion(rating, 50, efficiency);
     const vsStrong = calculateExpectedEvasion(rating, 75, efficiency);

     console.log(`${name.padEnd(12)} | ${rating.toFixed(1).padStart(6)} | ${(vsMod.evasionChance * 100).toFixed(1).padStart(15)}% | ${(vsStrong.evasionChance * 100).toFixed(1).padStart(13)}%`);

     // All builds should produce valid ratings
     expect(rating).toBeGreaterThan(0);
     expect(rating).toBeLessThanOrEqual(100);
   });
 });
});

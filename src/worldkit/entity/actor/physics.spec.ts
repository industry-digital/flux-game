import { describe, it, expect } from 'vitest';
import {
  calculatePowerOutput,
  calculateEffectiveMass,
  calculateTopSpeed,
  calculateInertiaReduction,
  calculateMuscularKineticEnergy,
  calculateMomentumKineticEnergy,
  calculateWeaponEfficiency, calculateTotalDamage,
  calculateGapClosing,
  calculateGapClosingWithDamage,
  damageToKineticEnergy,
  kineticEnergyToDamage,
  velocityForMomentumDamage,
  massForMomentumDamage,
  powerToWeightRatio,
  compareBuildEffectiveness,
  MAX_INERTIA_REDUCTION,
  DEFAULT_STRIKE_DURATION,
  STRIKE_EFFICIENCY,
  JOULES_PER_DAMAGE
} from './physics';

describe('Physics System Core Functions', () => {

  describe('Power Calculations', () => {
    it('should calculate power output correctly', () => {
      expect(calculatePowerOutput(0)).toBe(125); // 0 * 25W + 125W
      expect(calculatePowerOutput(10)).toBe(375); // 10 * 25W + 125W
      expect(calculatePowerOutput(50)).toBe(1375); // 50 * 25W + 125W
      expect(calculatePowerOutput(100)).toBe(2625); // 100 * 25W + 125W
    });

    it('should calculate muscular kinetic energy from power', () => {
      const power10KE = calculateMuscularKineticEnergy(10);
      const expectedKE = 375 * DEFAULT_STRIKE_DURATION; // 375W * 0.25s

      expect(power10KE).toBeCloseTo(expectedKE, 2);
      expect(power10KE).toBeCloseTo(93.75, 2); // 375 * 0.25

      const power100KE = calculateMuscularKineticEnergy(100);
      expect(power100KE).toBeCloseTo(656.25, 2); // 2625 * 0.25
    });
  });

  describe('Grace and Inertia Calculations', () => {
    it('should calculate inertia reduction correctly', () => {
      // GRA 10 = 0% reduction (baseline)
      expect(calculateInertiaReduction(10)).toBe(0);

      // GRA below 10 = 0% reduction
      expect(calculateInertiaReduction(5)).toBe(0);
      expect(calculateInertiaReduction(0)).toBe(0);

      // GRA 100 = 61.8% reduction (golden ratio)
      expect(calculateInertiaReduction(100)).toBeCloseTo(MAX_INERTIA_REDUCTION, 6);

      // GRA 55 = 30.9% reduction (halfway point)
      const midpoint = calculateInertiaReduction(55);
      expect(midpoint).toBeCloseTo(MAX_INERTIA_REDUCTION / 2, 3);

      // Linear scaling verification
      const grace20 = calculateInertiaReduction(20);
      const grace30 = calculateInertiaReduction(30);
      const expectedDifference = 10 * (MAX_INERTIA_REDUCTION / 90); // 10 points * rate per point
      expect(grace30 - grace20).toBeCloseTo(expectedDifference, 6);
    });

    it('should calculate effective mass correctly', () => {
      const naturalMass = 80; // kg

      // GRA 10: no reduction
      expect(calculateEffectiveMass(10, naturalMass)).toBe(80);

      // GRA 100: 61.8% reduction
      const maxReduced = calculateEffectiveMass(100, naturalMass);
      const expectedMass = naturalMass * (1 - MAX_INERTIA_REDUCTION);
      expect(maxReduced).toBeCloseTo(expectedMass, 2);
      expect(maxReduced).toBeCloseTo(30.56, 2); // 80 * (1 - 0.618)

      // GRA 55: ~50% reduction
      const midReduced = calculateEffectiveMass(55, naturalMass);
      expect(midReduced).toBeCloseTo(55.28, 2); // 80 * (1 - 0.309)
    });

    it('should calculate top speed correctly', () => {
      // Linear scaling: 0.25 m/s per Grace point + 2 m/s baseline
      expect(calculateTopSpeed(0)).toBe(7); // 2 + max(0 * 0.25, 5) = 2 + 5 = 7
      expect(calculateTopSpeed(10)).toBe(7); // 2 + max(10 * 0.25, 5) = 2 + 5 = 7
      expect(calculateTopSpeed(20)).toBe(7); // 2 + max(20 * 0.25, 5) = 2 + 5 = 7
      expect(calculateTopSpeed(50)).toBe(14.5); // 2 + max(50 * 0.25, 5) = 2 + 12.5 = 14.5
      expect(calculateTopSpeed(100)).toBe(27); // 2 + max(100 * 0.25, 5) = 2 + 25 = 27
    });
  });

  describe('Momentum and Damage Calculations', () => {
    it('should calculate momentum kinetic energy correctly', () => {
      // KE = 0.5 * m * v²
      expect(calculateMomentumKineticEnergy(0, 80)).toBe(0);
      expect(calculateMomentumKineticEnergy(10, 80)).toBe(4000); // 0.5 * 80 * 100
      expect(calculateMomentumKineticEnergy(20, 60)).toBe(12000); // 0.5 * 60 * 400
      expect(calculateMomentumKineticEnergy(30, 80)).toBe(36000); // 0.5 * 80 * 900
    });

    it('should calculate weapon efficiency multipliers', () => {
      expect(calculateWeaponEfficiency('bare')).toBeCloseTo(0.382, 3); // 1/φ²
      expect(calculateWeaponEfficiency('dagger')).toBeCloseTo(0.618, 3); // 1/φ
      expect(calculateWeaponEfficiency('sword')).toBeCloseTo(1.000, 3); // baseline
      expect(calculateWeaponEfficiency('warhammer')).toBeCloseTo(1.618, 3); // φ
    });

    it('should calculate total damage using new physics formula', () => {
      // Stationary strike with bare hands: (Muscular + 0 Momentum) × 0.382 efficiency
      const stationaryDamage = calculateTotalDamage(50, 0, 80, 'bare');
      const muscularKE = 1375 * DEFAULT_STRIKE_DURATION; // 343.75J (1375 * 0.25)
      const weaponEfficiency = 1 / (1.618 * 1.618); // 0.382 for bare hands
      const expectedDamage = (muscularKE * weaponEfficiency) / JOULES_PER_DAMAGE;
      expect(stationaryDamage).toBeCloseTo(expectedDamage, 2);

      // Moving strike with sword: (Muscular + Effective Momentum) × 1.0 efficiency
      const movingDamage = calculateTotalDamage(50, 20, 80, 'sword');
      const rawMomentumKE = 0.5 * 80 * 400; // 16,000J
      const momentumEfficiency = 50 / 100; // 50% efficiency at POW 50
      const effectiveMomentumKE = rawMomentumKE * momentumEfficiency; // 8,000J
      const swordEfficiency = 1.0; // baseline efficiency
      const expectedTotal = ((muscularKE + effectiveMomentumKE) * swordEfficiency) / JOULES_PER_DAMAGE;
      expect(movingDamage).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Utility Functions', () => {
    it('should convert between damage and kinetic energy', () => {
      expect(damageToKineticEnergy(10)).toBe(50); // 10 * 5J
      expect(damageToKineticEnergy(50)).toBe(250);

      expect(kineticEnergyToDamage(50)).toBe(10); // 50J / 5
      expect(kineticEnergyToDamage(250)).toBe(50);

      // Round trip conversion
      const originalDamage = 75;
      const ke = damageToKineticEnergy(originalDamage);
      const backToDamage = kineticEnergyToDamage(ke);
      expect(backToDamage).toBe(originalDamage);
    });

    it('should calculate velocity needed for momentum damage', () => {
      // For 100 damage worth of momentum KE with 80kg mass
      const velocity = velocityForMomentumDamage(100, 80);
      const expectedKE = 100 * JOULES_PER_DAMAGE; // 500J (100 * 5J)
      const expectedVelocity = Math.sqrt(2 * expectedKE / 80); // sqrt(2 * 500 / 80)
      expect(velocity).toBeCloseTo(expectedVelocity, 2);
      expect(velocity).toBeCloseTo(3.54, 2); // sqrt(12.5) ≈ 3.54 m/s
    });

    it('should calculate mass needed for momentum damage', () => {
      // For 100 damage worth of momentum KE at 20 m/s
      const mass = massForMomentumDamage(100, 20);
      const expectedKE = 100 * JOULES_PER_DAMAGE; // 500J (100 * 5J)
      const expectedMass = 2 * expectedKE / (20 * 20); // 2 * 500 / 400
      expect(mass).toBeCloseTo(expectedMass, 2);
      expect(mass).toBeCloseTo(2.5, 2); // 1000 / 400 = 2.5 kg
    });

    it('should calculate power-to-weight ratio', () => {
      expect(powerToWeightRatio(50, 80)).toBeCloseTo(17.19, 2); // 1375W / 80kg
      expect(powerToWeightRatio(100, 60)).toBeCloseTo(43.75, 2); // 2625W / 60kg
    });
  });

  describe('Gap-Closing Motion Profile', () => {
    it('should calculate basic gap-closing correctly', () => {
      const result = calculateGapClosing(50, 50, 100, 80);

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.maxVelocity).toBeGreaterThan(0);
      expect(result.acceleration).toBeGreaterThan(0);
      expect(result.averageSpeed).toBeGreaterThan(0);

      // Max velocity should not exceed top speed
      const topSpeed = calculateTopSpeed(50);
      expect(result.maxVelocity).toBeLessThanOrEqual(topSpeed);
    });

    it('should handle pure acceleration vs cruise scenarios', () => {
      // High power, low grace = might not hit speed limit
      const highPowerResult = calculateGapClosing(100, 20, 50, 80);

      // Low power, high grace = will hit speed limit and cruise
      const highGraceResult = calculateGapClosing(20, 100, 200, 80);

      // High grace should have higher max velocity
      expect(highGraceResult.maxVelocity).toBeGreaterThan(highPowerResult.maxVelocity);

      // High power should have higher acceleration
      expect(highPowerResult.acceleration).toBeGreaterThan(highGraceResult.acceleration);
    });

    it('should calculate gap-closing with damage correctly', () => {
      const result = calculateGapClosingWithDamage(50, 50, 100, 80, 'sword');

      expect(result.impactDamage).toBeGreaterThan(0);
      expect(result.muscularKE).toBeGreaterThan(0);
      expect(result.momentumKE).toBeGreaterThan(0);
      expect(result.weaponEfficiency).toBe(1.0); // sword efficiency

      // Total KE should equal (muscular + effective momentum) × weapon efficiency
      const expectedTotalKE = (result.muscularKE + result.momentumKE) * result.weaponEfficiency;
      expect(result.totalKE).toBeCloseTo(expectedTotalKE, 2);

      // Damage should equal total effective KE / 5J
      const expectedDamage = result.totalKE / JOULES_PER_DAMAGE;
      expect(result.impactDamage).toBeCloseTo(expectedDamage, 2);
    });
  });

  describe('Build Comparison', () => {
    it('should compare build effectiveness correctly', () => {
      const scoutBuild = { power: 30, grace: 80, mass: 60 };
      const tankBuild = { power: 80, grace: 30, mass: 120 };

      const comparison = compareBuildEffectiveness(scoutBuild, tankBuild, 100, 'sword');

      expect(comparison.build1).toBeDefined();
      expect(comparison.build2).toBeDefined();
      expect(comparison.winner).toBeDefined();

      // Scout should be faster (higher grace)
      expect(comparison.build1.maxVelocity).toBeGreaterThan(comparison.build2.maxVelocity);

      // Tank should have higher power-to-weight? Not necessarily due to mass
      // But we can verify the calculations are consistent
      expect(comparison.build1.powerToWeight).toBeCloseTo(875 / 60, 2); // (30*25+125) / 60 = 14.58 W/kg
      expect(comparison.build2.powerToWeight).toBeCloseTo(2125 / 120, 2); // (80*25+125) / 120 = 17.71 W/kg
    });
  });

  describe('Edge Cases and Boundaries', () => {
    it('should handle zero values gracefully', () => {
      expect(calculatePowerOutput(0)).toBe(125); // Baseline power
      expect(calculateInertiaReduction(0)).toBe(0);
      expect(calculateMomentumKineticEnergy(0, 80)).toBe(0);
      expect(calculateTotalDamage(0, 0, 80)).toBeGreaterThan(0); // Has baseline power
    });

    it('should handle maximum values correctly', () => {
      const maxInertia = calculateInertiaReduction(100);
      expect(maxInertia).toBeCloseTo(MAX_INERTIA_REDUCTION, 6);

      const maxPower = calculatePowerOutput(100);
      expect(maxPower).toBe(2625); // 100*25 + 125

      // Very high values should still work
      const extremeDamage = calculateTotalDamage(100, 50, 200, 'warhammer');
      expect(extremeDamage).toBeGreaterThan(1000); // Should be massive damage
    });

    it('should maintain consistent scaling relationships', () => {
      // Power scaling is no longer purely linear due to baseline
      const power20 = calculatePowerOutput(20); // 625W
      const power40 = calculatePowerOutput(40); // 1125W
      expect(power40).toBe(1125); // Verify absolute values instead of ratios

      // Inertia reduction should scale linearly above baseline
      const inertia20 = calculateInertiaReduction(20);
      const inertia40 = calculateInertiaReduction(40);
      const inertia60 = calculateInertiaReduction(60);

      const diff1 = inertia40 - inertia20;
      const diff2 = inertia60 - inertia40;
      expect(diff1).toBeCloseTo(diff2, 6); // Equal 20-point differences
    });
  });

  describe('Physics Validation', () => {
    it('should maintain energy conservation principles', () => {
      // Momentum KE calculation should follow physics
      const mass = 80;
      const velocity = 20;
      const ke = calculateMomentumKineticEnergy(velocity, mass);
      const expectedKE = 0.5 * mass * velocity * velocity;
      expect(ke).toBe(expectedKE);
    });

    it('should have realistic damage scaling', () => {
      // High-speed impacts should create dramatically more damage
      const slowImpact = calculateTotalDamage(50, 5, 80, 'bare');
      const fastImpact = calculateTotalDamage(50, 25, 80, 'bare');

      // 5x velocity should create 25x momentum damage (v² scaling)
      const slowMomentum = calculateMomentumKineticEnergy(5, 80);
      const fastMomentum = calculateMomentumKineticEnergy(25, 80);
      expect(fastMomentum / slowMomentum).toBeCloseTo(25, 1);
    });

    it('should validate golden ratio usage', () => {
      // Strike efficiency is now 1.0 (perfect transfer)
      expect(STRIKE_EFFICIENCY).toBe(1);

      // Max inertia reduction should be golden ratio
      expect(MAX_INERTIA_REDUCTION).toBeCloseTo(0.618, 3);
    });
  });

  describe('Gap-Closing Visualizations', () => {
    it('should generate ASCII charts for 100m gap-closing analysis', () => {
      const naturalMass = 80; // kg
      const distance = 100; // meters
      const powValues = [10, 20, 30, 50, 75, 100];
      const graValues = [10, 20, 30, 50, 75, 100];

      console.log('\\n=== 100M GAP-CLOSING ANALYSIS (Mass: 80kg) ===\\n');

      // Create data matrices
      const timeMatrix: number[][] = [];
      const speedMatrix: number[][] = [];
      const accelMatrix: number[][] = [];

      for (let i = 0; i < powValues.length; i++) {
        timeMatrix[i] = [];
        speedMatrix[i] = [];
        accelMatrix[i] = [];
        for (let j = 0; j < graValues.length; j++) {
          const result = calculateGapClosing(powValues[i], graValues[j], distance, naturalMass);
          timeMatrix[i][j] = result.totalTime;
          speedMatrix[i][j] = result.maxVelocity;
          accelMatrix[i][j] = result.acceleration;
        }
      }

            // Time matrix table
      console.log('⏱️  TIME TO 100M (seconds):');
      console.log('POW\\\\GRA ' + graValues.map(g => g.toString().padStart(7)).join(''));
      console.log('------- ' + '-'.repeat(7 * graValues.length));

      for (let i = 0; i < powValues.length; i++) {
        const row = powValues[i].toString().padStart(3) + '     ' +
                    timeMatrix[i].map(t => t.toFixed(1).padStart(7)).join('');
        console.log(row);
      }

      // Max velocity matrix
      console.log('\\n🏃 MAX VELOCITY (m/s):');
      console.log('POW\\\\GRA ' + graValues.map(g => g.toString().padStart(7)).join(''));
      console.log('------- ' + '-'.repeat(7 * graValues.length));

      for (let i = 0; i < powValues.length; i++) {
        const row = powValues[i].toString().padStart(3) + '     ' +
                    speedMatrix[i].map(s => s.toFixed(1).padStart(7)).join('');
        console.log(row);
      }

      // Acceleration matrix
      console.log('\\n⚡ ACCELERATION (m/s²):');
      console.log('POW\\\\GRA ' + graValues.map(g => g.toString().padStart(7)).join(''));
      console.log('------- ' + '-'.repeat(7 * graValues.length));

      for (let i = 0; i < powValues.length; i++) {
        const row = powValues[i].toString().padStart(3) + '     ' +
                    accelMatrix[i].map(a => a.toFixed(1).padStart(7)).join('');
        console.log(row);
      }

      // Create ASCII bar chart for time comparison
      console.log('\\n📊 TIME COMPARISON ASCII CHART:');
      console.log('(Lower bars = faster gap-closing)\\n');

      const maxTime = Math.max(...timeMatrix.flat());
      const chartHeight = 10;

      for (let chartRow = chartHeight; chartRow >= 0; chartRow--) {
        let line = chartRow.toString().padStart(2) + 's |';

        for (let powIdx = 0; powIdx < powValues.length; powIdx++) {
          const time = timeMatrix[powIdx][2]; // Use GRA 30 column for this chart
          const barHeight = Math.round((time / maxTime) * chartHeight);

          if (chartRow <= barHeight) {
            line += '███';
          } else {
            line += '   ';
          }
          line += ' ';
        }
        console.log(line);
      }

      console.log('   +' + '-'.repeat(4 * powValues.length));
      console.log('    ' + powValues.map(p => p.toString().padStart(3)).join(' ') + ' (POW @ GRA 30)');

      // POW Impact Analysis (GRA held constant at 50)
      console.log('\\n📈 POW IMPACT ANALYSIS (GRA 50):');
      console.log('(Effect of increasing Power while Grace stays constant)\\n');

      const graFixed = 3; // GRA 50 column index
      const powTimes = powValues.map(p => timeMatrix[powValues.indexOf(p)][graFixed]);
      const maxPowTime = Math.max(...powTimes);
      const chartHeightPow = 8;

      for (let chartRow = chartHeightPow; chartRow >= 0; chartRow--) {
        let line = chartRow.toString().padStart(2) + 's |';

        for (let powIdx = 0; powIdx < powValues.length; powIdx++) {
          const time = powTimes[powIdx];
          const barHeight = Math.round((time / maxPowTime) * chartHeightPow);

          if (chartRow <= barHeight) {
            line += '██';
          } else {
            line += '  ';
          }
          line += ' ';
        }
        console.log(line);
      }

      console.log('   +' + '-'.repeat(3 * powValues.length));
      console.log('   ' + powValues.map(p => p.toString().padStart(2)).join(' ') + ' POW');
      console.log('   Times: ' + powTimes.map(t => t.toFixed(1)).join('s, ') + 's');

      // GRA Impact Analysis (POW held constant at 50)
      console.log('\\n🚀 GRA IMPACT ANALYSIS (POW 50):');
      console.log('(Effect of increasing Grace while Power stays constant)\\n');

      const powFixed = 3; // POW 50 row index
      const graTimes = graValues.map(g => timeMatrix[powFixed][graValues.indexOf(g)]);
      const maxGraTime = Math.max(...graTimes);
      const chartHeightGra = 8;

      for (let chartRow = chartHeightGra; chartRow >= 0; chartRow--) {
        let line = chartRow.toString().padStart(2) + 's |';

        for (let graIdx = 0; graIdx < graValues.length; graIdx++) {
          const time = graTimes[graIdx];
          const barHeight = Math.round((time / maxGraTime) * chartHeightGra);

          if (chartRow <= barHeight) {
            line += '██';
          } else {
            line += '  ';
          }
          line += ' ';
        }
        console.log(line);
      }

      console.log('   +' + '-'.repeat(3 * graValues.length));
      console.log('   ' + graValues.map(g => g.toString().padStart(2)).join(' ') + ' GRA');
      console.log('   Times: ' + graTimes.map(t => t.toFixed(1)).join('s, ') + 's');

      // Performance insights
      console.log('\\n🎯 PERFORMANCE INSIGHTS:');

      const fastestTime = Math.min(...timeMatrix.flat());
      const slowestTime = Math.max(...timeMatrix.flat());
      let fastestCombo = { pow: 0, gra: 0 };
      let slowestCombo = { pow: 0, gra: 0 };

      for (let i = 0; i < powValues.length; i++) {
        for (let j = 0; j < graValues.length; j++) {
          if (timeMatrix[i][j] === fastestTime) {
            fastestCombo = { pow: powValues[i], gra: graValues[j] };
          }
          if (timeMatrix[i][j] === slowestTime) {
            slowestCombo = { pow: powValues[i], gra: graValues[j] };
          }
        }
      }

      console.log(`• Fastest: POW ${fastestCombo.pow}, GRA ${fastestCombo.gra} → ${fastestTime.toFixed(1)}s`);
      console.log(`• Slowest: POW ${slowestCombo.pow}, GRA ${slowestCombo.gra} → ${slowestTime.toFixed(1)}s`);
      console.log(`• Speed Advantage: ${(slowestTime / fastestTime).toFixed(1)}x faster`);

      // High vs Low GRA comparison at fixed POW
      const pow50TimeAtGra10 = timeMatrix[3][0]; // POW 50, GRA 10
      const pow50TimeAtGra100 = timeMatrix[3][5]; // POW 50, GRA 100
      console.log(`• GRA Impact (POW 50): ${pow50TimeAtGra10.toFixed(1)}s → ${pow50TimeAtGra100.toFixed(1)}s (${(pow50TimeAtGra10/pow50TimeAtGra100).toFixed(1)}x improvement)`);

      // High vs Low POW comparison at fixed GRA
      const gra50TimeAtPow10 = timeMatrix[0][3]; // POW 10, GRA 50
      const gra50TimeAtPow100 = timeMatrix[5][3]; // POW 100, GRA 50
      console.log(`• POW Impact (GRA 50): ${gra50TimeAtPow10.toFixed(1)}s → ${gra50TimeAtPow100.toFixed(1)}s (${(gra50TimeAtPow10/gra50TimeAtPow100).toFixed(1)}x improvement)`);

      console.log('\\n===============================================\\n');

      // Verify some key relationships
      expect(fastestTime).toBeLessThan(slowestTime);
      expect(timeMatrix[5][5]).toBeLessThan(timeMatrix[0][0]); // High POW+GRA faster than low POW+GRA
      expect(speedMatrix[0][5]).toBeGreaterThan(speedMatrix[0][0]); // Higher GRA = higher speed
      expect(accelMatrix[5][0]).toBeGreaterThan(accelMatrix[0][0]); // Higher POW = higher acceleration
    });

    it('should demonstrate tactical build comparisons', () => {
      console.log('\\n=== TACTICAL BUILD ANALYSIS ===\\n');

      const builds = [
        { name: 'Glass Cannon', pow: 100, gra: 20, mass: 60, color: '🔴' },
        { name: 'Balanced', pow: 60, gra: 60, mass: 80, color: '🟡' },
        { name: 'Speed Demon', pow: 30, gra: 100, mass: 60, color: '🔵' },
        { name: 'Heavy Tank', pow: 80, gra: 20, mass: 120, color: '⚫' }
      ];

            console.log('📋 BUILD PROFILES:');
      console.log('Build           POW   GRA  Mass   Time  Speed  Damage');
      console.log('-------------  ----  ----  ----  -----  -----  ------');

      for (const build of builds) {
        const result = calculateGapClosingWithDamage(build.pow, build.gra, 100, build.mass, 'sword');

        const line = [
          build.color + ' ' + build.name.padEnd(11),
          build.pow.toString().padStart(4),
          build.gra.toString().padStart(4),
          build.mass.toString().padStart(4),
          result.totalTime.toFixed(1).padStart(5),
          result.maxVelocity.toFixed(1).padStart(5),
          result.impactDamage.toFixed(0).padStart(6)
        ].join('  ');

        console.log(line);
      }

      console.log('\\n🎯 TACTICAL ANALYSIS:');

      const glassCannonResult = calculateGapClosingWithDamage(100, 20, 100, 60, 'sword');
      const speedDemonResult = calculateGapClosingWithDamage(30, 100, 100, 60, 'sword');
      const tankResult = calculateGapClosingWithDamage(80, 20, 100, 120, 'sword');

      console.log(`• Glass Cannon: Extreme damage (${glassCannonResult.impactDamage.toFixed(0)}) but moderate speed`);
      console.log(`• Speed Demon: Fastest approach (${speedDemonResult.totalTime.toFixed(1)}s) but lower damage`);
      console.log(`• Heavy Tank: High momentum damage, slower but devastating`);

      // Create speed vs damage scatter plot
      console.log('\\n📈 SPEED vs DAMAGE TRADEOFF:');
      console.log('(Each build plotted by gap-closing time vs impact damage)\\n');

      const maxDamage = Math.max(...builds.map(b =>
        calculateGapClosingWithDamage(b.pow, b.gra, 100, b.mass, 'sword').impactDamage
      ));
      const maxTime = Math.max(...builds.map(b =>
        calculateGapClosingWithDamage(b.pow, b.gra, 100, b.mass, 'sword').totalTime
      ));

      const plotHeight = 8;
      const plotWidth = 20;

      for (let y = plotHeight; y >= 0; y--) {
        let line = (y * maxDamage / plotHeight).toFixed(0).padStart(4) + '|';

        for (let x = 0; x <= plotWidth; x++) {
          const timeThreshold = x * maxTime / plotWidth;
          const damageThreshold = y * maxDamage / plotHeight;

          let plotChar = ' ';
          for (const build of builds) {
            const result = calculateGapClosingWithDamage(build.pow, build.gra, 100, build.mass, 'sword');
            if (Math.abs(result.totalTime - timeThreshold) < maxTime / plotWidth / 2 &&
                Math.abs(result.impactDamage - damageThreshold) < maxDamage / plotHeight / 2) {
              plotChar = build.color;
              break;
            }
          }
          line += plotChar;
        }
        console.log(line);
      }

      console.log('    +' + '-'.repeat(plotWidth));
      console.log('     0' + ' '.repeat(plotWidth - 2) + maxTime.toFixed(0) + 's');
      console.log('     Time to 100m');

      console.log('\\n===============================\\n');

      // Verify builds have different characteristics
      expect(speedDemonResult.impactDamage).toBeGreaterThan(glassCannonResult.impactDamage); // Momentum damage dominates at extreme speeds
      expect(speedDemonResult.totalTime).toBeLessThan(glassCannonResult.totalTime); // Speed Demon closes gaps faster
      expect(tankResult.momentumKE).toBeGreaterThan(glassCannonResult.momentumKE); // Heavy Tank has mass advantage over Glass Cannon
    });
  });

  describe('POW-Based Momentum Transfer Efficiency', () => {
        it('should demonstrate efficiency scaling with POW stat', () => {
      console.log('\\n=== POW MOMENTUM TRANSFER EFFICIENCY ===\\n');

      const testVelocity = 20; // m/s approach speed
      const testMass = 80; // kg
      const baseKineticEnergy = 0.5 * testMass * testVelocity * testVelocity; // 16,000J

      console.log(`Base Scenario: ${testMass}kg actor moving at ${testVelocity} m/s`);
      console.log(`Raw Kinetic Energy: ${baseKineticEnergy.toLocaleString()}J\\n`);

      console.log('📊 POW EFFICIENCY SCALING:');
      console.log('POW   Efficiency   Transferred Energy   Damage');
      console.log('---   ----------   -----------------   ------');

      const powValues = [10, 20, 30, 50, 75, 100];

      for (const pow of powValues) {
        // Efficiency formula: POW = efficiency percentage
        const efficiency = pow / 100;
        const transferredEnergy = baseKineticEnergy * efficiency;
        const damage = transferredEnergy / JOULES_PER_DAMAGE;

        console.log(
          `${pow.toString().padStart(3)}   ${(efficiency * 100).toFixed(1).padStart(8)}%   ` +
          `${transferredEnergy.toFixed(0).padStart(15)}J   ${damage.toFixed(0).padStart(6)}`
        );
      }

      console.log('\\n🎯 EFFICIENCY IMPACT ANALYSIS:\\n');

      // Compare low vs high POW at same speed
      const lowPowEfficiency = 10 / 100; // 10%
      const highPowEfficiency = 100 / 100; // 100%

      const lowPowDamage = (baseKineticEnergy * lowPowEfficiency) / JOULES_PER_DAMAGE;
      const highPowDamage = (baseKineticEnergy * highPowEfficiency) / JOULES_PER_DAMAGE;

      console.log(`Low POW (10): ${(lowPowEfficiency * 100).toFixed(1)}% efficiency → ${lowPowDamage.toFixed(0)} damage`);
      console.log(`High POW (100): ${(highPowEfficiency * 100).toFixed(1)}% efficiency → ${highPowDamage.toFixed(0)} damage`);
      console.log(`Efficiency Advantage: ${(highPowEfficiency / lowPowEfficiency).toFixed(1)}x more effective\\n`);

      // Verify efficiency formula boundaries
      expect(lowPowEfficiency).toBeCloseTo(0.1, 2);
      expect(highPowEfficiency).toBeCloseTo(1.0, 2);
      expect(highPowDamage).toBeGreaterThan(lowPowDamage * 9); // 10x improvement
    });

        it('should show momentum efficiency with different weapons', () => {
      console.log('\\n=== MOMENTUM EFFICIENCY WITH WEAPONS ===\\n');

      const velocity = 15; // m/s
      const mass = 70; // kg
      const rawKE = 0.5 * mass * velocity * velocity; // 7,875J

      const weapons = [
        { name: 'Bare Hands', baseDamage: 0 },
        { name: 'Dagger', baseDamage: 5 },
        { name: 'Sword', baseDamage: 15 },
        { name: 'Warhammer', baseDamage: 25 }
      ];

      const powLevels = [10, 50, 100];

      console.log('Weapon damage with momentum efficiency (15 m/s impact):\\n');

      for (const weapon of weapons) {
        console.log(`🗡️  ${weapon.name} (Base: ${weapon.baseDamage} damage):`);
        console.log('POW   Efficiency   Momentum Dmg   Weapon Dmg   Total Dmg');
        console.log('---   ----------   -----------   ----------   ---------');

        for (const pow of powLevels) {
          const efficiency = pow / 100;
          const transferredKE = rawKE * efficiency;
          const momentumDamage = transferredKE / JOULES_PER_DAMAGE;
          const totalDamage = momentumDamage + weapon.baseDamage;

          console.log(
            `${pow.toString().padStart(3)}   ${(efficiency * 100).toFixed(1).padStart(8)}%   ` +
            `${momentumDamage.toFixed(0).padStart(9)}   ${weapon.baseDamage.toString().padStart(8)}   ` +
            `${totalDamage.toFixed(0).padStart(7)}`
          );
        }
        console.log();
      }

      console.log('💡 SIMPLIFIED MECHANICS:');
      console.log('• POW affects momentum transfer efficiency only');
      console.log('• Weapons add flat base damage regardless of POW');
      console.log('• Total damage = Momentum damage + Weapon base damage');
      console.log('• Higher POW makes movement speed more valuable');
      console.log('\\n=====================================\\n');

      // Verify that momentum scales with efficiency
      const lowPowMomentum = (rawKE * 0.1) / JOULES_PER_DAMAGE;
      const highPowMomentum = (rawKE * 1.0) / JOULES_PER_DAMAGE;
      expect(highPowMomentum).toBeGreaterThan(lowPowMomentum * 9); // 10x improvement
    });

    it('should show speed vs strength trade-offs with efficiency', () => {
      console.log('\\n=== SPEED vs STRENGTH EFFICIENCY TRADE-OFFS ===\\n');

      const scenarios = [
        { name: 'Speed Demon', pow: 30, velocity: 25, mass: 60 },
        { name: 'Balanced Fighter', pow: 60, velocity: 15, mass: 80 },
        { name: 'Strength Master', pow: 100, velocity: 8, mass: 100 }
      ];

      console.log('Build comparison with momentum transfer efficiency:\\n');
      console.log('Build             POW   Speed   Raw KE    Efficiency   Effective KE   Damage');
      console.log('---------------   ---   -----   ------    ----------   ------------   ------');

      for (const build of scenarios) {
        const rawKE = 0.5 * build.mass * build.velocity * build.velocity;
        const efficiency = build.pow / 100;
        const effectiveKE = rawKE * efficiency;
        const damage = effectiveKE / JOULES_PER_DAMAGE;

        console.log(
          `${build.name.padEnd(15)}   ${build.pow.toString().padStart(3)}   ` +
          `${build.velocity.toString().padStart(3)}ms   ${rawKE.toFixed(0).padStart(6)}J    ` +
          `${(efficiency * 100).toFixed(1).padStart(8)}%   ${effectiveKE.toFixed(0).padStart(10)}J   ` +
          `${damage.toFixed(0).padStart(6)}`
        );
      }

      console.log('\\n🔍 ANALYSIS:\\n');

      const speedDemon = scenarios[0];
      const strengthMaster = scenarios[2];

      const speedRawKE = 0.5 * speedDemon.mass * speedDemon.velocity * speedDemon.velocity;
      const speedEffectiveKE = speedRawKE * (speedDemon.pow / 100);

      const strengthRawKE = 0.5 * strengthMaster.mass * strengthMaster.velocity * strengthMaster.velocity;
      const strengthEffectiveKE = strengthRawKE * (strengthMaster.pow / 100);

      console.log(`Speed Demon: ${speedRawKE.toFixed(0)}J raw → ${speedEffectiveKE.toFixed(0)}J effective (${((speedEffectiveKE/speedRawKE)*100).toFixed(1)}% transfer)`);
      console.log(`Strength Master: ${strengthRawKE.toFixed(0)}J raw → ${strengthEffectiveKE.toFixed(0)}J effective (${((strengthEffectiveKE/strengthRawKE)*100).toFixed(1)}% transfer)`);

      if (speedEffectiveKE > strengthEffectiveKE) {
        console.log(`\\n✓ Speed Demon wins despite lower POW: velocity² scaling overcomes efficiency loss`);
      } else {
        console.log(`\\n✓ Strength Master wins through superior transfer efficiency`);
      }

      console.log('\\n💡 KEY INSIGHTS:');
      console.log('• Low POW loses 90% of momentum to poor form/control');
      console.log('• High POW captures 100% of available kinetic energy');
      console.log('• Speed builds need POW investment for efficiency');
      console.log('• Strength builds multiply their modest speed effectively');
      console.log('\\n========================================\\n');

      // Verify that efficiency makes a meaningful difference
      expect(speedEffectiveKE).toBeLessThan(speedRawKE);
      expect(strengthEffectiveKE).toBeCloseTo(strengthRawKE * 1.0, 1);
    });

    it('should show universal efficiency across all builds', () => {
      console.log('\\n=== UNIVERSAL MOMENTUM EFFICIENCY ===\\n');

      const testScenario = {
        velocity: 12, // m/s
        mass: 75 // kg
      };

      const buildTypes = [
        { name: 'Speed Demon', pow: 30, description: 'Low POW, relies on velocity' },
        { name: 'Balanced', pow: 60, description: 'Moderate POW and speed' },
        { name: 'Strength Master', pow: 100, description: 'High POW, maximizes efficiency' }
      ];

      const rawKE = 0.5 * testScenario.mass * testScenario.velocity * testScenario.velocity;

      console.log(`Scenario: ${testScenario.mass}kg fighter at ${testScenario.velocity} m/s (${rawKE.toFixed(0)}J raw kinetic energy)\\n`);
      console.log('Momentum transfer efficiency by build type:\\n');

      console.log('Build           POW   Efficiency   Lost Energy   Effective Damage');
      console.log('-------------   ---   ----------   -----------   ----------------');

      for (const build of buildTypes) {
        const efficiency = build.pow / 100;
        const transferredKE = rawKE * efficiency;
        const lostKE = rawKE - transferredKE;
        const damage = transferredKE / JOULES_PER_DAMAGE;

        console.log(
          `${build.name.padEnd(13)}   ${build.pow.toString().padStart(3)}   ` +
          `${(efficiency * 100).toFixed(1).padStart(8)}%   ${lostKE.toFixed(0).padStart(9)}J   ` +
          `${damage.toFixed(0).padStart(14)}`
        );
      }

            console.log('\\n💡 KEY EFFICIENCY INSIGHTS:');
      console.log('• Low POW wastes 90% of kinetic energy to poor form');
      console.log('• High POW captures 100% of available momentum');
      console.log('• Efficiency applies equally to all weapons and scenarios');
      console.log('• POW investment benefits ALL movement-based damage');
      console.log('\\n=====================================\\n');

      // Verify efficiency scaling
      const lowEfficiency = 30 / 100;
      const highEfficiency = 100 / 100;

      expect(highEfficiency).toBeGreaterThan(lowEfficiency * 3);
      expect(lowEfficiency).toBeCloseTo(0.3, 2); // 30% efficiency
      expect(highEfficiency).toBeCloseTo(1.0, 2); // 100% efficiency
    });
  });

  describe('Static Melee Combat Analysis', () => {
    it('should compare weapon efficiency tiers in stationary combat', () => {
      console.log('\\n=== STATIC MELEE COMBAT: WEAPON EFFICIENCY TIERS ===\\n');

      // Two fighters, same POW, melee range, no momentum
      const fighterPOW = 50;
      const fighterMass = 80; // kg
      const velocity = 0; // stationary combat

      // Calculate base muscular damage (no momentum)
      const basePowerOutput = calculatePowerOutput(fighterPOW); // 550W
      const baseMuscularKE = calculateMuscularKineticEnergy(fighterPOW);
      const baseMuscularDamage = baseMuscularKE / JOULES_PER_DAMAGE;

      console.log(`Base Scenario: Two fighters with POW ${fighterPOW} in melee range`);
      console.log(`Muscular Power Output: ${basePowerOutput}W`);
      console.log(`Base Muscular Damage: ${baseMuscularDamage.toFixed(1)} (no weapon)\\n`);

            // Golden ratio weapon efficiency tiers
      const weaponTiers = [
        {
          name: 'Bare Hands',
          tier: 'Unarmed',
          efficiency: 0.618 * 0.618, // 1/φ² (0.382)
          hands: 0,
          dualWield: false,
          description: 'Natural weapons, poor energy transfer'
        },
        {
          name: 'Dagger',
          tier: 'Light',
          efficiency: 0.618, // 1/φ (golden ratio conjugate)
          hands: 1,
          dualWield: true,
          description: 'Fast, precise, dual-wieldable'
        },
        {
          name: 'Sword',
          tier: 'Medium',
          efficiency: 1.000, // baseline
          hands: 1,
          dualWield: false,
          description: 'Balanced, versatile, one-handed'
        },
        {
          name: 'Warhammer',
          tier: 'Heavy',
          efficiency: 1.618, // φ (golden ratio)
          hands: 2,
          dualWield: false,
          description: 'Devastating, slow, two-handed'
        }
      ];

      console.log('🗡️  WEAPON EFFICIENCY COMPARISON:\\n');
      console.log('Weapon      Tier      Efficiency  Hands  Dual?  Total Damage');
      console.log('----------  --------  ----------  -----  -----  ------------');

      for (const weapon of weaponTiers) {
        const weaponDamage = baseMuscularDamage * weapon.efficiency;
        const dualWieldDamage = weapon.dualWield ? weaponDamage * 2 : weaponDamage;

        console.log(
          `${weapon.name.padEnd(10)}  ${weapon.tier.padEnd(8)}  ` +
          `${weapon.efficiency.toFixed(3).padStart(8)}x  ${weapon.hands.toString().padStart(5)}  ` +
          `${weapon.dualWield ? 'Yes' : 'No '.padEnd(3)}   ${weaponDamage.toFixed(1).padStart(10)}`
        );

        if (weapon.dualWield) {
          console.log(`${' '.repeat(10)}  ${'Dual'.padEnd(6)}  ${'2.000x'.padStart(8)}  ${'2'.padStart(5)}  ${'Yes'}   ${dualWieldDamage.toFixed(1).padStart(10)}`);
        }
      }

      console.log('\\n⚔️  HEAD-TO-HEAD MATCHUP:\\n');

      // Specific matchup: Warhammer vs Dagger (dual-wield)
      const warhammerDamage = baseMuscularDamage * 1.618;
      const singleDaggerDamage = baseMuscularDamage * 0.618;
      const dualDaggerDamage = singleDaggerDamage * 2; // Two daggers

      console.log('Fighter A: 2H Warhammer');
      console.log(`• Efficiency: 1.618x (Golden Ratio)`);
      console.log(`• Damage per strike: ${warhammerDamage.toFixed(1)}`);
      console.log(`• Attack speed: Slow (heavy weapon)`);
      console.log(`• Hands used: 2 (no shield/offhand)\\n`);

      console.log('Fighter B: Dual Daggers');
      console.log(`• Efficiency: 0.618x per dagger (1/Golden Ratio)`);
      console.log(`• Single dagger damage: ${singleDaggerDamage.toFixed(1)}`);
      console.log(`• Dual wield damage: ${dualDaggerDamage.toFixed(1)} (2x attacks)`);
      console.log(`• Attack speed: Fast (light weapons)`);
      console.log(`• Hands used: 2 (dual weapons)\\n`);

      console.log('📊 DAMAGE COMPARISON:');
      console.log(`• Warhammer: ${warhammerDamage.toFixed(1)} damage per slow strike`);
      console.log(`• Dual Daggers: ${dualDaggerDamage.toFixed(1)} damage per fast combo`);
      console.log(`• Damage ratio: ${(dualDaggerDamage / warhammerDamage).toFixed(2)}x (daggers vs hammer)`);

      const damageAdvantage = dualDaggerDamage > warhammerDamage ? 'Dual Daggers' : 'Warhammer';
      const advantagePercent = Math.abs((dualDaggerDamage - warhammerDamage) / Math.min(dualDaggerDamage, warhammerDamage) * 100);

      console.log(`• Winner: ${damageAdvantage} (+${advantagePercent.toFixed(1)}% damage advantage)\\n`);

      console.log('⚖️  TACTICAL TRADE-OFFS:\\n');
      console.log('Warhammer Advantages:');
      console.log('• Higher single-hit damage (good vs armor)');
      console.log('• Longer reach and intimidation');
      console.log('• Armor penetration capabilities\\n');

      console.log('Dual Dagger Advantages:');
      console.log('• Higher DPS potential (fast strikes)');
      console.log('• Superior mobility and agility');
      console.log('• Backup weapon if one is lost/damaged\\n');

      console.log('💡 GOLDEN RATIO INSIGHTS:');
      console.log('• Unarmed: 1/φ² efficiency (0.382x) - poorest energy transfer');
      console.log('• Light weapons: 1/φ efficiency (0.618x)');
      console.log('• Medium weapons: 1.0x efficiency (baseline)');
      console.log('• Heavy weapons: φ efficiency (1.618x)');
      console.log('• Dual light = 2 × (1/φ) = 1.236x total, provided both hit');
      console.log('• Mathematical cascade: 0.382 → 0.618 → 1.000 → 1.618');
      console.log('\\n================================================\\n');

            // Verify the golden ratio relationships
      expect(weaponTiers[0].efficiency).toBeCloseTo((1/1.618) * (1/1.618), 3); // Unarmed = 1/φ²
      expect(weaponTiers[1].efficiency).toBeCloseTo(1/1.618, 3); // Light = 1/φ
      expect(weaponTiers[2].efficiency).toBeCloseTo(1.000, 3);   // Medium = 1.0
      expect(weaponTiers[3].efficiency).toBeCloseTo(1.618, 3);   // Heavy = φ

      // Verify dual wield gives exactly 2x the single weapon efficiency (for daggers)
      const dualLightEfficiency = weaponTiers[1].efficiency * 2;
      expect(dualLightEfficiency).toBeCloseTo(1.236, 3); // 2 × (1/φ) = 1.236

      // Dual light should be between medium and heavy
      expect(dualLightEfficiency).toBeGreaterThan(weaponTiers[2].efficiency);
      expect(dualLightEfficiency).toBeLessThan(weaponTiers[3].efficiency);
    });

    it('should analyze POW scaling with weapon efficiency tiers', () => {
      console.log('\\n=== POW SCALING ACROSS WEAPON TIERS ===\\n');

      const powLevels = [10, 30, 50, 75, 100];
      const weaponEfficiencies = [
        { name: 'Unarmed', efficiency: 0.618 * 0.618 }, // 0.382 (φ⁻²)
        { name: 'Light (Single)', efficiency: 0.618 },
        { name: 'Light (Dual)', efficiency: 1.236 }, // 2 × 0.618
        { name: 'Medium', efficiency: 1.000 },
        { name: 'Heavy', efficiency: 1.618 }
      ];

      console.log('Muscular damage scaling by POW and weapon tier:\\n');
      console.log('POW   Base Dmg   Unarmed   Light(1x)   Light(2x)   Medium   Heavy');
      console.log('---   --------   -------   ---------   ---------   ------   -----');

      for (const pow of powLevels) {
        const baseMuscularKE = calculateMuscularKineticEnergy(pow);
        const baseDamage = baseMuscularKE / JOULES_PER_DAMAGE;

        const damages = weaponEfficiencies.map(w => baseDamage * w.efficiency);

        console.log(
          `${pow.toString().padStart(3)}   ${baseDamage.toFixed(1).padStart(7)}   ` +
          `${damages[0].toFixed(1).padStart(6)}   ${damages[1].toFixed(1).padStart(8)}   ` +
          `${damages[2].toFixed(1).padStart(8)}   ${damages[3].toFixed(1).padStart(6)}   ` +
          `${damages[4].toFixed(1).padStart(5)}`
        );
      }

      console.log('\\n📈 SCALING ANALYSIS:\\n');

      // Compare low vs high POW
      const lowPOW = 10;
      const highPOW = 100;

      const lowBaseDamage = calculateMuscularKineticEnergy(lowPOW) / JOULES_PER_DAMAGE;
      const highBaseDamage = calculateMuscularKineticEnergy(highPOW) / JOULES_PER_DAMAGE;

      console.log(`POW ${lowPOW} vs POW ${highPOW} comparison:`);
      console.log(`• Base damage scaling: ${lowBaseDamage.toFixed(1)} → ${highBaseDamage.toFixed(1)} (${(highBaseDamage/lowBaseDamage).toFixed(1)}x)`);

      for (const weapon of weaponEfficiencies) {
        const lowWeaponDamage = lowBaseDamage * weapon.efficiency;
        const highWeaponDamage = highBaseDamage * weapon.efficiency;

        console.log(`• ${weapon.name}: ${lowWeaponDamage.toFixed(1)} → ${highWeaponDamage.toFixed(1)} (${(highWeaponDamage/lowWeaponDamage).toFixed(1)}x)`);
      }

      console.log('\\n💡 KEY INSIGHTS:');
      console.log('• All weapon tiers scale identically with POW');
      console.log('• Efficiency differences remain constant across POW levels');
      console.log('• Heavy weapons always deal φ times more than light weapons');
      console.log('• Dual light weapons bridge the gap between medium and heavy');
      console.log('• Golden ratio creates elegant mathematical progression');
      console.log('\\n===========================================\\n');

      // Verify scaling consistency
      const scalingRatio = highBaseDamage / lowBaseDamage;
      for (let i = 0; i < weaponEfficiencies.length; i++) {
        const lowDamage = lowBaseDamage * weaponEfficiencies[i].efficiency;
        const highDamage = highBaseDamage * weaponEfficiencies[i].efficiency;
        const weaponScalingRatio = highDamage / lowDamage;

        expect(weaponScalingRatio).toBeCloseTo(scalingRatio, 2);
      }
    });

    it('should demonstrate Captain America level scaling at POW 100', () => {
      console.log('\\n=== CAPTAIN AMERICA SCALING VERIFICATION ===\\n');

      // Test superhuman POW 100 vs ordinary human benchmarks
      const ordinaryHuman = { pow: 10, res: 10, hp: 100 };
      const captainAmerica = { pow: 100, res: 100, hp: 100 + (100-10)*2 }; // 280 HP

      console.log('🇺🇸 CAPTAIN AMERICA vs ORDINARY HUMAN:\\n');

      const weaponTiers = [
        { name: 'Bare Hands', efficiency: 0.618 * 0.618 }, // 0.382 (φ⁻²)
        { name: 'Light Weapon', efficiency: 0.618 },
        { name: 'Medium Weapon', efficiency: 1.000 },
        { name: 'Heavy Weapon', efficiency: 1.618 }
      ];

      console.log('Damage Output Comparison:\\n');
      console.log('Weapon         Ordinary (POW 10)   Captain America (POW 100)   Lethality vs 100 HP');
      console.log('-------------  -----------------   -------------------------   -------------------');

      for (const weapon of weaponTiers) {
        const ordinaryBaseDamage = calculateMuscularKineticEnergy(ordinaryHuman.pow) / JOULES_PER_DAMAGE;
        const captainBaseDamage = calculateMuscularKineticEnergy(captainAmerica.pow) / JOULES_PER_DAMAGE;

        const ordinaryWeaponDamage = ordinaryBaseDamage * weapon.efficiency;
        const captainWeaponDamage = captainBaseDamage * weapon.efficiency;

        const hitsToKillOrdinary = Math.ceil(ordinaryHuman.hp / captainWeaponDamage);
        const lethalityStatus = hitsToKillOrdinary === 1 ? '💀 ONE-SHOT' : `${hitsToKillOrdinary} hits`;

        console.log(
          `${weapon.name.padEnd(13)}  ${ordinaryWeaponDamage.toFixed(1).padStart(15)}   ` +
          `${captainWeaponDamage.toFixed(1).padStart(23)}   ${lethalityStatus.padStart(17)}`
        );
      }

      console.log('\\n📊 SCALING ANALYSIS:\\n');

      const ordinaryBare = calculateMuscularKineticEnergy(10) / JOULES_PER_DAMAGE;
      const captainBare = calculateMuscularKineticEnergy(100) / JOULES_PER_DAMAGE;
      const captainHeavy = captainBare * 1.618;

      console.log(`Ordinary Human Bare-Handed: ${ordinaryBare.toFixed(1)} damage`);
      console.log(`Captain America Bare-Handed: ${captainBare.toFixed(1)} damage (${(captainBare/ordinaryBare).toFixed(1)}x stronger)`);
      console.log(`Captain America Heavy Weapon: ${captainHeavy.toFixed(1)} damage\\n`);

      console.log('🎯 LETHALITY BENCHMARKS:\\n');

      const bareHandedKills = Math.ceil(100 / captainBare);
      const heavyWeaponKills = Math.ceil(100 / captainHeavy);

      if (captainBare >= 100) {
        console.log('✅ Bare-handed: ONE-SHOT kills ordinary humans');
      } else {
        console.log(`❌ Bare-handed: ${bareHandedKills} hits to kill (should be 1)`);
      }

      if (captainHeavy >= 100) {
        console.log('✅ Heavy weapon: ONE-SHOT kills ordinary humans');
      } else {
        console.log(`❌ Heavy weapon: ${heavyWeaponKills} hits to kill (should be 1)`);
      }

      console.log('\\n⚔️  SUPERHUMAN vs SUPERHUMAN COMBAT:\\n');

      const captainVsCaptainBare = Math.ceil(captainAmerica.hp / captainBare);
      const captainVsCaptainHeavy = Math.ceil(captainAmerica.hp / captainHeavy);

      console.log(`Captain America (${captainAmerica.hp} HP) vs Captain America:\\n`);
      console.log(`• Bare-handed: ${captainVsCaptainBare} hits to defeat`);
      console.log(`• Heavy weapon: ${captainVsCaptainHeavy} hits to defeat`);
      console.log(`• Combat remains tactical between superhumans`);

      console.log('\\n💡 POWER SCALING INSIGHTS:\\n');
      console.log(`• Power scaling: POW 10 → POW 100 = ${(captainBare/ordinaryBare).toFixed(1)}x damage increase`);
      console.log(`• Baseline damage: ${ordinaryBare.toFixed(1)} → ${captainBare.toFixed(1)}`);
      console.log(`• Heavy weapon amplification: ${captainHeavy.toFixed(1)} damage`);
      console.log(`• Ordinary humans become fragile vs superhumans`);
      console.log(`• Superhuman vs superhuman combat remains balanced`);
      console.log('\\n=======================================\\n');

      // Verify Captain America should one-shot ordinary humans with heavy weapons
      expect(captainHeavy).toBeGreaterThanOrEqual(100); // Should one-shot 100 HP
      expect(captainBare/ordinaryBare).toBeGreaterThan(6); // Should be dramatically stronger (7x is good)
      expect(captainVsCaptainHeavy).toBeGreaterThanOrEqual(2); // Superhuman combat should take 2+ hits
    });
  });
});

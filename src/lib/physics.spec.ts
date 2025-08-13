import { describe, it, expect } from 'vitest';
import {
  calculatePowerOutput,
  calculateEffectiveMass,
  calculateTopSpeed,
  calculateInertiaReduction,
  calculateMuscularKineticEnergy,
  calculateMomentumKineticEnergy,
  calculateWeaponKineticEnergy,
  calculateTotalDamage,
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
  JOULES_PER_DAMAGE,
} from './physics';

describe('Physics System Core Functions', () => {

  describe('Power Calculations', () => {
    it('should calculate power output correctly', () => {
      expect(calculatePowerOutput(0)).toBe(50); // 0 * 10W + 50W
      expect(calculatePowerOutput(10)).toBe(150); // 10 * 10W + 50W
      expect(calculatePowerOutput(50)).toBe(550); // 50 * 10W + 50W
      expect(calculatePowerOutput(100)).toBe(1050); // 100 * 10W + 50W
    });

    it('should calculate muscular kinetic energy from power', () => {
      const power10KE = calculateMuscularKineticEnergy(10);
      const expectedKE = 150 * DEFAULT_STRIKE_DURATION * STRIKE_EFFICIENCY; // 150W * 0.2s * 0.618

      expect(power10KE).toBeCloseTo(expectedKE, 2);
      expect(power10KE).toBeCloseTo(18.54, 2); // 150 * 0.2 * 0.618

      const power100KE = calculateMuscularKineticEnergy(100);
      expect(power100KE).toBeCloseTo(129.787, 2); // 1050 * 0.2 * (1/φ)
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

    it('should calculate weapon kinetic energy bonuses', () => {
      expect(calculateWeaponKineticEnergy('bare')).toBe(0);
      expect(calculateWeaponKineticEnergy('dagger')).toBe(50);
      expect(calculateWeaponKineticEnergy('sword')).toBe(150);
      expect(calculateWeaponKineticEnergy('warhammer')).toBe(250);
    });

    it('should calculate total damage from all kinetic energy sources', () => {
      // Stationary strike with bare hands
      const stationaryDamage = calculateTotalDamage(50, 0, 80, 'bare');
      const expectedMuscularKE = 550 * DEFAULT_STRIKE_DURATION * STRIKE_EFFICIENCY; // 50*10 + 50 = 550W
      const expectedDamage = expectedMuscularKE / JOULES_PER_DAMAGE;
      expect(stationaryDamage).toBeCloseTo(expectedDamage, 2);

      // Moving strike with weapon
      const movingDamage = calculateTotalDamage(50, 20, 80, 'sword');
      const muscularKE = 550 * DEFAULT_STRIKE_DURATION * STRIKE_EFFICIENCY; // 50*10 + 50 = 550W
      const momentumKE = 0.5 * 80 * 400; // 0.5 * 80 * 20²
      const weaponKE = 150;
      const totalKE = muscularKE + momentumKE + weaponKE;
      const expectedTotal = totalKE / JOULES_PER_DAMAGE;
      expect(movingDamage).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Utility Functions', () => {
    it('should convert between damage and kinetic energy', () => {
      expect(damageToKineticEnergy(10)).toBe(100); // 10 * 10J
      expect(damageToKineticEnergy(50)).toBe(500);

      expect(kineticEnergyToDamage(100)).toBe(10); // 100J / 10
      expect(kineticEnergyToDamage(500)).toBe(50);

      // Round trip conversion
      const originalDamage = 75;
      const ke = damageToKineticEnergy(originalDamage);
      const backToDamage = kineticEnergyToDamage(ke);
      expect(backToDamage).toBe(originalDamage);
    });

    it('should calculate velocity needed for momentum damage', () => {
      // For 100 damage worth of momentum KE with 80kg mass
      const velocity = velocityForMomentumDamage(100, 80);
      const expectedKE = 100 * JOULES_PER_DAMAGE; // 1000J
      const expectedVelocity = Math.sqrt(2 * expectedKE / 80); // sqrt(2 * 1000 / 80)
      expect(velocity).toBeCloseTo(expectedVelocity, 2);
      expect(velocity).toBeCloseTo(5, 2); // sqrt(25) = 5 m/s
    });

    it('should calculate mass needed for momentum damage', () => {
      // For 100 damage worth of momentum KE at 20 m/s
      const mass = massForMomentumDamage(100, 20);
      const expectedKE = 100 * JOULES_PER_DAMAGE; // 1000J
      const expectedMass = 2 * expectedKE / (20 * 20); // 2 * 1000 / 400
      expect(mass).toBeCloseTo(expectedMass, 2);
      expect(mass).toBeCloseTo(5, 2); // 2000 / 400 = 5 kg
    });

    it('should calculate power-to-weight ratio', () => {
      expect(powerToWeightRatio(50, 80)).toBeCloseTo(6.875, 2); // 550W / 80kg
      expect(powerToWeightRatio(100, 60)).toBeCloseTo(17.5, 2); // 1050W / 60kg
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
      expect(result.weaponKE).toBe(150); // sword bonus

      // Total KE should equal sum of components
      const expectedTotalKE = result.muscularKE + result.momentumKE + result.weaponKE;
      expect(result.totalKE).toBeCloseTo(expectedTotalKE, 2);

      // Damage should equal total KE / 10
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
      expect(comparison.build1.powerToWeight).toBeCloseTo(350 / 60, 2); // (30*10+50) / 60 = 5.83 W/kg
      expect(comparison.build2.powerToWeight).toBeCloseTo(850 / 120, 2); // (80*10+50) / 120 = 7.08 W/kg
    });
  });

  describe('Edge Cases and Boundaries', () => {
    it('should handle zero values gracefully', () => {
      expect(calculatePowerOutput(0)).toBe(50); // Baseline power
      expect(calculateInertiaReduction(0)).toBe(0);
      expect(calculateMomentumKineticEnergy(0, 80)).toBe(0);
      expect(calculateTotalDamage(0, 0, 80)).toBeGreaterThan(0); // Has baseline power
    });

    it('should handle maximum values correctly', () => {
      const maxInertia = calculateInertiaReduction(100);
      expect(maxInertia).toBeCloseTo(MAX_INERTIA_REDUCTION, 6);

      const maxPower = calculatePowerOutput(100);
      expect(maxPower).toBe(1050); // 100*10 + 50

      // Very high values should still work
      const extremeDamage = calculateTotalDamage(100, 50, 200, 'warhammer');
      expect(extremeDamage).toBeGreaterThan(1000); // Should be massive damage
    });

    it('should maintain consistent scaling relationships', () => {
      // Power scaling is no longer purely linear due to baseline
      const power20 = calculatePowerOutput(20); // 250W
      const power40 = calculatePowerOutput(40); // 450W
      expect(power40).toBe(450); // Verify absolute values instead of ratios

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
      // Strike efficiency should be golden ratio
      expect(STRIKE_EFFICIENCY).toBeCloseTo(0.618, 3);

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
});

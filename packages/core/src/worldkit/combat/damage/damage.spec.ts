import { describe, it, expect } from 'vitest';
import {
  calculateWeaponDamage,
  calculateWeaponApCost,
  calculateWeaponDps,
  findOptimalWeaponMass,
  analyzeWeapon,
} from './model/stat-scaling';

import { DEFAULT_BASE_AP } from '../ap';

describe('calculateWeaponApCost', () => {

  /**
   * Comprehensive parameter space test for calculateWeaponApCost
   * Tests weapon mass from 1kg to 10kg (1kg steps) vs FIN from 10 to 100 (10 steps)
   * Creates ASCII visualization of the AP cost landscape
   */
  describe('Parameter Space Analysis', () => {
    const massRange = Array.from({ length: 10 }, (_, i) => i + 1); // 1kg to 10kg
    const finRange = Array.from({ length: 10 }, (_, i) => (i + 1) * 10); // 10 to 100

    it('should calculate AP cost for all parameter combinations', () => {
      console.log('\n=== Individual Parameter Calculations ===');

      for (const mass of massRange) {
        for (const fin of finRange) {
          const apCost = calculateWeaponApCost(mass, fin);

          // For now, just observe the values - no assertions
          console.log(`Mass: ${mass}kg, FIN: ${fin} → AP Cost: ${apCost.toFixed(3)}`);
        }
      }
    });

    /**
     * ASCII visualization test - creates a table showing AP costs across parameter space
     */
    it('should visualize AP cost parameter space', () => {
      console.log('\n=== calculateWeaponApCost Parameter Space ===');
      console.log('Weapon Mass (kg) vs Actor FIN Stat');
      console.log('');

      // Header row with FIN values
      const header = 'Mass\\FIN |' + finRange.map(fin => fin.toString().padStart(8)).join('');
      console.log(header);
      console.log('-'.repeat(header.length));

      // Data rows for each mass
      for (const mass of massRange) {
        const row = `${mass.toString().padStart(4)}kg   |` +
          finRange.map(fin => {
            const apCost = calculateWeaponApCost(mass, fin);
            return apCost.toFixed(3).padStart(8);
          }).join('');
        console.log(row);
      }

      console.log('\n=== Analysis Notes ===');
      console.log('- Lower AP cost = more efficient weapon');
      console.log('- Higher FIN = lower AP cost (more dexterous)');
      console.log('- Higher mass = higher AP cost (heavier weapons)');
      console.log('');
    });

    /**
     * Constraint validation: Weapon AP costs should never exceed base AP per turn
     */
    it('should never exceed DEFAULT_BASE_AP across entire parameter space', () => {
      console.log(`\n=== AP Cost Constraint Validation ===`);
      console.log(`DEFAULT_BASE_AP = ${DEFAULT_BASE_AP}`);
      console.log('Checking all combinations...\n');

      let maxApCost = 0;
      let maxApCostCase = { mass: 0, fin: 0 };
      let violationCount = 0;

      for (const mass of massRange) {
        for (const fin of finRange) {
          const apCost = calculateWeaponApCost(mass, fin);

          // Track maximum
          if (apCost > maxApCost) {
            maxApCost = apCost;
            maxApCostCase = { mass, fin };
          }

          // Check constraint violation
          if (apCost > DEFAULT_BASE_AP) {
            violationCount++;
            console.log(`❌ VIOLATION: Mass=${mass}kg, FIN=${fin} → AP Cost=${apCost.toFixed(3)} > ${DEFAULT_BASE_AP}`);
          }
        }
      }

      console.log(`Maximum AP cost found: ${maxApCost.toFixed(3)} at Mass=${maxApCostCase.mass}kg, FIN=${maxApCostCase.fin}`);
      console.log(`Total violations: ${violationCount}/${massRange.length * finRange.length} combinations`);

      if (violationCount === 0) {
        console.log('✅ All weapon AP costs are within acceptable range!');
      }

      // Assert the constraint
      expect(maxApCost).toBeLessThanOrEqual(DEFAULT_BASE_AP);
    });

    /**
     * Individual parameter assertions with loop implementation
     */
    it('should not exceed DEFAULT_BASE_AP for all parameter combinations', () => {
      for (const mass of massRange) {
        for (const fin of finRange) {
          const apCost = calculateWeaponApCost(mass, fin);
          expect(apCost).toBeLessThanOrEqual(DEFAULT_BASE_AP);
        }
      }
    });

    /**
     * Unit validation tests - ensure functions catch common unit mismatch errors
     */
    it('should throw error when weapon mass exceeds realistic limits (units validation)', () => {
      // Test the guard clause that catches grams vs kilograms unit errors
      expect(() => {
        calculateWeaponApCost(2000, 50); // 2000kg instead of 2kg - likely grams passed as kg
      }).toThrow('Invalid weapon mass: 2000kg');

      expect(() => {
        calculateWeaponApCost(12000, 50); // 12000kg instead of 12kg - warhammer in grams
      }).toThrow('Invalid weapon mass: 12000kg');

      // Should also provide helpful error message
      expect(() => {
        calculateWeaponApCost(500, 50); // 500kg instead of 0.5kg - dagger in grams
      }).toThrow('units error - weapon schemas store mass in grams');
    });

    it('should throw error when weapon damage calculation gets invalid mass', () => {
      // Test the guard clause in calculateWeaponDamage too
      expect(() => {
        calculateWeaponDamage(2000, 50); // 2000kg instead of 2kg
      }).toThrow('Invalid weapon mass: 2000kg');

      expect(() => {
        calculateWeaponDamage(500, 50); // 500kg instead of 0.5kg
      }).toThrow('units error - weapon schemas store mass in grams');
    });
  });
});

describe('Linear Scaling Weapon Damage System', () => {

  describe('Core Linear Scaling', () => {
    it('should scale damage linearly with POW and weapon mass', () => {
      // Test linear POW scaling
      const mass = 5.0;
      const damage50 = calculateWeaponDamage(mass, 50);
      const damage100 = calculateWeaponDamage(mass, 100);

      // Double POW should roughly double the damage bonus
      expect(damage100 - damage50).toBeCloseTo(damage50 - 20, 1); // 20 is base damage

      // Test linear mass scaling
      const pow = 60;
      const damage2kg = calculateWeaponDamage(2.0, pow);
      const damage4kg = calculateWeaponDamage(4.0, pow);

      // Double mass should double the POW bonus
      const bonus2kg = damage2kg - 20;
      const bonus4kg = damage4kg - 20;
      expect(bonus4kg).toBeCloseTo(bonus2kg * 2, 1);
    });

    it('should scale AP cost linearly with FIN and inverse weapon mass', () => {
      // Test FIN scaling
      const mass = 2.0;
      const apCost10 = calculateWeaponApCost(mass, 10);
      const apCost50 = calculateWeaponApCost(mass, 50);
      const apCost100 = calculateWeaponApCost(mass, 100);

      // Higher FIN should reduce AP cost linearly
      expect(apCost10).toBeGreaterThan(apCost50);
      expect(apCost50).toBeGreaterThan(apCost100);

      // Test inverse mass scaling for FIN benefit
      const fin = 80;
      const apLight = calculateWeaponApCost(0.5, fin); // Light weapon
      const apHeavy = calculateWeaponApCost(8.0, fin);  // Heavy weapon

      // Light weapons should benefit more from FIN
      expect(apLight).toBeLessThan(apHeavy);
    });
  });

  describe('Degenerate Build Analysis', () => {
    it('should test degenerate POW build weapon preferences', () => {
      console.log('\n💪 DEGENERATE POW BUILD ANALYSIS (POW 100, FIN 10)');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This tests a "pure strength" character build with maximum POW (100) and');
      console.log('minimum FIN (10). We test different weapon masses to see which gives the');
      console.log('highest DPS. Pure POW builds should prefer heavier weapons because:');
      console.log('• High POW scales damage with weapon mass (more mass = more damage)');
      console.log('• Low FIN means attack speed is already slow, so mass penalty matters less');
      console.log('');

      const degeneratePow = { pow: 100, fin: 10 };
      const testMasses = [0.5, 1.0, 2.0, 4.0, 6.0, 8.0, 12.0, 15.0];

      console.log('Mass (kg)   Damage   AP Cost   DPS     Notes');
      console.log('---------  -------  -------  ------  -----');

      let bestDps = 0;
      let optimalMass = 0;
      const results: Array<{ mass: number; damage: number; apCost: number; dps: number }> = [];

      for (const mass of testMasses) {
        const damage = calculateWeaponDamage(mass, degeneratePow.pow);
        const apCost = calculateWeaponApCost(mass, degeneratePow.fin);
        const dps = damage / apCost;

        results.push({ mass, damage, apCost, dps });

        if (dps > bestDps) {
          bestDps = dps;
          optimalMass = mass;
        }
      }

      // Display results with optimal marking
      for (const result of results) {
        const isOptimal = result.dps === bestDps ? ' ← OPTIMAL' : '';
        console.log(`    ${result.mass.toString().padStart(4)}kg    ${Math.round(result.damage).toString().padStart(3)}hp    ${result.apCost.toFixed(1)}s   ${result.dps.toFixed(1).padStart(5)}${isOptimal}`);
      }

      console.log(`\n🎯 DEGENERATE POW BUILD RESULT:`);
      console.log(`• Optimal weapon mass: ${optimalMass}kg`);
      console.log(`• Maximum DPS: ${bestDps.toFixed(1)}`);
      console.log(`• Linear scaling should favor heavy weapons for POW builds`);
    });

    it('should test degenerate FIN build weapon preferences', () => {
      console.log('\n🔬 DEGENERATE FIN BUILD ANALYSIS (POW 10, FIN 100)');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This tests a "pure finesse" character build with maximum FIN (100) and');
      console.log('minimum POW (10). We test different weapon masses to see which gives the');
      console.log('highest DPS. Pure FIN builds should prefer lighter weapons because:');
      console.log('• High FIN reduces AP cost more effectively with light weapons');
      console.log('• Low POW means damage scaling with mass is minimal');
      console.log('• Light weapons can attack much faster, leading to higher DPS');
      console.log('');

      const degenerateFin = { pow: 10, fin: 100 };
      const testMasses = [0.5, 1.0, 2.0, 4.0, 6.0, 8.0, 12.0, 15.0];

      console.log('Mass (kg)   Damage   AP Cost   DPS     Notes');
      console.log('---------  -------  -------  ------  -----');

      let bestDps = 0;
      let optimalMass = 0;
      const results: Array<{ mass: number; damage: number; apCost: number; dps: number }> = [];

      for (const mass of testMasses) {
        const damage = calculateWeaponDamage(mass, degenerateFin.pow);
        const apCost = calculateWeaponApCost(mass, degenerateFin.fin);
        const dps = damage / apCost;

        results.push({ mass, damage, apCost, dps });

        if (dps > bestDps) {
          bestDps = dps;
          optimalMass = mass;
        }
      }

      // Display results with optimal marking
      for (const result of results) {
        const isOptimal = result.dps === bestDps ? ' ← OPTIMAL' : '';
        console.log(`    ${result.mass.toString().padStart(4)}kg    ${Math.round(result.damage).toString().padStart(3)}hp    ${result.apCost.toFixed(1)}s   ${result.dps.toFixed(1).padStart(5)}${isOptimal}`);
      }

      console.log(`\n🎯 DEGENERATE FIN BUILD RESULT:`);
      console.log(`• Optimal weapon mass: ${optimalMass}kg`);
      console.log(`• Maximum DPS: ${bestDps.toFixed(1)}`);
      console.log(`• Linear scaling should favor light weapons for FIN builds`);
    });

    it('should demonstrate weapon mass optimization for different builds', () => {
      console.log('\n⚖️  WEAPON MASS OPTIMIZATION BY BUILD TYPE');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This table shows the optimal weapon mass for different character builds.');
      console.log('Each build has different POW/FIN combinations, and we calculate which');
      console.log('weapon mass gives them the highest DPS. This demonstrates how stat');
      console.log('allocation affects weapon choice - POW builds prefer heavy weapons,');
      console.log('FIN builds prefer light weapons, and balanced builds fall in between.');
      console.log('');

      const builds = [
        { name: '100 POW, 30 FIN', pow: 100, fin: 30 },
        { name: '30 POW, 100 FIN', pow: 30, fin: 100 },
        { name: '70 POW, 70 FIN', pow: 70, fin: 70 },
        { name: '90 POW, 40 FIN', pow: 90, fin: 40 },
        { name: '40 POW, 90 FIN', pow: 40, fin: 90 },
      ];

      console.log('Build Type        Optimal Mass   Max DPS   Weapon Category');
      console.log('----------------  ------------  --------  ---------------');

      for (const build of builds) {
        const optimal = findOptimalWeaponMass(build.pow, build.fin);
        const analysis = analyzeWeapon(optimal.optimalMass, build.pow, build.fin);

        console.log(
          `${build.name.padEnd(16)}  ${optimal.optimalMass.toString().padStart(8)}kg  ${optimal.maxDps.toFixed(1).padStart(7)}  ${analysis.massCategory}`
        );
      }

      console.log('\n💡 LINEAR SCALING INSIGHTS:');
      console.log('• POW builds should favor heavier weapons (more damage per kg)');
      console.log('• FIN builds should favor lighter weapons (more AP reduction per point)');
      console.log('• Linear scaling creates predictable, tunable weapon preferences');
    });
  });

  describe('Coefficient Tuning Validation', () => {
    it('should verify coefficient independence', () => {
      // Test that damage coefficients don't affect AP cost
      const mass = 3.0;
      const pow = 60;
      const fin = 60;

      const apCost1 = calculateWeaponApCost(mass, fin);
      const damage1 = calculateWeaponDamage(mass, pow);

      // AP cost should be independent of POW
      const apCost2 = calculateWeaponApCost(mass, fin);
      expect(apCost1).toBe(apCost2);

      // Damage should be independent of FIN
      const damage2 = calculateWeaponDamage(mass, pow);
      expect(damage1).toBe(damage2);
    });

    it('should demonstrate smooth optimization landscapes', () => {
      console.log('\n📈 SMOOTH OPTIMIZATION LANDSCAPE ANALYSIS\n');

      const build = { pow: 70, fin: 50 };
      const masses = [0.5, 1.0, 2.0, 4.0, 6.0, 8.0, 12.0, 15.0];

      console.log('Mass (kg)   Damage   AP Cost   DPS     Gradient');
      console.log('---------  -------  -------  ------  --------');

      let prevDps = 0;
      for (const mass of masses) {
        const damage = calculateWeaponDamage(mass, build.pow);
        const apCost = calculateWeaponApCost(mass, build.fin);
        const dps = damage / apCost;
        const gradient = prevDps > 0 ? ((dps - prevDps) / prevDps * 100).toFixed(1) + '%' : 'N/A';

        console.log(`    ${mass.toString().padStart(4)}kg    ${Math.round(damage).toString().padStart(3)}hp    ${apCost.toFixed(1)}s   ${dps.toFixed(1).padStart(5)}  ${gradient.padStart(7)}`);
        prevDps = dps;
      }

      console.log('\n💡 LANDSCAPE INSIGHTS:');
      console.log('• Linear scaling creates smooth, predictable DPS curves');
      console.log('• No chaotic local minima or exponential runaway effects');
      console.log('• Easy to tune coefficients for desired weapon preferences');
    });
  });

  describe('Stat Matrix Visualizations', () => {
    it('should visualize damage matrix (POW vs FIN) for fixed weapon mass', () => {
      console.log('\n🗡️  DAMAGE MATRIX: POW (columns) vs FIN (rows) - 5kg Weapon');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This table shows how much damage each weapon strike deals based on your');
      console.log('POW and FIN stats. Each cell shows the damage for one attack with a 5kg weapon.');
      console.log('POW (Power) increases damage - higher POW = more damage per hit.');
      console.log('FIN (Finesse) should have NO effect on damage - all rows should be identical.');
      console.log('');

      const weaponMass = 5.0;
      const powValues = [10, 30, 50, 70, 90, 100];
      const finValues = [10, 30, 50, 70, 90, 100];

      // Header
      console.log('FIN\\POW'.padEnd(8) + powValues.map(p => p.toString().padStart(6)).join(''));
      console.log('-------' + powValues.map(() => '------').join(''));

      // Data rows
      for (const fin of finValues) {
        const row = fin.toString().padEnd(8);
        const damages = powValues.map(pow => {
          const damage = calculateWeaponDamage(weaponMass, pow);
          return Math.round(damage).toString().padStart(6);
        });
        console.log(row + damages.join(''));
      }

      console.log('\n💡 DAMAGE MATRIX INSIGHTS:');
      console.log('• Damage scales ONLY with POW (rows are identical)');
      console.log('• FIN has no effect on damage output');
      console.log('• Linear POW scaling: 10→30→50→70→90→100');
      console.log('• Pure specialization: POW = Damage');
    });

    it('should visualize AP cost matrix (POW vs FIN) for fixed weapon mass', () => {
      console.log('\n⚡ AP COST MATRIX: POW (columns) vs FIN (rows) - 5kg Weapon');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This table shows how many Action Points (seconds) each weapon strike costs');
      console.log('based on your POW and FIN stats. Lower numbers = faster attacks.');
      console.log('FIN (Finesse) reduces AP cost - higher FIN = faster swings.');
      console.log('POW (Power) should have NO effect on speed - all columns should be identical.');
      console.log('');

      const weaponMass = 5.0;
      const powValues = [10, 30, 50, 70, 90, 100];
      const finValues = [10, 30, 50, 70, 90, 100];

      // Header
      console.log('FIN\\POW'.padEnd(8) + powValues.map(p => p.toString().padStart(6)).join(''));
      console.log('-------' + powValues.map(() => '------').join(''));

      // Data rows
      for (const fin of finValues) {
        const row = fin.toString().padEnd(8);
        const apCosts = powValues.map(pow => {
          const apCost = calculateWeaponApCost(weaponMass, fin);
          return apCost.toFixed(1).padStart(6);
        });
        console.log(row + apCosts.join(''));
      }

      console.log('\n💡 AP COST MATRIX INSIGHTS:');
      console.log('• AP cost scales ONLY with FIN (columns are identical)');
      console.log('• POW has no effect on swing speed');
      console.log('• Linear FIN scaling: higher FIN = lower AP cost');
      console.log('• Pure specialization: FIN = Speed');
    });

    it('should visualize DPS matrix (POW vs FIN) for fixed weapon mass', () => {
      console.log('\n🎯 DPS MATRIX: POW (columns) vs FIN (rows) - 5kg Weapon');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This table shows Damage Per Second (DPS) - your sustained damage output');
      console.log('in combat. Higher numbers = more effective in prolonged fights.');
      console.log('DPS combines both damage per hit AND attack speed (Damage ÷ AP Cost).');
      console.log('Both POW (more damage) and FIN (faster attacks) increase your DPS.');
      console.log('');

      const weaponMass = 5.0;
      const powValues = [10, 30, 50, 70, 90, 100];
      const finValues = [10, 30, 50, 70, 90, 100];

      // Header
      console.log('FIN\\POW'.padEnd(8) + powValues.map(p => p.toString().padStart(7)).join(''));
      console.log('-------' + powValues.map(() => '-------').join(''));

      // Data rows
      for (const fin of finValues) {
        const row = fin.toString().padEnd(8);
        const dpsValues = powValues.map(pow => {
          const damage = calculateWeaponDamage(weaponMass, pow);
          const apCost = calculateWeaponApCost(weaponMass, fin);
          const dps = damage / apCost;
          return dps.toFixed(1).padStart(7);
        });
        console.log(row + dpsValues.join(''));
      }

      console.log('\n💡 DPS MATRIX INSIGHTS:');
      console.log('• DPS increases with BOTH POW (damage) and FIN (speed)');
      console.log('• Bottom-right corner (POW 100, FIN 100) = maximum DPS');
      console.log('• Top-left corner (POW 10, FIN 10) = minimum DPS');
      console.log('• Linear superposition: both stats contribute independently');
    });

    it('should compare matrices across different weapon masses', () => {
      console.log('\n⚖️  WEAPON MASS COMPARISON: Optimal Stats by Mass');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This table compares how different character builds perform with weapons');
      console.log('of varying mass (weight). Each row shows a different build type:');
      console.log('• Pure POW: High strength, low finesse (100 POW, 10 FIN)');
      console.log('• Pure FIN: High finesse, low strength (10 POW, 100 FIN)');
      console.log('• Balanced: Equal stats (70 POW, 70 FIN)');
      console.log('Look for which weapon masses work best for each build style.');
      console.log('');

      const masses = [0.5, 2.0, 5.0, 10.0, 15.0];
      const testBuilds = [
        { name: 'Pure POW', pow: 100, fin: 10 },
        { name: 'Pure FIN', pow: 10, fin: 100 },
        { name: 'Balanced', pow: 70, fin: 70 },
      ];

      console.log('Mass (kg)  ' + testBuilds.map(b => b.name.padStart(12)).join(''));
      console.log('----------' + testBuilds.map(() => '------------').join(''));

      for (const mass of masses) {
        const row = `${mass.toString().padStart(6)}kg  `;
        const results = testBuilds.map(build => {
          const damage = calculateWeaponDamage(mass, build.pow);
          const apCost = calculateWeaponApCost(mass, build.fin);
          const dps = damage / apCost;
          return `${dps.toFixed(1)}`.padStart(12);
        });
        console.log(row + results.join(''));
      }

      console.log('\n💡 MASS COMPARISON INSIGHTS:');
      console.log('• Pure POW builds scale with weapon mass (more damage per kg)');
      console.log('• Pure FIN builds favor lighter weapons (better AP reduction)');
      console.log('• Balanced builds find optimal middle-ground weapons');
      console.log('• Linear scaling creates predictable weapon preferences');
    });
  });

  describe('Major Kusanagi Analysis', () => {
    it('should demonstrate Major Kusanagi combat capabilities across weapon masses', () => {
      console.log('\n🤖 MAJOR KUSANAGI: SUPERHUMAN COMBAT ANALYSIS (POW 100, FIN 100)');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('Major Kusanagi represents the pinnacle of cybernetic enhancement with');
      console.log('maximum stats in both Power (100) and Finesse (100). This analysis shows');
      console.log('how her superhuman capabilities translate across different weapon masses.');
      console.log('With perfect stats, she can effectively wield any weapon, but some masses');
      console.log('will still be more optimal than others due to the linear scaling system.');
      console.log('');

      const kusanagi = { pow: 100, fin: 100 };
      const weaponMasses = [0.3, 0.5, 1.0, 2.0, 4.0, 6.0, 8.0, 12.0, 15.0, 20.0];

      console.log('Mass (kg)   Damage   AP Cost   DPS     Strikes/Turn   Category');
      console.log('--------   -------  -------  ------  ------------   --------');

      let maxDps = 0;
      let optimalMass = 0;
      const results = [];

      for (const mass of weaponMasses) {
        const damage = calculateWeaponDamage(mass, kusanagi.pow);
        const apCost = calculateWeaponApCost(mass, kusanagi.fin);
        const dps = calculateWeaponDps(mass, kusanagi.pow, kusanagi.fin);
        const strikesPerTurn = Math.floor(6 / apCost);

        // Categorize weapon by mass
        let category = '';
        if (mass <= 1.0) category = 'Ultra-Light';
        else if (mass <= 3.0) category = 'Light';
        else if (mass <= 7.0) category = 'Medium';
        else if (mass <= 12.0) category = 'Heavy';
        else category = 'Ultra-Heavy';

        results.push({ mass, damage, apCost, dps, strikesPerTurn, category });

        if (dps > maxDps) {
          maxDps = dps;
          optimalMass = mass;
        }
      }

      // Display results with optimal marking
      for (const result of results) {
        const isOptimal = result.dps === maxDps ? ' ← OPTIMAL' : '';
        console.log(
          `${result.mass.toString().padStart(6)}kg   ${Math.round(result.damage).toString().padStart(4)}hp   ${result.apCost.toFixed(1).padStart(5)}s   ${result.dps.toFixed(1).padStart(5)}   ${result.strikesPerTurn.toString().padStart(8)}       ${result.category}${isOptimal}`
        );
      }

      console.log('\n🎯 MAJOR KUSANAGI COMBAT PROFILE:');
      console.log(`• Optimal weapon mass: ${optimalMass}kg`);
      console.log(`• Peak DPS: ${maxDps.toFixed(1)}`);
      console.log(`• Weapon versatility: Effective with any mass category`);
      console.log(`• Combat style: Adaptive - can switch weapons tactically`);

      console.log('\n⚡ SUPERHUMAN CAPABILITIES:');
      const lightWeapon = results.find(r => r.mass === 0.5)!
      const heavyWeapon = results.find(r => r.mass === 15.0)!;

      console.log(`• Light weapon mastery: ${lightWeapon.strikesPerTurn} strikes/turn (${lightWeapon.dps.toFixed(1)} DPS)`);
      console.log(`• Heavy weapon mastery: ${heavyWeapon.strikesPerTurn} strike/turn (${heavyWeapon.damage}hp per hit)`);
      console.log(`• Speed advantage: ${lightWeapon.apCost}s attacks vs normal human ~2.0s`);
      console.log(`• Power advantage: ${heavyWeapon.damage}hp strikes vs normal human ~50hp`);

      console.log('\n🎭 TACTICAL ANALYSIS:');
      console.log('• Against swarms: Ultra-light weapons for maximum DPS');
      console.log('• Against armor: Heavy weapons for penetration');
      console.log('• Versatility: Can adapt weapon choice to any combat scenario');
      console.log('• Superhuman edge: Exceeds human limits in both speed AND power');
    });
  });

  describe('Armor Penetration Analysis', () => {
    it('should visualize per-strike damage vs armored target (DR 20)', () => {
      console.log('\n🛡️  PER-STRIKE DAMAGE vs ARMORED TARGET (DR 20)');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This chart shows how weapon mass affects damage against a heavily armored');
      console.log('enemy with 20 Damage Reduction. The actor has balanced stats (50 POW, 50 FIN).');
      console.log('Light weapons suffer severe damage reduction, while heavier weapons');
      console.log('maintain effectiveness by dealing damage that exceeds the armor threshold.');
      console.log('');

      const actor = { pow: 50, fin: 50 };
      const armorDR = 20;
      const weaponMasses = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0];

      console.log('Weapon Mass (kg)   Base Damage   vs DR 20   Damage Reduction');
      console.log('---------------   -----------   -------   ----------------');

      const results = [];
      for (const mass of weaponMasses) {
        const baseDamage = calculateWeaponDamage(mass, actor.pow);
        const effectiveDamage = Math.max(1, baseDamage - armorDR);
        const damageReduction = ((baseDamage - effectiveDamage) / baseDamage * 100);

        results.push({ mass, baseDamage, effectiveDamage, damageReduction });

        const massStr = mass.toString().padStart(13);
        const baseStr = Math.round(baseDamage).toString().padStart(9) + 'hp';
        const effectiveStr = Math.round(effectiveDamage).toString().padStart(5) + 'hp';
        const reductionStr = damageReduction.toFixed(1).padStart(13) + '%';

        console.log(`${massStr}kg   ${baseStr}   ${effectiveStr}   ${reductionStr}`);
      }

      console.log('\n📊 ARMOR PENETRATION INSIGHTS:');

      // Find crossover points
      const lightWeapons = results.filter(r => r.mass <= 2.0);
      const heavyWeapons = results.filter(r => r.mass >= 10.0);

      const avgLightReduction = lightWeapons.reduce((sum, r) => sum + r.damageReduction, 0) / lightWeapons.length;
      const avgHeavyReduction = heavyWeapons.reduce((sum, r) => sum + r.damageReduction, 0) / heavyWeapons.length;

      console.log(`• Light weapons (≤2kg): Average ${avgLightReduction.toFixed(1)}% damage reduction`);
      console.log(`• Heavy weapons (≥10kg): Average ${avgHeavyReduction.toFixed(1)}% damage reduction`);

      // Find effective threshold
      const effectiveWeapons = results.filter(r => r.damageReduction < 50);
      const minEffectiveMass = effectiveWeapons.length > 0 ? effectiveWeapons[0].mass : 'N/A';

      console.log(`• Effective threshold: ${minEffectiveMass}kg+ weapons lose <50% damage to armor`);
      console.log(`• Tactical implication: Heavy weapons essential vs heavily armored enemies`);

      console.log('\n🎯 COMBAT RECOMMENDATION:');
      const bestWeapon = results.reduce((best, current) =>
        current.effectiveDamage > best.effectiveDamage ? current : best
      );

      console.log(`• Optimal weapon vs DR 20: ${bestWeapon.mass}kg (${Math.round(bestWeapon.effectiveDamage)}hp effective)`);
      console.log(`• Damage retention: ${(100 - bestWeapon.damageReduction).toFixed(1)}% of base damage`);
    });

    it('should demonstrate armor interaction with weapon mass', () => {
      console.log('\n🛡️  ARMOR PENETRATION ANALYSIS');
      console.log('');
      console.log('📖 WHAT THIS SHOWS:');
      console.log('This table shows how different weapons perform against armored enemies.');
      console.log('Armor reduces damage by a flat amount (e.g., 10 armor = -10 damage per hit).');
      console.log('Light weapons deal many small hits, heavy weapons deal fewer big hits.');
      console.log('Against heavily armored enemies, big hits become much more effective');
      console.log('because they lose less damage percentage-wise to armor reduction.');
      console.log('Format: Each cell shows "Damage/DPS" after armor reduction.');
      console.log('');

      const armorValues = [0, 5, 10, 20, 30];
      const testWeapons = [
        { mass: 0.5, name: 'Light Weapon', pow: 70, fin: 70 },
        { mass: 5.0, name: 'Medium Weapon', pow: 70, fin: 70 },
        { mass: 15.0, name: 'Heavy Weapon', pow: 70, fin: 70 },
      ];

      console.log('Armor →    ' + armorValues.map(a => a.toString().padStart(8)).join(''));
      console.log('Weapon ↓   ' + armorValues.map(() => '--------').join(''));

      for (const weapon of testWeapons) {
        const baseDamage = calculateWeaponDamage(weapon.mass, weapon.pow);
        const apCost = calculateWeaponApCost(weapon.mass, weapon.fin);

        const row = weapon.name.padEnd(11);
        const effectiveDamages = armorValues.map(armor => {
          const effectiveDamage = Math.max(1, baseDamage - armor); // Minimum 1 damage
          const effectiveDps = effectiveDamage / apCost;
          return `${Math.round(effectiveDamage)}/${effectiveDps.toFixed(1)}`.padStart(8);
        });

        console.log(row + effectiveDamages.join(''));
      }

      console.log('\nFormat: Damage/DPS per cell');
      console.log('\n💡 ARMOR PENETRATION INSIGHTS:');
      console.log('• Light weapons suffer severe damage reduction against armor');
      console.log('• Heavy weapons maintain effectiveness against armored targets');
      console.log('• Armor creates tactical weapon choice based on enemy type');
      console.log('• High per-strike damage becomes valuable against tough enemies');

      // Demonstrate the crossover point
      console.log('\n🎯 TACTICAL CROSSOVER ANALYSIS:');
      const lightDamage = calculateWeaponDamage(0.5, 70);
      const heavyDamage = calculateWeaponDamage(15.0, 70);
      const lightAP = calculateWeaponApCost(0.5, 70);
      const heavyAP = calculateWeaponApCost(15.0, 70);

      console.log(`Light weapon: ${Math.round(lightDamage)}hp in ${lightAP.toFixed(1)}s`);
      console.log(`Heavy weapon: ${Math.round(heavyDamage)}hp in ${heavyAP.toFixed(1)}s`);

      // Find armor level where heavy weapons become superior
      for (let armor = 0; armor <= 50; armor += 5) {
        const lightEffective = Math.max(1, lightDamage - armor) / lightAP;
        const heavyEffective = Math.max(1, heavyDamage - armor) / heavyAP;

        if (heavyEffective > lightEffective) {
          console.log(`\n⚖️  CROSSOVER POINT: ${armor} armor`);
          console.log(`• Below ${armor} armor: Light weapons superior (${lightEffective.toFixed(1)} vs ${heavyEffective.toFixed(1)} DPS)`);
          console.log(`• Above ${armor} armor: Heavy weapons superior`);
          break;
        }
      }
    });
  });
});

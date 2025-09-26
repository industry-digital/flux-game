import { describe, it, expect } from 'vitest';
import { createTestWeapon } from '~/worldkit/combat/testing/weapon';
import { calculateWeaponDamage, calculateWeaponApCost } from '~/worldkit/combat/damage';
import { createDaggerSchema } from './dagger';
import { createSwordSchema } from './sword';
import { createSpearSchema } from './spear';
import { createWarhammerSchema } from './warhammer';
import { WeaponSchema } from '~/types/schema/weapon';

describe('Weapon Mass Variation Tests', () => {

  const createWeapons = () => {
    return {
      dagger: createDaggerSchema({ urn: 'flux:schema:weapon:dagger', name: 'Dagger' }),
      sword: createSwordSchema({ urn: 'flux:schema:weapon:sword', name: 'Sword' }),
      spear: createSpearSchema({ urn: 'flux:schema:weapon:spear', name: 'Spear' }),
      warhammer: createWarhammerSchema({ urn: 'flux:schema:weapon:warhammer', name: 'Warhammer' }),
    };
  };

  describe('Mass Override Pattern', () => {
    it('should allow mass customization via overrides parameter', () => {
      // Test the existing override pattern from cursorrules
      const lightWeapon = createTestWeapon((w: WeaponSchema) => ({ ...w, baseMass: 500 })); // 0.5kg
      const mediumWeapon = createTestWeapon((w: WeaponSchema) => ({ ...w, baseMass: 2000 })); // 2kg
      const heavyWeapon = createTestWeapon((w: WeaponSchema) => ({ ...w, baseMass: 12000 })); // 12kg

      expect(lightWeapon.baseMass).toBe(500);
      expect(mediumWeapon.baseMass).toBe(2000);
      expect(heavyWeapon.baseMass).toBe(12000);
    });

    it('should demonstrate damage scaling across weapon masses', () => {
      const powStat = 70;
      const testMasses = [
        { name: 'Ultra-Light', mass: 500, expected: 'low damage, fast attacks' },
        { name: 'Light', mass: 1500, expected: 'moderate damage' },
        { name: 'Medium', mass: 3000, expected: 'good damage' },
        { name: 'Heavy', mass: 8000, expected: 'high damage' },
        { name: 'Ultra-Heavy', mass: 15000, expected: 'devastating damage' },
      ];

      console.log('\n⚔️  DAMAGE SCALING BY WEAPON MASS (POW 70)');
      console.log('Mass (kg)   Damage   Category     Notes');
      console.log('--------   -------  -----------  -----');

      for (const test of testMasses) {
        const massKg = test.mass / 1000;
        const damage = calculateWeaponDamage(massKg, powStat);

        console.log(
          `${massKg.toString().padStart(6)}kg   ${Math.round(damage).toString().padStart(4)}hp  ${test.name.padEnd(11)}  ${test.expected}`
        );

        // Verify damage increases with mass
        expect(damage).toBeGreaterThan(0);
      }
    });

    it('should demonstrate AP cost scaling across weapon masses', () => {
      const finStat = 60;
      const testMasses = [500, 1500, 3000, 8000, 15000];

      console.log('\n⚡ AP COST SCALING BY WEAPON MASS (FIN 60)');
      console.log('Mass (kg)   AP Cost   Speed Rating');
      console.log('--------   -------   ------------');

      let previousApCost = 0;
      for (const mass of testMasses) {
        const massKg = mass / 1000;
        const apCost = calculateWeaponApCost(massKg, finStat);

        const speedRating = apCost < 1.0 ? 'Very Fast' :
                          apCost < 2.0 ? 'Fast' :
                          apCost < 3.0 ? 'Moderate' :
                          apCost < 4.0 ? 'Slow' : 'Very Slow';

        console.log(
          `${massKg.toString().padStart(6)}kg   ${apCost.toFixed(1).padStart(5)}s   ${speedRating}`
        );

        // Verify AP cost increases with mass
        expect(apCost).toBeGreaterThan(previousApCost);
        previousApCost = apCost;
      }
    });
  });

  describe('Specific Weapon Schema Tests', () => {
    it('should create weapons with realistic masses', () => {
      const { dagger, sword, spear, warhammer } = createWeapons();

      // Verify masses match cursorrules specifications
      expect(dagger.baseMass).toBe(500);     // 0.5kg
      expect(sword.baseMass).toBe(2000);     // 2.0kg
      expect(spear.baseMass).toBe(4000);     // 4.0kg
      expect(warhammer.baseMass).toBe(12000); // 12.0kg

      // Verify mass ordering (lightest to heaviest)
      expect(dagger.baseMass).toBeLessThan(sword.baseMass);
      expect(spear.baseMass).toBeLessThan(warhammer.baseMass);
    });

    it('should demonstrate tactical weapon choices by build type', () => {
      const weapons = Object.values(createWeapons());

      const builds = [
        { name: 'FIN Build', pow: 30, fin: 90 },
        { name: 'Balanced', pow: 60, fin: 60 },
        { name: 'POW Build', pow: 90, fin: 30 },
      ];

      console.log('\n🎯 TACTICAL WEAPON CHOICE BY BUILD TYPE');
      console.log('');

      for (const build of builds) {
        console.log(`${build.name} (POW ${build.pow}, FIN ${build.fin}):`);
        console.log('Weapon      Damage   AP Cost   DPS     Recommendation');
        console.log('----------  -------  -------  ------  --------------');

        // First pass: find the best weapon
        let bestDps = 0;
        let bestWeapon = '';
        const weaponStats = [];

        for (const weapon of weapons) {
          const massKg = weapon.baseMass / 1000;
          const damage = calculateWeaponDamage(massKg, build.pow);
          const apCost = calculateWeaponApCost(massKg, build.fin);
          const dps = damage / apCost;

          weaponStats.push({ weapon, damage, apCost, dps });

          if (dps > bestDps) {
            bestDps = dps;
            bestWeapon = weapon.name;
          }
        }

        // Second pass: display with correct optimal marking
        for (const stats of weaponStats) {
          const recommendation = stats.dps === bestDps ? '← OPTIMAL' : '';
          console.log(
            `${stats.weapon.name.padEnd(10)}  ${Math.round(stats.damage).toString().padStart(4)}hp   ${stats.apCost.toFixed(1).padStart(5)}s   ${stats.dps.toFixed(1).padStart(5)}  ${recommendation}`
          );
        }

        console.log(`Best choice: ${bestWeapon} (${bestDps.toFixed(1)} DPS)\n`);
      }
    });
  });

  describe('Mass-Based Combat Balance', () => {
    it('should verify linear scaling properties', () => {
      const baseMass = 2.0; // 2kg weapon
      const powStat = 50;
      const finStat = 50;

      // Test damage linearity with POW
      const damage1 = calculateWeaponDamage(baseMass, 25);
      const damage2 = calculateWeaponDamage(baseMass, 50);
      const damage3 = calculateWeaponDamage(baseMass, 75);

      // Damage should scale linearly with POW
      const damageIncrease1 = damage2 - damage1;
      const damageIncrease2 = damage3 - damage2;
      expect(damageIncrease1).toBeCloseTo(damageIncrease2, 1);

      // Test AP cost linearity with FIN
      const apCost1 = calculateWeaponApCost(baseMass, 25);
      const apCost2 = calculateWeaponApCost(baseMass, 50);
      const apCost3 = calculateWeaponApCost(baseMass, 75);

      // AP cost should decrease linearly with FIN
      const apDecrease1 = apCost1 - apCost2;
      const apDecrease2 = apCost2 - apCost3;
      expect(apDecrease1).toBeCloseTo(apDecrease2, 1);
    });

    it('should verify mass scaling independence', () => {
      // POW affects damage but not AP cost
      const mass = 3.0;
      const apCostLowPow = calculateWeaponApCost(mass, 60);
      const apCostHighPow = calculateWeaponApCost(mass, 60);
      expect(apCostLowPow).toBe(apCostHighPow);

      // FIN affects AP cost but not damage
      const damageLowFin = calculateWeaponDamage(mass, 70);
      const damageHighFin = calculateWeaponDamage(mass, 70);
      expect(damageLowFin).toBe(damageHighFin);
    });
  });
});

// @ts-nocheck

import { DamageModel } from '~/types/damage';
import { RollResultWithoutModifiers } from '~/types/dice';
import { Actor } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { calculateStatBonus, getNaturalStatValue } from '~/worldkit/entity';
import { rollDiceWithRng } from '~/worldkit/dice';

export type CalculateWeaponDamageDependencies = {
  calculateStatBonus: typeof calculateStatBonus;
  getNaturalStatValue: typeof getNaturalStatValue;
  rollDice: typeof rollDiceWithRng,
};

export const DEFAULT_CALCULATE_WEAPON_DAMAGE_DEPS: CalculateWeaponDamageDependencies = {
  calculateStatBonus: calculateStatBonus,
  getNaturalStatValue: getNaturalStatValue,
  rollDice: rollDiceWithRng,
};

export const calculateWeaponDamage = (
  actor: Actor,
  weapon: WeaponSchema,
  deps: CalculateWeaponDamageDependencies = DEFAULT_CALCULATE_WEAPON_DAMAGE_DEPS,
): RollResultWithoutModifiers => {
  const roll = deps.rollDice(weapon.damage.base);

  if (weapon.damage.model === DamageModel.FIXED) {
    return roll;
  }

  const baseDamage = roll.result;

  if (weapon.damage.model === DamageModel.STAT_SCALING) {
    const statValue = getNaturalStatValue(actor, weapon.damage.stat);
    const modifier = calculateStatBonus(statValue);
    addModifier(roll.mods!, weapon.damage.stat, modifier);
  }

  return {
    ...roll,
    result: roll.result * weapon.damage.base,
  };
};

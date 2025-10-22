/**
 * Damage resolution functions for weapons
 */
import { DamageModel } from '~/types/damage';
import { RollResult, RollResultWithoutModifiers, RollSpecification } from '~/types/dice';
import { Actor } from '~/types/entity/actor';
import { WeaponSchema, WeaponTimer } from '~/types/schema/weapon';
import { URNLike } from '~/types/taxonomy';
import { calculateWeaponApCost } from '~/worldkit/combat/ap';
import { getWeaponBaseDamage } from '~/worldkit/combat/damage/damage-type';
import { applyModifierToRollResult, calculateAverageRollResult, rollDiceWithRng } from '~/worldkit/dice';
import { getStatValue, MAX_STAT_VALUE } from '~/worldkit/entity';

export type CalculateWeaponDamageDependencies = {
  rollDice: (dice: RollSpecification) => RollResultWithoutModifiers;
  timestamp: () => number;
};

export const DEFAULT_CALCULATE_WEAPON_DAMAGE_DEPS: CalculateWeaponDamageDependencies = {
  rollDice: (dice) => rollDiceWithRng(dice, () => Math.random()),
  timestamp: () => Date.now(),
};

/**
 * Given an actor and a weapon, what is the average damage the weapon deals, *per hit*?
 */
export const calculateAverageWeaponDamagePerHit = (
  actor: Actor,
  weapon: WeaponSchema,
): number => {
  const baseDamage = getWeaponBaseDamage(weapon);
  const averageBaseDamage = calculateAverageRollResult(baseDamage);

  if (weapon.damage?.model !== DamageModel.STAT_SCALING) {
    return averageBaseDamage;
  }

  // Fell through, so the weapon scales with a stat
  const scalingStatValue = getStatValue(actor, weapon.damage.stat);
  const damageBonus = (scalingStatValue / MAX_STAT_VALUE) * weapon.damage.efficiency;
  return averageBaseDamage + damageBonus;
};

/**
 * Calculate weapon damage using linear POW scaling
 * Heavy weapons get more benefit from POW investment
 */
export function rollWeaponDamage(
  actor: Actor,
  weapon: WeaponSchema,
  deps: CalculateWeaponDamageDependencies = DEFAULT_CALCULATE_WEAPON_DAMAGE_DEPS,
): RollResult {
  const baseDamageRoll = deps.rollDice(getWeaponBaseDamage(weapon));

  if (weapon.damage.model === DamageModel.FIXED) {
    return baseDamageRoll;
  }

  const scalingStatValue = getStatValue(actor, weapon.damage.stat);
  const damageBonus = (scalingStatValue / MAX_STAT_VALUE) * weapon.damage.efficiency;
  const modifierId: URNLike = `stat:${weapon.damage.stat}`;

  applyModifierToRollResult(baseDamageRoll, modifierId, {
    origin: modifierId,
    value: damageBonus,
    duration: -1,
    ts: deps.timestamp(),
  });

  return baseDamageRoll;
}

/**
 * Calculate turn-based DPS (Damage Per 6-Second Turn)
 * Shows average damage output over a standard combat turn
 */
export function calculateWeaponDps(
  actor: Actor,
  weapon: WeaponSchema,
): number {
  const damage = calculateAverageWeaponDamagePerHit(actor, weapon);
  const apCost = calculateWeaponApCost(actor, weapon, WeaponTimer.ATTACK);
  return damage / apCost;
}

export type WeaponAnalysis = {
  /**
   * Damage per hit
   */
  damage: number;

  /**
   * AP cost per hit
   */
  apCost: number;

  /**
   * DPS if ammo is not a consraint (i.e. actor can keep shooting indefinitely)
   */
  dps: number;
};

/**
 * Complete weapon analysis for given mass and stats
 */
export function analyzeWeapon(
  actor: Actor,
  weapon: WeaponSchema,
  output: WeaponAnalysis = {
    damage: 0,
    apCost: 0,
    dps: 0,
  },
): WeaponAnalysis {
  const avgDamage = calculateAverageWeaponDamagePerHit(actor, weapon);
  const apCost = calculateWeaponApCost(actor, weapon, WeaponTimer.ATTACK);
  const dps = avgDamage / apCost;

  output.damage = avgDamage;
  output.apCost = apCost;
  output.dps = dps;

  return output;
}

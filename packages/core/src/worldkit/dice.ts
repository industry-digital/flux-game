import { RollApi, RollApiDependencies, RollResult, RollResultWithoutModifiers, RollSpecification } from '~/types/dice';
import { Actor } from '~/types/entity/actor';
import { AppliedModifiers, Modifier } from '~/types/modifier';
import { addModifier, computeSumOfModifiers } from '~/worldkit/entity/modifier';
import { WeaponSchema, AccuracyModel } from '~/types/schema/weapon';
import { SkillSchema } from '~/types/schema/skill';
import { DamageModel, StatScalingDamageSpecification } from '~/types/damage';
import { getActorSkill, getEffectiveSkillRank } from '~/worldkit/entity/actor/skill';
import { getNaturalStatValue, calculateStatBonus } from '~/worldkit/entity/actor/stats';
import { ATTACK_SKILL_MULTIPLIER } from '~/worldkit/combat/attack';
import { getWeaponBaseDamage } from '~/worldkit/combat/damage/damage-type';

type ParsedRollSpecification = {
  numDice: number;
  dieSize: number;
  flatBonus: number;
}

const INTERNAL_PARSED_ROLL_SPECIFICATION: ParsedRollSpecification = {
  numDice: 0,
  dieSize: 0,
  flatBonus: 0,
};

function parseRollSpecification(
  spec: RollSpecification,
  output: ParsedRollSpecification = INTERNAL_PARSED_ROLL_SPECIFICATION,
): ParsedRollSpecification {
  output.numDice = 0;
  output.dieSize = 0;
  output.flatBonus = 0;

  let state = 0; // 0=numDice, 1=dieSize, 2=flatBonus
  let numDice = 0;
  let dieSize = 0;
  let flatBonus = 0;
  let hasDigits = false;

  for (let i = 0; i < spec.length; i++) {
    const char = spec[i];
    const code = spec.charCodeAt(i);

    if (code >= 48 && code <= 57) { // '0' to '9'
      hasDigits = true;
      const digit = code - 48;

      if (state === 0) {
        numDice = numDice * 10 + digit;
      } else if (state === 1) {
        dieSize = dieSize * 10 + digit;
      } else { // state === 2
        flatBonus = flatBonus * 10 + digit;
      }
    } else if (char === 'd') {
      if (state !== 0 || !hasDigits || numDice === 0) {
        throw new Error(`Invalid roll specification: ${spec}`);
      }
      state = 1;
      hasDigits = false;
    } else if (char === '+') {
      if (state !== 1 || !hasDigits || dieSize === 0) {
        throw new Error(`Invalid roll specification: ${spec}`);
      }
      state = 2;
      hasDigits = false;
    } else {
      throw new Error(`Invalid roll specification: ${spec}`);
    }
  }

  // Final validation
  if (state === 0 || !hasDigits || (state === 1 && dieSize === 0) || (state === 2 && flatBonus === 0)) {
    throw new Error(`Invalid roll specification: ${spec}`);
  }

  output.numDice = numDice;
  output.dieSize = dieSize;
  output.flatBonus = flatBonus;

  return output;
}


export function rollDiceWithRng(
  dice: RollSpecification,
  rng: () => number,

  // Consumers may opt into reusing the same output object for performance
  output: RollResultWithoutModifiers = {
    values: [],
    dice,
    natural: 0,
    bonus: 0,
    result: 0,
  },
): RollResultWithoutModifiers {
  const { numDice, dieSize, flatBonus } = parseRollSpecification(dice);

  // Reset output object
  output.dice = dice;
  output.values.length = numDice;
  output.natural = 0;
  output.bonus = flatBonus;

  // Roll the dice
  let sum = 0;
  for (let i = 0; i < numDice; i++) {
    const value = Math.floor(rng() * dieSize) + 1;
    output.values[i] = value;
    sum += value;
  }

  output.natural = sum;
  output.result = sum + output.bonus; // Base result without modifiers

  return output;
}

/**
 * Apply a single modifier to a roll result.
 * **Directly mutates the roll object.**
 */
export function applyModifierToRollResult(
  roll: RollResult,
  modifierId: string,
  modifier: Modifier,
  rng: () => number = Math.random,
): void {
  roll.mods ??= {};

  addModifier(roll.mods, modifierId, modifier);

  // Update result
  roll.result = roll.natural + roll.bonus + computeSumOfModifiers(roll.mods);
}

/**
 * Apply multiple modifiers to a roll result.
 * Directly mutates the roll object.
 */
export function applyModifiersToRollResult(
  roll: RollResult,
  modifiers: AppliedModifiers,
  rng: () => number = Math.random,
): void {
  roll.mods ??= {};

  // Add each modifier directly
  for (const modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    roll.mods[modifierId] = modifier;
  }

  // Update result once at the end
  roll.result = roll.natural + roll.bonus + computeSumOfModifiers(roll.mods);
}

export const DEFAULT_ROLL_API_DEPS: RollApiDependencies = Object.freeze({
  random: () => Math.random(),
  timestamp: () => Date.now(),
  getActorSkill,
  getEffectiveSkillRank,
  getNaturalStatValue,
  calculateStatBonus,
  getWeaponBaseDamage,
  rollDiceWithRng,
});

export const createRollApi = (deps: RollApiDependencies = DEFAULT_ROLL_API_DEPS): RollApi => {
  const rollWeaponAccuracy = (actor: Actor, weapon: WeaponSchema): RollResult => {
    // Roll base dice using weapon's accuracy specification
    const rollResult: RollResult = deps.rollDiceWithRng(weapon.accuracy.base, deps.random);

    // Calculate and apply skill bonus based on accuracy model
    if (weapon.accuracy.model === AccuracyModel.SKILL_SCALING) {
      const skillState = deps.getActorSkill(actor, weapon.accuracy.skill);
      const effectiveSkillRank = deps.getEffectiveSkillRank(actor, weapon.accuracy.skill, skillState);

      // Apply skill multiplier to get bonus (0-80 points for 0-100 skill rank)
      const skillBonus = effectiveSkillRank * ATTACK_SKILL_MULTIPLIER;

      // Add skill bonus as a modifier
      const skillModifier: Modifier = {
        origin: `skill:${weapon.accuracy.skill}`,
        value: skillBonus,
        duration: -1, // Permanent modifier
        ts: deps.timestamp(),
      };

      applyModifierToRollResult(rollResult, `skill:${weapon.accuracy.skill}`, skillModifier);
    } else {
      throw new Error(`Unsupported accuracy model: ${weapon.accuracy.model}`);
    }

    return rollResult;
  };

  const rollWeaponDamage = (actor: Actor, weapon: WeaponSchema): RollResult => {
    // Roll base dice using weapon's damage specification
    const rollResult: RollResult = rollDiceWithRng(getWeaponBaseDamage(weapon), deps.random);

    // Apply damage model-specific modifiers
    if (weapon.damage.model === DamageModel.FIXED) {
      // Fixed damage: no additional modifiers needed
      return rollResult;
    }

    if (weapon.damage.model === DamageModel.STAT_SCALING) {
      // Stat-based damage: stat bonus calculation depends on weapon type
      const statScalingDamage = weapon.damage as StatScalingDamageSpecification;
      const statValue = deps.getNaturalStatValue(actor, statScalingDamage.stat);
      const statBonus = deps.calculateStatBonus(statValue);

      let finalBonus: number;

      const isRangedWeapon = weapon.range.falloff !== undefined;

      // Check if weapon is ranged (has falloff) or melee (no falloff)
      if (isRangedWeapon) {
        // Ranged weapon: mass doesn't factor into damage, only stat and mass effect
        finalBonus = statBonus * statScalingDamage.efficiency;
      } else {
        // Melee weapon: mass amplifies stat bonus
        const weaponMassKg = weapon.baseMass / 1000;
        finalBonus = statBonus * weaponMassKg * statScalingDamage.efficiency;
      }

      // Add stat modifier to the roll
      const statModifier: Modifier = {
        origin: `stat:${statScalingDamage.stat}`,
        value: finalBonus,
        duration: -1, // Permanent modifier
        ts: deps.timestamp(),
      };

      applyModifierToRollResult(rollResult, `stat:${statScalingDamage.stat}`, statModifier);
      return rollResult;
    }

    throw new Error(`Unsupported damage model: ${(weapon.damage as any).model}`);
  };

  const rollSkillCheck = (actor: Actor, skill: SkillSchema): RollResult => {
    throw new Error();
  };

  return {
    rollWeaponAccuracy,
    rollWeaponDamage,
    rollSkillCheck,
  };
};

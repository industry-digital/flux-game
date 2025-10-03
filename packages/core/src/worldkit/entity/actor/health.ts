import { NormalizedValueBetweenZeroAndOne } from '~/types';
import { Actor, Stat } from '~/types/entity/actor';
import { calculateStatBonus } from '../stats';
import { getActorEffectiveStatValue } from './actor-stats';

/**
 * Base HP value before RES modifiers
 */
export const BASE_HP = 50;

/**
 * HP gained per point of RES bonus
 */
export const HP_PER_RES_BONUS = 5;

/**
 * Get current HP value
 */
export const getCurrentHp = (actor: Actor): number => {
  return actor.hp.eff.cur;
};

/**
 * Get maximum HP value
 */
export const getMaxHp = (actor: Actor): number => {
  return actor.hp.eff.max;
};

/**
 * Check if actor is alive (HP > 0)
 */
export const isAlive = (actor: Actor): boolean => {
  return actor.hp.eff.cur > 0;
};

/**
 * Check if actor is dead (HP <= 0)
 */
export const isDead = (actor: Actor): boolean => {
  return actor.hp.eff.cur <= 0;
};

/**
 * Get health as percentage (0-1)
 */
export const getHealthPercentage = (actor: Actor): NormalizedValueBetweenZeroAndOne => {
  const maxHp = actor.hp.eff.max;
  if (maxHp === 0) return 0;
  return actor.hp.eff.cur / maxHp;
};

/**
 * Set current HP directly
 */
export const setCurrentHp = (actor: Actor, value: number): void => {
  const clampedValue = Math.max(0, Math.min(value, getMaxHp(actor)));
  actor.hp.nat.cur = clampedValue;
  actor.hp.eff.cur = clampedValue;
};

/**
 * Set maximum HP directly
 */
export const setMaxHp = (actor: Actor, value: number): void => {
  const newMax = Math.max(0, value);
  actor.hp.nat.max = newMax;
  actor.hp.eff.max = newMax;
  // Ensure current doesn't exceed new max
  if (getCurrentHp(actor) > newMax) {
    setCurrentHp(actor, newMax);
  }
};

/**
 * Reduce current HP by amount
 */
export const decrementHp = (actor: Actor, amount: number): void => {
  const newValue = getCurrentHp(actor) - Math.abs(amount);
  setCurrentHp(actor, newValue);
};

/**
 * Increase current HP by amount (capped at max)
 */
export const incrementHp = (actor: Actor, amount: number): void => {
  const newValue = getCurrentHp(actor) + Math.abs(amount);
  setCurrentHp(actor, newValue);
};

/**
 * Set HP as percentage of maximum
 * Directly mutates the actor's HP state
 */
export const setHealthPercentage = (actor: Actor, percentage: NormalizedValueBetweenZeroAndOne): void => {
  const clampedPercentage = Math.max(0, Math.min(1, percentage));
  const newHp = getMaxHp(actor) * clampedPercentage;
  setCurrentHp(actor, newHp);
};

/**
 * Restore HP to maximum
 * Directly mutates the actor's HP state
 */
export const restoreHpToMax = (actor: Actor): void => {
  setCurrentHp(actor, getMaxHp(actor));
};

/**
 * Get the RES stat bonus used for HP calculation
 */
export const getResBonus = (actor: Actor): number => {
  const resilience = getActorEffectiveStatValue(actor, Stat.RES);
  return calculateStatBonus(resilience);
};

/**
 * Calculate maximum HP based on RES stat
 */
export const calculateMaxHpFromRes = (actor: Actor): number => {
  const resBonus = getResBonus(actor);
  return BASE_HP + (resBonus * HP_PER_RES_BONUS);
};

/**
 * Update maximum HP based on current RES stat
 * This directly mutates the actor's HP state
 */
export const updateMaxHpFromRes = (actor: Actor): void => {
  const newMaxHp = calculateMaxHpFromRes(actor);
  setMaxHp(actor, newMaxHp);
};

/**
 * Initialize actor HP based on RES stat (useful for new actors)
 * This directly mutates the actor's HP state
 */
export const initializeHpFromRes = (actor: Actor): void => {
  const maxHp = calculateMaxHpFromRes(actor);
  setMaxHp(actor, maxHp);
  setCurrentHp(actor, maxHp); // Start at full health
};

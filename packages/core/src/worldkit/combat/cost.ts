/**
 * Shared Combat Action Cost Calculations
 *
 * Pure functions for calculating AP and energy costs for combat actions.
 * Used by both the intent parser (for upfront cost display) and action
 * implementations (for actual execution).
 */

import { Actor } from '~/types/entity/actor';
import { FullyQualifiedActionCost } from '~/types/combat';
import { distanceToAp } from '~/worldkit/physics/movement';
import { calculateMovementEnergyCost } from '~/worldkit/combat/energy-costs';
import { MovementType } from '~/worldkit/combat/combatant';
import { roundApCostUp } from '~/worldkit/combat/tactical-rounding';

/**
 * Calculate AP and energy costs for movement actions (ADVANCE/RETREAT)
 */
export function calculateMovementCosts(
  actor: Actor,
  movementType: MovementType,
  movementValue: number,
  computeActorMass: (actor: Actor) => number
): FullyQualifiedActionCost {
  const power = actor.stats.pow.eff;
  const finesse = actor.stats.fin.eff;
  const massGrams = computeActorMass(actor);
  const massKg = massGrams / 1000;

  let apCost: number;
  let distance: number;

  if (movementType === 'ap') {
    // If movement is specified in AP, apply tactical rounding
    apCost = roundApCostUp(movementValue);
    // We need distance to calculate energy cost, so derive it from AP
    // This is an approximation since we don't have the exact distance
    // For now, we'll estimate based on average movement efficiency
    distance = movementValue * 3; // Rough approximation: 1 AP ≈ 3m for average stats
  } else {
    // Calculate AP cost based on distance, then apply tactical rounding
    distance = movementValue;
    const preciseApCost = distanceToAp(power, finesse, distance, massKg);
    apCost = roundApCostUp(preciseApCost);
  }

  // Calculate energy cost based on distance
  const energyCost = calculateMovementEnergyCost(power, finesse, distance, massKg);

  return { ap: apCost, energy: energyCost };
}

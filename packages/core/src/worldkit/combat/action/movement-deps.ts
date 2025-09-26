/**
 * Shared Movement Action Dependencies
 *
 * Common dependencies for ADVANCE and RETREAT actions since they're
 * essentially the same movement mechanics in opposite directions.
 */

import { createWorldEvent } from '~/worldkit/event';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { calculateTacticalMovement, roundPosition } from '~/worldkit/combat/tactical-rounding';
import { createMovementCostFromDistance, createMovementCostFromAp } from '~/worldkit/combat/tactical-cost';

export type MovementActionDependencies = {
  createWorldEvent?: typeof createWorldEvent;
  distanceToAp?: typeof distanceToAp;
  apToDistance?: typeof apToDistance;
  calculateTacticalMovement?: typeof calculateTacticalMovement;
  roundPosition?: typeof roundPosition;
  createMovementCostFromDistance?: typeof createMovementCostFromDistance;
  createMovementCostFromAp?: typeof createMovementCostFromAp;
};

export const DEFAULT_MOVEMENT_DEPS: MovementActionDependencies = {
  createWorldEvent,
  distanceToAp,
  apToDistance,
  calculateTacticalMovement,
  roundPosition,
  createMovementCostFromDistance,
  createMovementCostFromAp,
};

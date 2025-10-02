import { Actor } from '~/types/entity/actor';
import { Narrative } from '~/types/narrative';
import { BattlefieldPositionSummary, CombatFacing } from '~/types/combat';

const ADVANCE = 'advance';
const RETREAT = 'retreat';
const FORWARD = 'forward';
const BACKWARD = 'backward';

/**
 * Generates narrative for COMBATANT_DID_MOVE events
 */
export const renderMovementNarrative = (
  actor: Actor,
  from: BattlefieldPositionSummary,
  to: BattlefieldPositionSummary,
  distance: number
): Narrative => {
  // Determine actual movement direction based on coordinate change
  const coordinateChange = to.coordinate - from.coordinate;

  // Determine if this is advancing or retreating based on facing direction
  // If facing RIGHT (1) and moving right (+), or facing LEFT (-1) and moving left (-), it's advancing
  // If facing RIGHT (1) and moving left (-), or facing LEFT (-1) and moving right (+), it's retreating
  const isAdvancing = (from.facing === CombatFacing.RIGHT && coordinateChange > 0) ||
                     (from.facing === CombatFacing.LEFT && coordinateChange < 0);

  const actionVerb = isAdvancing ? ADVANCE : RETREAT;
  const direction = isAdvancing ? FORWARD : BACKWARD;

  // Generate contextual narrative based on movement type and distance
  if (distance >= 10) {
    // Long distance movement
    return {
      self: `You ${actionVerb} ${distance}m across the battlefield.`,
      observer: `${actor.name} moves ${direction} ${distance}m across the battlefield.`
    };
  }

  if (distance >= 5) {
    // Medium distance movement
    return {
      self: `You ${actionVerb} ${distance}m, repositioning yourself tactically.`,
      observer: `${actor.name} ${actionVerb}s ${distance}m, repositioning tactically.`
    };
  }

  // Short distance movement
  return {
    self: `You ${actionVerb} ${distance}m, adjusting your position.`,
    observer: `${actor.name} ${actionVerb}s ${distance}m, adjusting position.`
  };
};

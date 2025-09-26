/**
 * Combat Movement Logic
 *
 * Pure functions for target resolution and collision detection in combat scenarios.
 * Designed for zero-copy performance and functional composition.
 */

import { ActorURN } from '~/types/taxonomy';
import { Combatant, CombatFacing } from '~/types/combat';
import { areEnemies } from '~/worldkit/combat/team';

export type TargetResolutionResult =
  | { success: true; targetPosition: number; shouldTurn: boolean }
  | { success: false; error: string };

export type CollisionResult =
  | { success: true; finalPosition: number }
  | { success: false; error: string; finalPosition: number };

/**
 * Factory function for target resolution logic
 * Returns a pure function that resolves movement targets
 */
export function createTargetResolver(
  combatants: Map<ActorURN, Combatant>,
  actor: { id: ActorURN },
  combatant: Combatant
) {
  return function resolveTarget(target?: ActorURN): TargetResolutionResult {
    if (!target) {
      // Move forward in current facing direction
      const currentPosition = combatant.position.coordinate;
      const facing = combatant.position.facing;

      // Calculate target position based on facing direction
      // Use a large distance to ensure movement continues until boundary/collision stops it
      const forwardDistance = 1000; // Large enough to reach any battlefield boundary
      const targetPosition = facing === CombatFacing.RIGHT
        ? currentPosition + forwardDistance
        : currentPosition - forwardDistance;

      return {
        success: true,
        targetPosition,
        shouldTurn: false // Don't change facing when moving forward
      };
    }

    // Explicit target specified
    const targetCombatant = combatants.get(target);
    if (!targetCombatant) {
      const availableTargets: string[] = [];
      for (const [actorId] of combatants) {
        if (actorId !== actor.id) {
          availableTargets.push(actorId);
        }
      }
      return {
        success: false,
        error: `Target '${target}' not found on battlefield. Available targets: ${availableTargets.join(', ')}`
      };
    }

    return {
      success: true,
      targetPosition: targetCombatant.position.coordinate,
      shouldTurn: true // Auto-turn when explicit target specified
    };
  };
}

export function checkCollisions2(
  combatants: Map<ActorURN, Combatant>,
  actor: { id: ActorURN },
  combatant: Combatant,
  from: number,
  to: number
): CollisionResult {
  const direction = to > from ? CombatFacing.RIGHT : CombatFacing.LEFT;

  // Check for enemy collisions (1m minimum separation) using zero-copy iteration
  for (const [actorId, otherCombatant] of combatants) {
    if (actorId === actor.id) continue;

    const otherPosition = otherCombatant.position.coordinate;
    const isEnemy = areEnemies(actor.id, actorId, combatants);

    if (isEnemy) {
      // Check if path crosses enemy position
      const minPos = Math.min(from, to);
      const maxPos = Math.max(from, to);

      if (otherPosition >= minPos && otherPosition <= maxPos) {
        // Collision with enemy - stop 1m away
        const stopPosition = otherPosition - (direction * 1);
        const actualDistance = Math.abs(stopPosition - from);

        return {
          success: false,
          error: `Movement blocked by enemy ${actorId} at position ${otherPosition}m. You can advance ${actualDistance}m and stop 1m away`,
          finalPosition: stopPosition
        };
      }
    }
    // Friendly units: pass through freely (no collision check needed)
  }

  return { success: true, finalPosition: to };
}

/**
 * Factory function for collision detection logic
 * Returns a pure function that checks for movement collisions
 */
export function createCollisionDetector(
  combatants: Map<ActorURN, Combatant>,
  actor: { id: ActorURN },
  combatant: Combatant
) {
  return function checkCollisions(from: number, to: number): CollisionResult {
    const direction = to > from ? 1 : -1;

    // Check for enemy collisions (1m minimum separation) using zero-copy iteration
    for (const [actorId, otherCombatant] of combatants) {
      if (actorId === actor.id) continue;

      const otherPosition = otherCombatant.position.coordinate;
      const isEnemy = areEnemies(actor.id, actorId, combatants);

      if (isEnemy) {
        // Check if path crosses enemy position
        const minPos = Math.min(from, to);
        const maxPos = Math.max(from, to);

        if (otherPosition >= minPos && otherPosition <= maxPos) {
          // Collision with enemy - stop 1m away
          const stopPosition = otherPosition - (direction * 1);
          const actualDistance = Math.abs(stopPosition - from);

          return {
            success: false,
            error: `Movement blocked by enemy ${actorId} at position ${otherPosition}m. You can advance ${actualDistance}m and stop 1m away`,
            finalPosition: stopPosition
          };
        }
      }
      // Friendly units pass through freely. Mo collision check needed.
    }

    return { success: true, finalPosition: to };
  };
}

/**
 * Utility function for finding nearest enemy position
 * Pure function for tactical analysis
 */
export function findNearestEnemyPosition(
  combatants: Map<ActorURN, Combatant>,
  actor: { id: ActorURN },
  combatant: Combatant
): number | null {
  let nearestDistance = Infinity;
  let nearestPosition: number | null = null;

  for (const [actorId, otherCombatant] of combatants) {
    if (actorId !== actor.id && areEnemies(actor.id, actorId, combatants)) {
      const distance = Math.abs(otherCombatant.position.coordinate - combatant.position.coordinate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPosition = otherCombatant.position.coordinate;
      }
    }
  }

  return nearestPosition;
}

/**
 * Utility function for counting enemies in range
 * Pure function for tactical analysis
 */
export function countEnemiesInRange(
  combatants: Map<ActorURN, Combatant>,
  actor: { id: ActorURN },
  combatant: Combatant,
  range: number
): number {
  let count = 0;
  const currentPosition = combatant.position.coordinate;

  for (const [actorId, otherCombatant] of combatants) {
    if (actorId !== actor.id && areEnemies(actor.id, actorId, combatants)) {
      const distance = Math.abs(otherCombatant.position.coordinate - currentPosition);
      if (distance <= range) {
        count++;
      }
    }
  }

  return count;
}

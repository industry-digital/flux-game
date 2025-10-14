import { useMemo } from 'react';
import type { NotationActor } from '@flux/ui';
import type { CombatSession } from '@flux/core';
import { Team } from '@flux/core';
import type { ActorURN } from '@flux/core';

export interface UseBattlefieldNotationResult {
  /**
   * Combatants formatted for battlefield notation display
   */
  notationActors: NotationActor[];

  /**
   * The subject team (always ALPHA for player perspective)
   */
  subjectTeam: string;

  /**
   * Current actor ID for highlighting
   */
  currentActor?: string;

  /**
   * Battlefield length in meters
   */
  battlefieldLength: number;
}

/**
 * Hook to transform combat session data into battlefield notation format
 */
export function useBattlefieldNotation(
  session: CombatSession | null,
  currentActorId: ActorURN | null,
  actors: Record<ActorURN, any>
): UseBattlefieldNotationResult {

  const notationData = useMemo(() => {
    if (!session) {
      return {
        notationActors: [],
        subjectTeam: Team.ALPHA,
        currentActor: undefined,
        battlefieldLength: 300,
      };
    }

    const combatants = Array.from(session.data.combatants.entries());
    const notationActors: NotationActor[] = [];


    for (const [actorId, combatant] of combatants) {
      const actor = actors[actorId];
      if (!actor) {
        console.warn(`🎯 useBattlefieldNotation: Actor ${actorId} not found in actors map`);
        continue;
      }

      // Convert team enum to string - keep original case to match Team enum values
      const teamString = typeof combatant.team === 'string'
        ? combatant.team // Keep original case (alpha/bravo)
        : combatant.team === Team.ALPHA
          ? Team.ALPHA
          : Team.BRAVO;



      // Convert facing enum to string
      const facingString: 'left' | 'right' = combatant.position.facing === 1 ? 'right' : 'left';

      const notationActor = {
        id: actorId,
        name: actor.name,
        team: teamString,
        position: combatant.position.coordinate,
        facing: facingString,
      };

      notationActors.push(notationActor);
    }

    return {
      notationActors,
      subjectTeam: Team.ALPHA, // Player perspective is always ALPHA (lowercase "alpha")
      currentActor: currentActorId || undefined,
      battlefieldLength: session.data.battlefield?.length || 300,
    };
  }, [session, currentActorId, actors]);

  return notationData;
}

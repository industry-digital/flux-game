import { ActorURN } from '~/types/taxonomy';
import { CombatSession } from '~/types/combat';
import { WorldEvent, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { TransformerContext } from '~/types/handler';
import { isAlive } from '~/worldkit/entity/actor/health';
import { WellKnownActor } from '~/types/actor';

export type AdvanceTurnCallback = (trace?: string) => WorldEvent[];

export interface TurnManager {
  advanceTurn: AdvanceTurnCallback;
}

/**
 * Creates a turn manager for handling turn and round progression in combat.
 */
export function createTurnManager(
  context: TransformerContext,
  session: CombatSession,
): TurnManager {

  /**
   * Finds the next alive combatant in the initiative order, starting from the given index.
   * Returns null if no alive combatants are found.
   */
  const findNextAliveCombatant = (initiativeOrder: ActorURN[], startIndex: number): ActorURN | null => {
    for (let i = startIndex; i < initiativeOrder.length; i++) {
      const actorId = initiativeOrder[i];
      const actor = context.world.actors[actorId];
      if (actor && isAlive(actor)) {
        return actorId;
      }
    }
    return null;
  };

  const startNewTurn = (actorId: ActorURN, roundNumber: number, turnNumber: number, trace: string = context.uniqid()): WorldEvent[] => {
    const events: WorldEvent[] = [];

    const turnStartEvent = createWorldEvent({
      type: EventType.COMBAT_TURN_DID_START,
      actor: WellKnownActor.SYSTEM,
      location: session.data.location,
      trace,
      payload: {
        sessionId: session.id,
        turnActor: actorId,
        round: roundNumber,
        turn: turnNumber,
      }
    });

    context.declareEvent(turnStartEvent);
    events.push(turnStartEvent);

    return events;
  };

  const advanceTurn: AdvanceTurnCallback = (trace: string = context.uniqid()): WorldEvent[] => {
    // Record turn advancement metrics
    context.metrics?.incrementCounter('combat.turns_advanced');

    const events: WorldEvent[] = [];

    const currentTurn = session.data.currentTurn;
    const currentRound = currentTurn.round;
    session.data.completedTurns.push(currentTurn);

    const initiativeOrder: ActorURN[] = Array.from(session.data.initiative.keys());
    const currentActorIndex = initiativeOrder.indexOf(session.data.currentTurn.actor);
    const isLastActorInRound = currentActorIndex === initiativeOrder.length - 1;

    if (isLastActorInRound) {

      const nextRoundNumber = currentTurn.round + 1;
      const firstAliveActor = findNextAliveCombatant(initiativeOrder, 0);

      if (firstAliveActor) {
        session.data.currentTurn.round = nextRoundNumber;
        session.data.currentTurn.number = 1;
        session.data.currentTurn.actor = firstAliveActor;
        session.data.currentTurn.actions = [];

        events.push(...startNewTurn(firstAliveActor, nextRoundNumber, 1, trace));
      }
      // If no alive actors found, the combat should end (handled by victory conditions)

    } else {
      // Find the next alive combatant starting from the next position
      const nextAliveActor = findNextAliveCombatant(initiativeOrder, currentActorIndex + 1);

      if (nextAliveActor) {
        session.data.currentTurn.number = currentTurn.number + 1;
        session.data.currentTurn.actor = nextAliveActor;
        session.data.currentTurn.actions = [];

        events.push(...startNewTurn(nextAliveActor, currentTurn.round, currentTurn.number + 1, trace));
      } else {
        // No alive combatants left in this round, advance to next round
        const nextRoundNumber = currentTurn.round + 1;
        const firstAliveActor = findNextAliveCombatant(initiativeOrder, 0);

        if (firstAliveActor) {
          session.data.currentTurn.round = nextRoundNumber;
          session.data.currentTurn.number = 1;
          session.data.currentTurn.actor = firstAliveActor;
          session.data.currentTurn.actions = [];

          events.push(...startNewTurn(firstAliveActor, nextRoundNumber, 1, trace));
        }
        // If no alive actors found, the combat should end (handled by victory conditions)
      }
    }

    return events;
  };

  return {
    advanceTurn,
  };
}

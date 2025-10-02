import { ActorURN } from '~/types/taxonomy';
import { CombatSession, CombatRound, CombatTurn } from '~/types/combat';
import { WorldEvent, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { TransformerContext } from '~/types/handler';
import { isAlive } from '~/worldkit/entity/actor/health';

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
      actor: actorId,
      location: session.data.location,
      trace,
      payload: {
        sessionId: session.id,
        round: roundNumber,
        turn: turnNumber,
        actor: actorId,
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

    const currentRound = session.data.rounds.current;
    const currentTurn = currentRound.turns.current;
    currentRound.turns.completed.push(currentTurn);

    const initiativeOrder: ActorURN[] = Array.from(session.data.initiative.keys());
    const currentActorIndex = initiativeOrder.indexOf(currentTurn.actor);
    const isLastActorInRound = currentActorIndex === initiativeOrder.length - 1;

    if (isLastActorInRound) {
      const roundDidEndEvent = createWorldEvent({
        type: EventType.COMBAT_ROUND_DID_END,
        location: session.data.location,
        trace,
        payload: { round: currentRound.number }
      });

      context.declareEvent(roundDidEndEvent);
      events.push(roundDidEndEvent);

      session.data.rounds.completed.push(currentRound);

      const nextRoundNumber = currentRound.number + 1;
      const firstAliveActor = findNextAliveCombatant(initiativeOrder, 0);

      if (firstAliveActor) {
        const newRound: CombatRound = {
          number: nextRoundNumber,
          turns: {
            current: {
              number: 1,
              actor: firstAliveActor,
              actions: [],
            },
            completed: [],
          },
        };

        session.data.rounds.current = newRound;

        const roundStartEvent = createWorldEvent({
          type: EventType.COMBAT_ROUND_DID_START,
          location: session.data.location,
          trace,
          payload: {
            sessionId: session.id,
            round: nextRoundNumber,
          },
        });

        context.declareEvent(roundStartEvent);
        events.push(roundStartEvent);

        events.push(...startNewTurn(firstAliveActor, nextRoundNumber, 1, trace));
      }
      // If no alive actors found, the combat should end (handled by victory conditions)

    } else {
      // Find the next alive combatant starting from the next position
      const nextAliveActor = findNextAliveCombatant(initiativeOrder, currentActorIndex + 1);

      if (nextAliveActor) {
        const nextTurnNumber = currentRound.turns.completed.length + 1;

        const newTurn: CombatTurn = {
          number: nextTurnNumber,
          actor: nextAliveActor,
          actions: [],
        };

        session.data.rounds.current.turns.current = newTurn;

        events.push(...startNewTurn(nextAliveActor, currentRound.number, nextTurnNumber, trace));
      } else {
        // No alive combatants left in this round, advance to next round
        const roundDidEndEvent = createWorldEvent({
          type: EventType.COMBAT_ROUND_DID_END,
          location: session.data.location,
          trace,
          payload: { round: currentRound.number }
        });

        context.declareEvent(roundDidEndEvent);
        events.push(roundDidEndEvent);

        session.data.rounds.completed.push(currentRound);

        const nextRoundNumber = currentRound.number + 1;
        const firstAliveActor = findNextAliveCombatant(initiativeOrder, 0);

        if (firstAliveActor) {
          const newRound: CombatRound = {
            number: nextRoundNumber,
            turns: {
              current: {
                number: 1,
                actor: firstAliveActor,
                actions: [],
              },
              completed: [],
            },
          };

          session.data.rounds.current = newRound;

          const roundStartEvent = createWorldEvent({
            type: EventType.COMBAT_ROUND_DID_START,
            location: session.data.location,
            trace,
            payload: {
              sessionId: session.id,
              round: nextRoundNumber,
            },
          });

          context.declareEvent(roundStartEvent);
          events.push(roundStartEvent);

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

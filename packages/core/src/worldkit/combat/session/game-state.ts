import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { CombatSession } from '~/types/combat';
import { WorldEvent, EventType } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { TransformerContext } from '~/types/handler';
import { SessionStatus } from '~/types/session';
import { isAlive, isDead } from '~/worldkit/entity/actor/health';
import { getCurrentAp, getMaxAp, restoreApToFull, TURN_DURATION_SECONDS } from '~/worldkit/combat/ap';
import { getCurrentEnergy, recoverEnergy } from '~/worldkit/entity/actor/capacitor';
import { WellKnownActor } from '~/types/actor';

export type CombatGameStateApi ={
  checkForDeaths: () => ActorURN[];
  checkVictoryConditions: () => boolean;
  getWinningTeam: () => string | null;
  validateCanStartCombat: () => void;
  handleEndOfTurn: (actorId: ActorURN, trace?: string, turnDurationSeconds?: number) => WorldEvent[];
}

/**
 * Combat game state monitoring hook - tracks deaths and victory conditions
 * Separated from lifecycle management to follow single responsibility principle
 */
export function createCombatGameStateApi(
  context: TransformerContext,
  session: CombatSession,
  location: PlaceURN,
): CombatGameStateApi {
  // Track which combatants were alive at last check to detect death transitions
  const lastKnownAliveState = new Map<ActorURN, boolean>();

  /**
   * Initialize alive state tracking for all combatants
   * Should be called when combat starts
   */
  const initializeAliveStateTracking = () => {
    for (const [actorId] of session.data.combatants) {
      const actor = context.world.actors[actorId];
      if (actor) {
        lastKnownAliveState.set(actorId, isAlive(actor));
      }
    }
  };

  /**
   * Checks for combatant deaths and returns list of newly dead actor IDs
   * Pure detection function - does not create events (combat actions handle death events)
   */
  const checkForDeaths = (): ActorURN[] => {
    const newlyDeadActors: ActorURN[] = [];

    for (const [actorId] of session.data.combatants) {
      const actor = context.world.actors[actorId];
      if (!actor) {
        continue; // Skip if actor not found
      }

      const isCurrentlyAlive = isAlive(actor);
      const wasAlive = lastKnownAliveState.get(actorId) ?? true;

      // Detect death transition: was alive, now dead
      if (wasAlive && !isCurrentlyAlive) {
        newlyDeadActors.push(actorId);
      }

      // Update tracked state
      lastKnownAliveState.set(actorId, isCurrentlyAlive);
    }

    // Record metrics if available (pure - just incrementing counters)
    context.metrics?.recordValue('combat.deaths_detected', newlyDeadActors.length);
    context.metrics?.incrementCounter('combat.death_checks_performed');

    return newlyDeadActors;
  };

  /**
   * Gets the winning team if victory conditions are met, null otherwise
   */
  const getWinningTeam = (): string | null => {
    let firstViableTeam: string | null = null;
    let hasMultipleTeams = false;

    for (const [actorId, combatant] of session.data.combatants) {
      const actor = context.world.actors[actorId];

      // Inline viability check for maximum performance
      if (actor && isAlive(actor) && actor.location === location) {
        if (firstViableTeam === null) {
          firstViableTeam = combatant.team;
        } else if (firstViableTeam !== combatant.team) {
          hasMultipleTeams = true;
          break; // Multiple teams found - no victory yet
        }
      }
    }

    // Return winning team only if exactly one team is viable
    return hasMultipleTeams ? null : firstViableTeam;
  };

  /**
   * Checks if victory conditions have been met (only one team able to continue fighting)
   * Optimized with early exit - stops as soon as multiple viable teams are found
   */
  const checkVictoryConditions = (): boolean => {
    // If no combatants exist, victory conditions depend on session state
    if (session.data.combatants.size === 0) {
      // If combat is running with no combatants, victory conditions are met
      // If combat is not running, no victory conditions to check
      return session.status === SessionStatus.RUNNING;
    }

    const winningTeam = getWinningTeam();
    // Victory if we have exactly 0 or 1 teams (null means 0 teams, non-null means 1 team)
    return winningTeam !== null || hasNoViableTeams();
  };

  /**
   * Helper to check if there are no viable teams at all
   */
  const hasNoViableTeams = (): boolean => {
    for (const [actorId] of session.data.combatants) {
      const actor = context.world.actors[actorId];
      if (actor && isAlive(actor) && actor.location === location) {
        return false; // Found at least one viable combatant
      }
    }
    return true; // No viable combatants found
  };

  /**
   * Validates that combat can be started with the current game state
   * Throws descriptive errors if validation fails
   */
  const validateCanStartCombat = (): void => {
    // Validate all combatants exist, are alive, and at combat location
    for (const [actorId] of session.data.combatants) {
      const actor = context.world.actors[actorId];

      if (!actor) {
        throw new Error(`Cannot start combat: Actor ${actorId} not found`);
      }

      // Validate actor is alive
      if (isDead(actor)) {
        throw new Error(`Cannot start combat with dead actor: ${actorId}`);
      }

      // Validate actor is at combat location
      if (actor.location !== location) {
        throw new Error(`Cannot start combat: Actor ${actorId} is not at combat location ${location}, currently at ${actor.location}`);
      }
    }

    // Validate no victory conditions exist before starting
    // Only check this if we have combatants (empty sessions are handled by lifecycle)
    if (session.data.combatants.size > 0 && checkVictoryConditions()) {
      throw new Error('Cannot start combat when victory conditions are already met');
    }
  };

  /**
   * Handles end-of-turn resource recovery for the specified actor
   * This includes AP restoration and energy recovery based on turn duration
   * Returns array of events generated during resource recovery
   */
  const handleEndOfTurn = (actorId: ActorURN, trace?: string, turnDurationSeconds: number = TURN_DURATION_SECONDS): WorldEvent[] => {
    const events: WorldEvent[] = [];
    const actor = context.world.actors[actorId];
    const combatant = session.data.combatants.get(actorId);

    if (!actor) {
      // Actor not found in world - skip resource recovery gracefully
      // This can happen if an actor is removed during combat
      context.metrics?.incrementCounter('combat.resource_recovery.actor_not_found');
      return events;
    }

    if (!combatant) {
      // Combatant not found in session - this should not happen in normal flow
      throw new Error(`handleEndOfTurn: Combatant not found in session`);
    }

    const eventTrace = trace ?? context.uniqid();

    const energyRecovered = recoverEnergy(actor, turnDurationSeconds * 1000); // Convert to milliseconds
    const energyAfterRecovery = getCurrentEnergy(actor);
    const energyBefore = energyAfterRecovery - energyRecovered;

    const previousAp = getCurrentAp(combatant);
    restoreApToFull(combatant);
    const maxAp = getMaxAp(combatant); // Get the restored value
    const apRecovered = maxAp - previousAp;

    // Emit single comprehensive turn end event with resource summaries
    const turnEndEvent = createWorldEvent({
      trace: eventTrace,
      type: EventType.COMBAT_TURN_DID_END,
      actor: WellKnownActor.SYSTEM,
      location,
      session: session.id,
      payload: {
        turnActor: actorId,
        round: session.data.currentTurn.round,
        turn: session.data.currentTurn.number,
        energy: {
          before: energyBefore,
          after: energyAfterRecovery,
          change: energyRecovered,
        },
      },
    });

    context.declareEvent(turnEndEvent);
    events.push(turnEndEvent);

    return events;
  };

  // Initialize state tracking on first call
  if (lastKnownAliveState.size === 0 && session.data.combatants.size > 0) {
    initializeAliveStateTracking();
  }

  return {
    checkForDeaths,
    checkVictoryConditions,
    getWinningTeam,
    validateCanStartCombat,
    handleEndOfTurn,
  };
}

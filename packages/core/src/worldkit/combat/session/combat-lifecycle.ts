import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { CombatSession, Combatant } from '~/types/combat';
import { RollResult, RollResultWithoutModifiers } from '~/types/dice';
import { SessionStatus } from '~/types/session';
import { WorldEvent, EventType } from '~/types/event';
import { computeInitiativeRolls, sortInitiativeOrder } from '~/worldkit/combat/initiative';
import { createWorldEvent } from '~/worldkit/event';
import { createCombatantSummary } from '~/worldkit/combat/combatant';
import { TransformerContext } from '~/types/handler';
import { CombatGameStateApi } from '~/worldkit/combat/session/game-state';
import { WellKnownActor } from '~/types/actor';
import { Actor } from '~/types/entity/actor';

/**
 * Given a map of combatants, throw an error if there are not at least 2 different teams with a
 * combatant in each.
 */
const validateOpposingTeams = (combatants: Map<ActorURN, Combatant>): void => {
  const teams = new Set<string>();
  for (const [, combatant] of combatants) {
    teams.add(combatant.team);
  }
  if (teams.size < 2) {
    const teamList = Array.from(teams).join(', ');
    throw new Error(
      `Cannot start combat without opposing teams. All ${combatants.size} combatants are on team(s): ${teamList}. ` +
      'Combat requires at least 2 different teams.'
    );
  }
};

const getActorNamesByTeam = (actors: Record<ActorURN, Actor>, combatants: Map<ActorURN, Combatant>): Record<string, string[]> => {
  const namesByTeam: Record<string, string[]> = {};
  for (const [, combatant] of combatants) {
    if (!namesByTeam[combatant.team]) {
      namesByTeam[combatant.team] = [];
    }
    const actor = actors[combatant.actorId];
    if (!actor) {
      throw new Error(`Actor ${combatant.actorId} not found`);
    }
    namesByTeam[combatant.team].push(actor.name);
  }
  return namesByTeam;
};

/**
 * Creates combat start events for session, round, and turn.
 */
const createCombatStartEvents = (
  context: TransformerContext,
  sessionId: SessionURN,
  location: PlaceURN,
  trace: string,
  initiativeRolls: Map<ActorURN, RollResultWithoutModifiers>,
  combatants: Map<ActorURN, Combatant>,
  firstActorId: ActorURN
): WorldEvent[] => {
  const actors = context.world.actors;
  return [

    createWorldEvent({
      type: EventType.COMBAT_SESSION_DID_START,
      trace,
      actor: WellKnownActor.SYSTEM,
      location,
      payload: {
        sessionId,
        namesByTeam: getActorNamesByTeam(actors, combatants),
        initiative: [...initiativeRolls.entries()],
        combatants: [...combatants.entries()].map(([actorId, combatant]) => {
          return [actorId, createCombatantSummary(combatant)];
        }),
      },
    }),

    createWorldEvent({
      trace,
      type: EventType.COMBAT_SESSION_STATUS_DID_CHANGE,
      actor: WellKnownActor.SYSTEM,
      location,
      payload: {
        sessionId,
        previousStatus: SessionStatus.PENDING,
        currentStatus: SessionStatus.RUNNING,
      },
    }),

    createWorldEvent({
      trace,
      type: EventType.COMBAT_TURN_DID_START,
      actor: WellKnownActor.SYSTEM,
      location,
      payload: {
        sessionId,
        round: 1,
        turn: 1,
        turnActor: firstActorId,
      },
    })
  ];
};

export interface CombatLifecycle {
  startCombat: (trace?: string, options?: StartCombatOptions) => WorldEvent[];
  pauseCombat: (trace?: string) => WorldEvent[];
  resumeCombat: (trace?: string) => WorldEvent[];
  endCombat: (trace?: string) => WorldEvent[];
}

export type StartCombatOptions = {
  initiativeRolls?: Map<ActorURN, RollResult>;
};

function createCombatSessionStatusDidChangeEvent(
  trace: string,
  previousStatus: SessionStatus,
  currentStatus: SessionStatus,
  location: PlaceURN,
  sessionId: SessionURN,
): WorldEvent {
  return createWorldEvent({
    type: EventType.COMBAT_SESSION_STATUS_DID_CHANGE,
    actor: WellKnownActor.SYSTEM,
    location,
    trace,
    payload: { sessionId, previousStatus, currentStatus },
  });
}

/**
 * Creates a combat lifecycle manager for starting and ending combat sessions.
 */
export function createCombatLifecycle(
  context: TransformerContext,
  session: CombatSession,
  sessionId: SessionURN,
  location: PlaceURN,
  gameStateHook: CombatGameStateApi,
): CombatLifecycle {

  function startCombat(trace: string = context.uniqid(), options: StartCombatOptions = {}): WorldEvent[] {
    if (session.status === SessionStatus.RUNNING) {
      throw new Error('Combat has already started');
    }

    const uniqueTeams = new Set<string>();
    for (const [, combatant] of session.data.combatants) {
      uniqueTeams.add(combatant.team);
    }

    if (session.data.combatants.size === 0) {
      throw new Error('Combat cannot start without at least two combatants; received none');
    }
    if (session.data.combatants.size < 2 && uniqueTeams.size < 2) {
      throw new Error('Combat cannot start with less than one combatant in each of at least two teams');
    }

    validateOpposingTeams(session.data.combatants);

    // Delegate game state validation to the game state hook
    gameStateHook.validateCanStartCombat();

    const getActorOrFail = (actorId: ActorURN) => {
      const actor = context.world.actors[actorId];
      if (!actor) {
        throw new Error(`Actor ${actorId} not found`);
      }
      return actor;
    };

    // Determine initiative source: options > existing session data > compute new
    let sortedInitiativeRolls: Map<ActorURN, RollResultWithoutModifiers>;

    if (options.initiativeRolls) {
      // Use initiative rolls provided in options (highest priority)
      sortedInitiativeRolls = sortInitiativeOrder(options.initiativeRolls, session.data.combatants, getActorOrFail);
      session.data.initiative = sortedInitiativeRolls;
      // Mark as sorted and update cache
      session.data.initiativeSorted = true;
      session.data.lastCombatantHash = Array.from(session.data.combatants.keys()).sort().join(',');
    } else if (session.data.initiative.size > 0) {
      // Use existing initiative with caching optimization
      const currentCombatantHash = Array.from(session.data.combatants.keys()).sort().join(',');
      const needsResorting = !session.data.initiativeSorted ||
                            session.data.lastCombatantHash !== currentCombatantHash;

      if (needsResorting) {
        // Re-sort initiative and update cache
        sortedInitiativeRolls = sortInitiativeOrder(session.data.initiative, session.data.combatants, getActorOrFail);
        session.data.initiative = sortedInitiativeRolls;
        session.data.initiativeSorted = true;
        session.data.lastCombatantHash = currentCombatantHash;
        context.metrics?.incrementCounter('combat.initiative_resorted');
      } else {
        // Use cached sorted initiative
        sortedInitiativeRolls = session.data.initiative;
        context.metrics?.incrementCounter('combat.initiative_cache_hit');
      }
    } else {
      // Compute new initiative rolls
      const initiativeRolls = computeInitiativeRolls(session.data.combatants, getActorOrFail);
      sortedInitiativeRolls = sortInitiativeOrder(initiativeRolls, session.data.combatants, getActorOrFail);
      session.data.initiative = sortedInitiativeRolls;
      // Mark as sorted and update cache
      session.data.initiativeSorted = true;
      session.data.lastCombatantHash = Array.from(session.data.combatants.keys()).sort().join(',');
    }

    const [firstActorId] = sortedInitiativeRolls.keys();
    if (!firstActorId) {
      throw new Error('Failed to resolve first actor to start combat');
    }

    session.data.currentTurn.actor = firstActorId;

    const startEvents = createCombatStartEvents(
      context,
      sessionId,
      location,
      trace,
      sortedInitiativeRolls,
      session.data.combatants,
      firstActorId
    );

    for (const event of startEvents) {
      context.declareEvent(event);
    }

    session.status = SessionStatus.RUNNING;

    return startEvents;
  }

  /**
   * Ends combat and emits termination events
   */
  function endCombat(trace: string = context.uniqid()): WorldEvent[] {
    if (session.status !== SessionStatus.RUNNING) {
      throw new Error('Cannot end combat that is not running');
    }

    // Use injected game state hook to determine winning team
    const winningTeam = gameStateHook.getWinningTeam();
    const events: WorldEvent[] = [];

    const combatSessionStatusDidChangeEvent = createWorldEvent({
      trace,
      type: EventType.COMBAT_SESSION_STATUS_DID_CHANGE,
      actor: WellKnownActor.SYSTEM,
      location,
      payload: {
        sessionId,
        previousStatus: session.status,
        currentStatus: SessionStatus.TERMINATED,
      },
    });

    context.declareEvent(combatSessionStatusDidChangeEvent);
    events.push(combatSessionStatusDidChangeEvent);

    const combatEndEvent = createWorldEvent({
      type: EventType.COMBAT_SESSION_DID_END,
      actor: WellKnownActor.SYSTEM,
      location,
      trace,
      payload: {
        sessionId,
        winningTeam, // null for mutual destruction, Team for victory
        finalRound: session.data.currentTurn.round,
        finalTurn: session.data.currentTurn.number,
      },
    });

    context.declareEvent(combatEndEvent);
    events.push(combatEndEvent);

    // Update session status
    session.status = SessionStatus.TERMINATED;

    return events;
  }

  /**
   * Pauses combat and emits status change event
   */
  function pauseCombat(trace: string = context.uniqid()): WorldEvent[] {
    if (session.status !== SessionStatus.RUNNING) {
      throw new Error('Cannot pause combat that is not running');
    }

    const events: WorldEvent[] = [];
    const previousStatus = session.status;

    const statusChangeEvent = createCombatSessionStatusDidChangeEvent(
      trace,
      previousStatus,
      SessionStatus.PAUSED,
      location,
      sessionId
    );

    context.declareEvent(statusChangeEvent);
    events.push(statusChangeEvent);

    session.status = SessionStatus.PAUSED;

    return events;
  }

  /**
   * Resumes paused combat and emits status change event
   */
  function resumeCombat(trace: string = context.uniqid()): WorldEvent[] {
    if (session.status !== SessionStatus.PAUSED) {
      throw new Error('Cannot resume combat that is not paused');
    }

    const events: WorldEvent[] = [];
    const previousStatus = session.status;

    const statusChangeEvent = createCombatSessionStatusDidChangeEvent(
      trace,
      previousStatus,
      SessionStatus.RUNNING,
      location,
      sessionId
    );

    context.declareEvent(statusChangeEvent);
    events.push(statusChangeEvent);

    session.status = SessionStatus.RUNNING;

    return events;
  }

  return {
    startCombat,
    endCombat,
    pauseCombat,
    resumeCombat,
  };
}

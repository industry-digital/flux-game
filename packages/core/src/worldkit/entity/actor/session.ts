import { Actor } from '~/types/entity/actor';
import { WorldProjection } from '~/types/handler';
import { Session, SessionStatus } from '~/types/session';
import { SessionURN } from '~/types/taxonomy';

/**
 * Checks if a session is active
 */
export const isSessionActive = (session: Session): boolean => session.status === SessionStatus.RUNNING;

export type ActorSessionApi = {
  // Core session management
  getActiveSessions: (actor: Actor, output?: Session[]) => Session[];  // Keep for debugging/inspection
  addToActiveSessions: (actor: Actor, sessionId: SessionURN) => void;
  removeFromActiveSessions: (actor: Actor, sessionId: SessionURN) => void;
  clearActiveSessions: (actor: Actor) => void;

  // Invariant-aware methods (no arrays needed!)
  getActiveSessionByStrategy: (actor: Actor, strategy: string) => Session | null;
  getRunningSessionByStrategy: (actor: Actor, strategy: string) => Session | null;
};

/**
 * Find existing session of a given strategy for an actor
 */
const findSessionByStrategy = (
  actor: Actor,
  strategy: string,
  sessions: WorldProjection['sessions']
): SessionURN | null => {
  for (const sessionId in actor.sessions) {
    const session = sessions[sessionId as SessionURN];
    if (session && session.strategy === strategy) {
      return sessionId as SessionURN;
    }
  }
  return null;
};

export const createActorSessionApi = (sessions: WorldProjection['sessions'], deps = {}): ActorSessionApi => {

  const getActiveSessions = (actor: Actor, output: Session[] = []): Session[] => {
    output.length = 0;

    for (let sessionId in actor.sessions) {
      const session = sessions[sessionId as SessionURN];
      if (session) {
        output.push(session);
      }
    }

    return output;
  };

  const addToActiveSessions = (actor: Actor, sessionId: SessionURN): void => {
    // Get the session to check its strategy
    const newSession = sessions[sessionId];
    if (!newSession) {
      // Session doesn't exist in world, can't add it
      return;
    }

    // Enforce invariant: Remove any existing session of the same strategy
    const existingSessionOfStrategy = findSessionByStrategy(actor, newSession.strategy, sessions);
    if (existingSessionOfStrategy) {
      delete actor.sessions[existingSessionOfStrategy];
    }

    // Add the new session
    actor.sessions[sessionId] = 1;
  };

  const removeFromActiveSessions = (actor: Actor, sessionId: SessionURN): void => {
    delete actor.sessions[sessionId];
  };

  const clearActiveSessions = (actor: Actor) => {
    for (let sessionId in actor.sessions) {
      delete actor.sessions[sessionId as SessionURN];
    }
  };

  const getActiveSessionByStrategy = (actor: Actor, strategy: string): Session | null => {
    for (let sessionId in actor.sessions) {
      const session = sessions[sessionId as SessionURN];
      if (session && session.strategy === strategy) {
        return session; // Found it - invariant guarantees only one
      }
    }
    return null; // Not found
  };

  const getRunningSessionByStrategy = (actor: Actor, strategy: string): Session | null => {
    const session = getActiveSessionByStrategy(actor, strategy);
    return (session && session.status === SessionStatus.RUNNING) ? session : null;
  };

  return {
    getActiveSessions,
    addToActiveSessions,
    removeFromActiveSessions,
    clearActiveSessions,
    getActiveSessionByStrategy,
    getRunningSessionByStrategy,
  };
};

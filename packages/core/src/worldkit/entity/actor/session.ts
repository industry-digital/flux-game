import { Actor } from '~/types/entity/actor';
import { WorldProjection } from '~/types/handler';
import { Session, SessionStatus } from '~/types/session';
import { SessionURN } from '~/types/taxonomy';

/**
 * Checks if a session is active
 */
export const isSessionActive = (session: Session): boolean => session.status === SessionStatus.RUNNING;

export type ActorSessionApi = {
  getActiveSessions: (actor: Actor) => Session[];
  addToActiveSessions: (actor: Actor, sessionId: SessionURN) => void;
  removeFromActiveSessions: (actor: Actor, sessionId: SessionURN) => void;
  clearActiveSessions: (actor: Actor) => void;
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
    actor.sessions ??= {};
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

  return {
    getActiveSessions,
    addToActiveSessions,
    removeFromActiveSessions,
    clearActiveSessions,
  };
};

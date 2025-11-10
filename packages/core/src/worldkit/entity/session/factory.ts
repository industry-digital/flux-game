import { AbstractSession, SessionStatus, SessionStrategy } from '~/types/entity/session';
import { uniqid, BASE62_CHARSET } from '~/lib/random';
import { SessionURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';

/**
 * Creates a unique session ID.
 */
export const createSessionId = (
  strategy: SessionStrategy,
  key: string = uniqid(24, BASE62_CHARSET),
): SessionURN => {
  return `flux:session:${strategy}:${key}`;
};

type Transform<T> = (x: T) => T;
const identity = <T>(x: T): T => x;

export const createSession = <
  TSessionStrategy extends SessionStrategy,
  TSessionData,
>(
  strategy: TSessionStrategy,
  transform: Transform<AbstractSession<TSessionStrategy, TSessionData>> = identity,
): AbstractSession<TSessionStrategy, TSessionData> => {
  const defaults = {
    id: createSessionId(strategy),
    type: EntityType.SESSION,
    strategy,
    status: SessionStatus.PENDING,
  };

  return transform(defaults as AbstractSession<TSessionStrategy, TSessionData>);
};

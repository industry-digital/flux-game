import { SessionStrategy } from '~/types/entity/session';
import { ROOT_NAMESPACE, SessionURN } from '~/types/taxonomy';

const SESSION_STRATEGY_START_INDEX = `${ROOT_NAMESPACE}:session:`.length;

/**
 * Zero-allocation session strategy extraction.
 * Parses strategy from URN format: flux:session:${strategy}:${key}
 */
export const parseSessionStrategyFromUrn = (sessionId: SessionURN): SessionStrategy => {
  const endIndex = sessionId.indexOf(':', SESSION_STRATEGY_START_INDEX);
  const actualEndIndex = endIndex === -1 ? sessionId.length : endIndex;
  return sessionId.substring(SESSION_STRATEGY_START_INDEX, actualEndIndex) as SessionStrategy;
};

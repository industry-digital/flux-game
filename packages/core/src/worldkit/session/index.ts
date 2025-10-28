import { uniqid, BASE62_CHARSET } from '~/lib/random';
import { SessionStrategy } from '~/types/session';
import { ROOT_NAMESPACE, SessionURN } from '~/types/taxonomy';

/**
 * Creates a unique session ID.
 */
export const createSessionId = (
  strategy: SessionStrategy,
  key: string = uniqid(24, BASE62_CHARSET),
): SessionURN => {
  return `flux:session:${strategy}:${key}`;
};

const SESSION_STRATEGY_START_INDEX = `${ROOT_NAMESPACE}:session:`.length;

/**
 * Zero-allocation session strategy extraction.
 * Parses strategy from URN format: flux:session:${strategy}:${key}
 */
export const parseSessionStrategyFromUrn = (sessionId: SessionURN): SessionStrategy => {
  // Find the end of the strategy (next colon after precomputed start)
  const len = sessionId.length;
  let strategyEnd = len; // Default to end of string

  for (let i = SESSION_STRATEGY_START_INDEX; i < len; i++) {
    if (sessionId[i] === ':') {
      strategyEnd = i;
      break;
    }
  }

  // Extract strategy substring using precomputed start index
  return sessionId.substring(SESSION_STRATEGY_START_INDEX, strategyEnd) as SessionStrategy;
}

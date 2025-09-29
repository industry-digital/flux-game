import { uniqid, BASE62_CHARSET } from '~/lib/random';
import { SessionStrategy } from '~/types/session';
import { SessionURN } from '~/types/taxonomy';

/**
 * Creates a unique session ID.
 */
export const createSessionId = (
  strategy: SessionStrategy,
  key: string = uniqid(24, BASE62_CHARSET),
): SessionURN => {
  return `flux:session:${strategy}:${key}`;
};

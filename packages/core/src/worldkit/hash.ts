const CONTIGUOUS_ALPHANUMERIC_REGEX = /[a-z0-9\s]/g;
/**
 * Hashes an unsafe user input string to a safe identifier.
 *
 * This function creates a deterministic, safe string that can be used
 * as an object key or identifier without security risks.
 *
 * @param unsafeName - User-provided string (shell name, etc.)
 * @returns Safe, deterministic hash suitable for use as object keys
 */
export const hashUnsafeString = (unsafeName: string): string => {
  // Extract only alphanumeric characters and spaces, convert to lowercase
  // This is faster than trim() and provides better security
  const normalized = unsafeName.toLowerCase().match(CONTIGUOUS_ALPHANUMERIC_REGEX)?.join('') || '';

  if (normalized.length === 0) {
    throw new Error('String must contain at least one alphanumeric character');
  }

  if (normalized.length > 50) {
    throw new Error('String is too long (max 50 alphanumeric characters)');
  }

  // Fast hash function optimized for short strings
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
};

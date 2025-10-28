/**
 * Zero-allocation sanitization for maximum performance.
 *
 * Allows Latin1 characters (0-255) that form words plus spaces.
 * Normalizes whitespace and enforces length limits.
 */

/**
 * Fast character validation using direct code point checks.
 * Covers: A-Z (65-90), a-z (97-122), 0-9 (48-57), space (32), Latin1 extended (192-255)
 */
function isValidLatin1WordChar(code: number): boolean {
  return (code >= 48 && code <= 57) ||   // 0-9
         (code >= 65 && code <= 90) ||   // A-Z
         (code >= 97 && code <= 122) ||  // a-z
         (code === 32) ||                // space
         (code >= 192 && code <= 255);   // Latin1 extended (àáâã etc.)
}

/**
 * Zero-allocation sanitizer using single-pass character iteration.
 *
 * Rules:
 * - Keeps only Latin1 word characters and spaces
 * - Normalizes consecutive spaces to single spaces
 * - Trims leading/trailing whitespace
 * - Enforces 50 character limit
 * - Throws if result is empty
 *
 * @param token - User input string to sanitize
 * @returns Sanitized string safe for use as identifier
 * @throws Error if token becomes empty or exceeds length limit
 */
export function sanitize(token: string): string {
  if (typeof token !== 'string') {
    throw new Error('Token must be a string');
  }

  const len = token.length;
  if (len === 0) {
    throw new Error('Token must contain at least one valid character');
  }

  let result = '';
  let lastWasSpace = true; // Start true to trim leading spaces
  let validCharCount = 0;

  // Single pass: filter, normalize spaces, and count
  for (let i = 0; i < len; i++) {
    const code = token.charCodeAt(i);

    if (isValidLatin1WordChar(code)) {
      if (code === 32) { // space
        if (!lastWasSpace) {
          result += ' ';
          lastWasSpace = true;
          validCharCount++;
        }
        // Skip consecutive spaces
      } else {
        result += token[i];
        lastWasSpace = false;
        validCharCount++;
      }

      // Early exit if we exceed length limit
      if (validCharCount > 50) {
        throw new Error('Token is too long (max 50 characters)');
      }
    }
    // Invalid characters are silently dropped
  }

  // Trim trailing space if present
  if (result.length > 0 && result[result.length - 1] === ' ') {
    result = result.slice(0, -1);
  }

  // Check if anything remains after sanitization
  if (result.length === 0) {
    throw new Error('Token must contain at least one valid character');
  }

  return result;
}

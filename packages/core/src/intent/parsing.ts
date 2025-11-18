/**
 * Parse and validate a safe integer from user input
 * @param input - Raw string input from user
 * @returns Parsed integer or undefined if invalid
 */
export const parseSafeInteger = (input: string): number | undefined => {
  const parsed = parseInt(input, 10);

  if (isNaN(parsed) || parsed < Number.MIN_SAFE_INTEGER || parsed > Number.MAX_SAFE_INTEGER) {
    return undefined;
  }

  return parsed;
};

/**
 * Parse and validate a safe positive float from user input
 * @param input - Raw string input from user
 * @returns Parsed float or undefined if invalid
 */
export const parseSafePositiveFloat = (input: string): number | undefined => {
  const parsed = parseFloat(input);

  if (isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed) || parsed > Number.MAX_SAFE_INTEGER) {
    return undefined;
  }

  return parsed;
};

/**
 * Parse and validate a safe positive integer from float input
 * Useful for distance values that must be whole numbers
 * @param input - Raw string input from user
 * @returns Parsed integer or undefined if invalid
 */
export const parseSafePositiveInteger = (input: string): number | undefined => {
  const parsed = parseSafePositiveFloat(input);
  return parsed !== undefined ? Math.floor(parsed) : undefined;
};

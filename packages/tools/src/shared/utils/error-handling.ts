/**
 * Type-safe error handling utilities
 */

/**
 * Safely extracts an error message from an unknown error value
 * Handles Error objects, strings, objects with message properties, and other types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  // Fallback for any other type
  return String(error);
}

/**
 * Type guard to check if an error is an Error instance with a message
 */
export function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error && typeof error.message === 'string';
}

/**
 * Type guard to check if an error has a message property (Error-like object)
 */
export function isErrorLike(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Safely gets the error stack trace if available
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return undefined;
}

/**
 * Creates a standardized error object from any thrown value
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  const message = getErrorMessage(error);
  const normalizedError = new Error(message);

  // Preserve original error as a property if it's an object
  if (typeof error === 'object' && error !== null) {
    (normalizedError as any).originalError = error;
  }

  return normalizedError;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Wraps a function that might throw into a Result type
 */
export function attempt<T>(fn: () => T): Result<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: normalizeError(error) };
  }
}

/**
 * Async version of attempt
 */
export async function attemptAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: normalizeError(error) };
  }
}

export type ProfileOptions = {
  now?: () => number;
};

export type ProfileResult<T> = {
  result: T;
  duration: number;
};

/**
 * Profile a function call and return both the result and duration.
 * @param fn - The function to profile.
 * @param options - Options including custom now() function.
 * @returns An object containing the function result and duration in milliseconds.
 */
export function profile<T>(
  fn: () => T,
  { now = () => performance.now() }: ProfileOptions = {},
): ProfileResult<T> {
  const t0 = now();
  const result = fn();
  return { result, duration: now() - t0 };
}

export async function profileAsync<T>(
  fn: () => Promise<T>,
  { now = () => performance.now() }: ProfileOptions = {},
): Promise<ProfileResult<T>> {
  const t0 = now();
  const result = await fn();
  return { result, duration: now() - t0 };
}

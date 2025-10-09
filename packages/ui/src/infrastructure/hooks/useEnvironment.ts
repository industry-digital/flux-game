import type { EnvironmentLike, EnvironmentConfig, EnvironmentHookOutput } from '~/types/infrastructure';

// Type-safe environment configuration helper
export const createEnvironmentHook = <T>(
  rawEnv: EnvironmentLike,
  config: EnvironmentConfig<T>,
): EnvironmentHookOutput<T> => {
  const environment = {} as T;
  const entries = Object.entries(config) as [keyof T, EnvironmentConfig<T>[keyof T]][];
  const missingRequiredVariables = new Set<string>();

  for (const [key, spec] of entries) {
    const rawValue = rawEnv[spec.key];

    if (rawValue === undefined) {
      if (spec.required && spec.defaultValue === undefined) {
        missingRequiredVariables.add(spec.key);
      }
      environment[key] = spec.defaultValue as T[keyof T];
    } else {
      environment[key] = spec.transform
        ? spec.transform(rawValue)
        : (rawValue as T[keyof T]);
    }
  }

  if (missingRequiredVariables.size > 0) {
    throw new Error(`Missing required environment variables: ${Array.from(missingRequiredVariables).join(', ')}`);
  }

  return (): T => environment;
};

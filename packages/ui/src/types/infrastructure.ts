export type EnvironmentLike = Record<string, string | undefined>;

export type EnvironmentResolver<TInput extends EnvironmentLike, TOutput> = (
  input: TInput
) => TOutput;

export type EnvironmentConfig<T> = {
  [K in keyof T]: {
    key: string;
    required?: boolean;
    defaultValue?: T[K];
    transform?: (value: string) => T[K];
  };
};

export type EnvironmentHookOutput<T> = () => T;

// Simple logger interface for UI package
export type LoggerInterface = {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
};

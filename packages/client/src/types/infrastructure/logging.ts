export type LoggerInterface = {
  debug: typeof console.debug;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
};

export type LoggerResolver = (name?: string) => LoggerInterface;

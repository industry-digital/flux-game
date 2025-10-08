export type LoggerInterface = {
  debug: typeof console.debug;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  child: (name: string) => LoggerInterface;
};

export type LoggerResolver = (name?: string) => LoggerInterface;

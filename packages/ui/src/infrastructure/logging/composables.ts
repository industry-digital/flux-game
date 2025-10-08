// Simple logger interface for UI package
export interface LoggerInterface {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export type LoggerResolver = (context: string) => LoggerInterface;

type ConsoleLike = {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
};

const createConsoleLogger = (context: string, console: ConsoleLike = window.console ): LoggerInterface => {
  return {
    debug: (message: string, ...args: any[]) => console.debug(`[${context}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.info(`[${context}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[${context}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[${context}] ${message}`, ...args),
  };
};

/**
 * Simple logger composable for UI package
 *
 * Provides basic console logging with context prefixes.
 * Consumer projects can override this with more sophisticated loggers.
 */
export function useLogger(context: string = 'UI'): LoggerInterface {
  return createConsoleLogger(context);
}

import { useMemo } from 'react';
import type { LoggerInterface } from '~/types/infrastructure';

const createConsoleLogger = (context: string, console: LoggerInterface = window.console): LoggerInterface => {
  return {
    debug: (message: string, ...args: any[]) => console.debug(`[${context}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.info(`[${context}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[${context}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[${context}] ${message}`, ...args),
  };
};

/**
 * Simple logger hook for UI package
 *
 * Provides basic console logging with context prefixes.
 * Consumer projects can override this with more sophisticated loggers.
 */
export function useLogger(context: string = 'UI'): LoggerInterface {
  return useMemo(() => createConsoleLogger(context), [context]);
}

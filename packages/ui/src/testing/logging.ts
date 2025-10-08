import { vi } from 'vitest';
import type { LoggerInterface } from '../infrastructure/logging/composables';

/**
 * Mock logger for testing
 */
export function createMockLogger(): LoggerInterface {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// Fallback for environments without vitest
const createFallbackMockLogger = (): LoggerInterface => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

// Export the appropriate mock based on environment
export const mockLogger = typeof vi !== 'undefined'
  ? createMockLogger()
  : createFallbackMockLogger();

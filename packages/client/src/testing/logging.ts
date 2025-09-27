import { vi } from 'vitest';
import { LoggerInterface } from '~/types/infrastructure/logging';

export const createMockLogger = (): LoggerInterface => ({
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
} as unknown as LoggerInterface);

import { vi } from 'vitest';
import { PotentiallyImpureOperations, TransformerContext } from '~/types/handler';
import { ProfileResult } from '~/lib/profile';

/**
 * Factory function for creating mock TransformerContext with sensible defaults
 * Pure function that returns a new mock context each time
 */
export const createTransformerContext = (overrides?: Partial<TransformerContext>): TransformerContext => {
  const defaultContext: TransformerContext = {
    world: {
      actors: {},
      places: {},
      items: {},
    },
    declareEvent: vi.fn(),
    declareError: vi.fn(),
    ...createPotentiallyImpureOperations(),
  };

  return {
    ...defaultContext,
    ...overrides
  };
};

/**
 * Factory function for creating mock functions with deterministic behavior
 * Pure function that returns consistent mock implementations
 */
export const createPotentiallyImpureOperations = (): PotentiallyImpureOperations => {
  return {
    random: vi.fn(() => 0.5),
    timestamp: vi.fn(() => 1234567890),
    uniqid: vi.fn(() => 'test-unique-id'),
    debug: vi.fn(),
    profile: vi.fn(() => ({ result: undefined, duration: 0 })) as <T>(fn: () => T) => ProfileResult<T>
  };
};

/**
 * Hook-style utility for creating mock context with custom world state
 * Pure function that allows easy world state customization
 */
export const createContextWithWorld = (
  worldOverrides?: Partial<TransformerContext['world']>
): TransformerContext => {
  const mocks = createPotentiallyImpureOperations();

  return {
    world: {
      actors: {},
      places: {},
      items: {},
      ...worldOverrides
    },
    declareEvent: vi.fn(),
    declareError: vi.fn(),
    ...mocks
  };
};

import { vi } from 'vitest';
import { PotentiallyImpureOperations, TransformerContext } from '~/types/handler';
import { ProfileResult } from '~/lib/profile';
import { createSchemaManager } from '~/worldkit/schema/manager';
import { createMassApi, createMassComputationState } from '~/worldkit/physics/mass';
import { createTransformerContext, createWorldProjection } from '~/worldkit/context';
import { EventType } from '~/types/event';
import { RollResultWithoutModifiers } from '~/types/dice';

/**
 * Factory function for creating mock TransformerContext with sensible defaults
 * Pure function that returns a new mock context each time
 * @deprecated Use `createTransformerContext` instead
 */
export const createTestTransformerContext = (overrides?: Partial<TransformerContext>): TransformerContext => {
  // Create arrays to store events for proper testing
  const declaredEvents: any[] = [];
  const declaredErrors: any[] = [];

  const schemaManager = overrides?.schemaManager ?? createSchemaManager();
  const mockSearchCache = overrides?.searchCache ?? new Map();
  const impureOps = createPotentiallyImpureOperations();

  const defaultContext: TransformerContext = createTransformerContext(
    (c: TransformerContext) => ({
      ...c,
      world: createWorldProjection(),
      declareEvent: vi.fn((event: any) => {
        declaredEvents.push(event);
      }),
      declareError: vi.fn((error: any) => {
        declaredErrors.push(error);
      }),
      getDeclaredEvents: vi.fn((pattern?: RegExp | EventType) => {
        return declaredEvents.filter(event => pattern ? (pattern instanceof RegExp ? pattern.test(event.type) : pattern === event.type) : true);
      }),
      getDeclaredEventsByCommand: vi.fn((trace: string) => {
        return declaredEvents.filter(event => event.trace === trace);
      }),
      searchCache: mockSearchCache,
      rollDice: vi.fn(() => ({ values: [10], sum: 10, dice: '1d20', natural: 10, result: 10, bonus: 0 } as RollResultWithoutModifiers)),
      executeRoll: vi.fn(() => ({ dice: '1d20' , natural: 10, result: 10, values: [10], mods: {} })),
      ...impureOps,
    }),
    createWorldProjection(), // world
    schemaManager, // Pass the correct schema manager so all APIs use it
    impureOps, // deps
    createMassApi(schemaManager, createMassComputationState()) // mass with correct schema manager
  );

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

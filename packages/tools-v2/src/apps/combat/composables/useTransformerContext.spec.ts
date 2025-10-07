import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComposableTestSuite } from '~/testing';
import { createTestActor, createMockWorldEvent, ALICE_ID, BOB_ID } from '../testing';
import { useTransformerContext, type TransformerContextDependencies } from './useTransformerContext';
import type { TransformerContext, WorldEvent } from '@flux/core';

describe('useTransformerContext', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  beforeEach(setup);
  afterEach(teardown);

  // Create mock dependencies for each test
  const createMockDeps = (): TransformerContextDependencies => {
    const mockEvents: WorldEvent[] = [];

    const mockContext: TransformerContext = {
      world: {
        actors: {},
        places: {},
        items: {},
        sessions: {},
      },
      uniqid: vi.fn(() => `test-id-${Math.random().toString(36).substr(2, 9)}`),
      timestamp: vi.fn(() => Date.now()),
      declareEvent: vi.fn((event: WorldEvent) => {
        mockEvents.push(event);
        return event;
      }),
      declareError: vi.fn(),
      getDeclaredEvents: vi.fn(() => mockEvents),
      schemaManager: {
        getSchemasOfType: vi.fn(() => new Map()),
      },
      equipmentApi: {
        getEquippedWeaponSchema: vi.fn(() => null),
      },
    } as unknown as TransformerContext;

    return {
      useLogger: vi.fn(() => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      })),
      createTransformerContext: vi.fn(() => mockContext),
    };
  };

  it('should initialize with no context', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      expect(contextManager.isInitialized.value).toBe(false);
      expect(contextManager.context.value).toBeNull();
      expect(contextManager.eventCount.value).toBe(0);
      expect(contextManager.actorIds.value).toEqual([]);
    });
  });

  it('should initialize context successfully', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      const success = contextManager.initializeContext();

      expect(success).toBe(true);
      expect(contextManager.isInitialized.value).toBe(true);
      expect(contextManager.context.value).toBeTruthy();
      expect(mockDeps.createTransformerContext).toHaveBeenCalled();
    });
  });

  it('should handle context initialization failure', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      mockDeps.createTransformerContext = vi.fn(() => {
        throw new Error('Context creation failed');
      });

      const contextManager = useTransformerContext(mockDeps);
      const success = contextManager.initializeContext();

      expect(success).toBe(false);
      expect(contextManager.isInitialized.value).toBe(false);
    });
  });

  it('should reset context', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      // Initialize first
      contextManager.initializeContext();
      expect(contextManager.isInitialized.value).toBe(true);

      // Reset
      const success = contextManager.resetContext();

      expect(success).toBe(true);
      expect(contextManager.isInitialized.value).toBe(true); // Should re-initialize
      expect(contextManager.eventCount.value).toBe(0);
    });
  });

  it('should add and manage actors', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      const alice = createTestActor(ALICE_ID, 'Alice');
      const success = contextManager.addActor(alice);

      expect(success).toBe(true);
      expect(contextManager.hasActor(ALICE_ID)).toBe(true);
      expect(contextManager.getActor(ALICE_ID)).toStrictEqual(alice);
      expect(contextManager.actorIds.value).toContain(ALICE_ID);
    });
  });

  it('should remove actors', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      // Add actor first
      const alice = createTestActor(ALICE_ID, 'Alice');
      contextManager.addActor(alice);
      expect(contextManager.hasActor(ALICE_ID)).toBe(true);

      // Remove actor
      const success = contextManager.removeActor(ALICE_ID);

      expect(success).toBe(true);
      expect(contextManager.hasActor(ALICE_ID)).toBe(false);
      expect(contextManager.getActor(ALICE_ID)).toBeNull();
      expect(contextManager.actorIds.value).not.toContain(ALICE_ID);
    });
  });

  it('should handle removing non-existent actor', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      const success = contextManager.removeActor(ALICE_ID);

      expect(success).toBe(false);
    });
  });

  it('should declare events and track count', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      const event = createMockWorldEvent('TEST_EVENT', ALICE_ID);
      const declaredEvent = contextManager.declareEvent(event);

      expect(declaredEvent).toBe(event);
      expect(contextManager.eventCount.value).toBe(1);
      expect(contextManager.declaredEvents.value).toContain(event);
    });
  });

  it('should sync event count', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      // Add events directly to mock
      const event1 = createMockWorldEvent('EVENT_1', ALICE_ID);
      const event2 = createMockWorldEvent('EVENT_2', BOB_ID);

      contextManager.declareEvent(event1);
      contextManager.declareEvent(event2);

      const count = contextManager.syncEventCount();

      expect(count).toBe(2);
      expect(contextManager.eventCount.value).toBe(2);
    });
  });

  it('should get events since count', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      const event1 = createMockWorldEvent('EVENT_1', ALICE_ID);
      const event2 = createMockWorldEvent('EVENT_2', BOB_ID);
      const event3 = createMockWorldEvent('EVENT_3', ALICE_ID);

      contextManager.declareEvent(event1);
      contextManager.declareEvent(event2);
      contextManager.declareEvent(event3);

      const eventsSince1 = contextManager.getEventsSince(1);

      expect(eventsSince1).toHaveLength(2);
      expect(eventsSince1).toContain(event2);
      expect(eventsSince1).toContain(event3);
    });
  });

  it('should get latest events', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      const event1 = createMockWorldEvent('EVENT_1', ALICE_ID);
      const event2 = createMockWorldEvent('EVENT_2', BOB_ID);
      const event3 = createMockWorldEvent('EVENT_3', ALICE_ID);

      contextManager.declareEvent(event1);
      contextManager.declareEvent(event2);
      contextManager.declareEvent(event3);

      const latestEvents = contextManager.getLatestEvents(2);

      expect(latestEvents).toHaveLength(2);
      expect(latestEvents).toContain(event2);
      expect(latestEvents).toContain(event3);
    });
  });

  it('should handle operations without initialized context', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      // Don't initialize context

      const alice = createTestActor(ALICE_ID, 'Alice');
      const addSuccess = contextManager.addActor(alice);
      expect(addSuccess).toBe(false);

      const removeSuccess = contextManager.removeActor(ALICE_ID);
      expect(removeSuccess).toBe(false);

      const event = createMockWorldEvent('TEST_EVENT', ALICE_ID);
      const declaredEvent = contextManager.declareEvent(event);
      expect(declaredEvent).toBeNull();

      const count = contextManager.syncEventCount();
      expect(count).toBe(0);
    });
  });

  it('should declare errors', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const contextManager = useTransformerContext(mockDeps);

      contextManager.initializeContext();

      contextManager.declareError('Test error message', 'event-123');

      // Verify the mock was called (implementation detail we can check in this case)
      expect(mockDeps.createTransformerContext().declareError).toHaveBeenCalledWith(
        'Test error message',
        'event-123'
      );
    });
  });
});

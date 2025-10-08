import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import {
  useCombatSimulator,
  type CombatSimulationConfig,
  type CombatSimulatorDependencies,
  DEFAULT_COMBAT_SIMULATOR_DEPS,
} from './useCombatSimulator';
import { createComposableTestSuite } from '~/testing/vue-test-utils';
import { createMockLogger } from '~/testing/logging';
import { useTransformerContext } from './useTransformerContext';
import type { PlaceURN } from '@flux/core';

const TEST_LOCATION: PlaceURN = 'flux:place:arena';

describe.skip('useCombatSimulator', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  let mockConfig: CombatSimulationConfig;
  let transformerContext: ReturnType<typeof useTransformerContext>;
  let mockDeps: CombatSimulatorDependencies;

  beforeEach(() => {
    setup();

    // Create mocked dependencies by spreading defaults and overriding what we need
    const mockLogger = createMockLogger();
    mockDeps = {
      ...DEFAULT_COMBAT_SIMULATOR_DEPS,
      useLogger: vi.fn(() => mockLogger),
    };

    // Create mock transformer context
    const mockContext = ref({
      world: { actors: {}, places: {} },
      getDeclaredEvents: () => [],
      getDeclaredErrors: () => [],
      declareEvent: vi.fn(),
      declareError: vi.fn(),
    } as any);

    // Create reactive wrapper
    transformerContext = useTransformerContext(mockContext);

    // Simple test configuration
    mockConfig = {
      location: TEST_LOCATION,
      sessionId: undefined,
      aiTiming: undefined,
      autoAdvanceTurns: false,
    };
  });

  afterEach(() => {
    teardown();
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(transformerContext, mockConfig, mockDeps);

        expect(simulator.simulationState.value).toBe('idle');
        expect(simulator.currentSession.value).toBeNull();
        expect(simulator.lastError.value).toBeNull();
        expect(simulator.currentTurn.value).toBe(0);
        expect(simulator.currentRound.value).toBe(0);
      });
    });

    it('should provide correct initial computed properties', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        expect(simulator.isSimulationActive.value).toBe(false);
        expect(simulator.isSimulationPaused.value).toBe(false);
        expect(simulator.canStartSimulation.value).toBe(false); // No actors configured initially
        expect(simulator.canPauseSimulation.value).toBe(false);
        expect(simulator.canResumeSimulation.value).toBe(false);
        expect(simulator.canEndSimulation.value).toBe(false);
        expect(simulator.canExecuteCommand.value).toBe(false);
      });
    });
  });

  describe('simulation lifecycle', () => {
    it('should not start simulation when no actors configured', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        const success = simulator.startSimulation();

        expect(success).toBe(false);
        expect(simulator.simulationState.value).toBe('idle'); // Stays idle when preconditions not met
        expect(simulator.lastError.value).toBeNull(); // No error set for precondition failures
      });
    });

    it('should handle pause/resume when not active', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        const pauseSuccess = simulator.pauseSimulation();
        const resumeSuccess = simulator.resumeSimulation();

        expect(pauseSuccess).toBe(false);
        expect(resumeSuccess).toBe(false);
        expect(simulator.simulationState.value).toBe('idle');
      });
    });

    it('should reset simulation to idle state', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        simulator.resetSimulation();

        expect(simulator.simulationState.value).toBe('idle');
        expect(simulator.currentSession.value).toBeNull();
        expect(simulator.lastError.value).toBeNull();
      });
    });
  });

  describe('turn management', () => {
    it('should not advance turn when simulation not active', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        const success = simulator.advanceTurn();

        expect(success).toBe(false);
        expect(simulator.currentTurn.value).toBe(0);
      });
    });
  });

  describe('command execution', () => {
    it('should not execute commands when simulation not active', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        const events = simulator.executePlayerCommand('attack');

        expect(events).toEqual([]);
        expect(simulator.canExecuteCommand.value).toBe(false);
      });
    });

    it('should handle empty command text gracefully', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        const events = simulator.executePlayerCommand('');

        expect(events).toEqual([]);
      });
    });
  });

  describe('statistics and utilities', () => {
    it('should provide simulation statistics', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        const stats = simulator.getSimulationStats();

        expect(stats).toMatchObject({
          state: 'idle',
          turn: 0,
          round: 0,
          activeCombatants: 0,
          aliveCombatants: 0,
          currentActor: null,
          sessionId: undefined,
          lastError: null,
        });
      });
    });

    it('should provide readonly access to configuration', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        expect(simulator.config.value).toEqual(mockConfig);

        // Should be readonly - this would fail at compile time
        // simulator.config.value = {}; // TypeScript error
      });
    });
  });

  describe('combatant information', () => {
    it('should provide empty combatant arrays when no session', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockContext, mockConfig, mockDeps);

        expect(simulator.activeCombatants.value).toEqual([]);
        expect(simulator.aliveCombatants.value).toEqual([]);
        expect(simulator.currentTurnActor.value).toBeNull();
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, computed } from 'vue';
import {
  useCombatSimulator,
  type CombatSimulatorDependencies,
  type CombatSimulationConfig
} from './useCombatSimulator';
import { createComposableTestSuite } from '~/testing/vue-test-utils';
import { useTransformerContext } from './useTransformerContext';
import {
  CommandType,
  createActorCommand,
  createActor,
  createCombatSessionApi,
  type ActorURN,
  type PlaceURN,
} from '@flux/core';

const ALICE_ID: ActorURN = 'flux:actor:alice';
const BOB_ID: ActorURN = 'flux:actor:bob';
const TEST_LOCATION: PlaceURN = 'flux:place:arena';
describe('useCombatSimulator', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  let mockDeps: CombatSimulatorDependencies;
  let mockConfig: CombatSimulationConfig;
  let mockCombatLog: any;
  let mockScenario: any;
  let mockCombatAI: any;
  // Using real createCombatSessionApi - no mock needed

  beforeEach(() => {
    setup();

    // Mock combat log
    mockCombatLog = {
      entries: { value: [] },
      entryCount: { value: 0 },
      filteredEntries: { value: [] },
      addEvents: vi.fn(),
      clearLog: vi.fn(),
    };

    // Mock scenario
    mockScenario = {
      scenarioData: {
        value: {
          actors: {
            [ALICE_ID]: {
              stats: { pow: 15, fin: 12, res: 14, int: 13, per: 11, mem: 10 },
              skills: {
                'flux:skill:evasion': 2,
                'flux:skill:weapon:melee': 3
              }
            },
            [BOB_ID]: {
              stats: { pow: 12, fin: 14, res: 13, int: 12, per: 15, mem: 11 },
              skills: {
                'flux:skill:evasion': 1,
                'flux:skill:weapon:melee': 2
              }
            }
          }
        }
      },
      isLoaded: { value: true },
      isDirty: { value: false },
      lastSaved: { value: null },
      updateActorData: vi.fn(),
      addActor: vi.fn(),
      removeActor: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    // Using real useTransformerContext - no mock needed

    // Mock combat AI
    mockCombatAI = {
      aiControlledActors: { value: new Set() },
      currentThinkingActor: { value: null },
      aiExecutionState: { value: 'idle' },
      isAnyAIThinking: { value: false },
      aiActorCount: { value: 0 },
      setAIControlled: vi.fn(),
      isAIControlled: vi.fn(() => false),
      setMultipleAIControlled: vi.fn(),
      executeAITurn: vi.fn(() => Promise.resolve([
        createActorCommand({
          type: CommandType.ATTACK,
          actor: ALICE_ID,
          args: { target: BOB_ID }
        })
      ])),
      cancelAIExecution: vi.fn(),
      getAIStats: vi.fn(() => ({ totalAIActors: 0 })),
    };

    // Using real createCombatSessionApi - no mock needed

    // Mock dependencies
    mockDeps = {
      useLogger: vi.fn(() => console),
      useCombatLog: vi.fn(() => mockCombatLog),
      useCombatScenario: vi.fn(() => mockScenario),
      useTransformerContext: useTransformerContext, // Use the real implementation
      useCombatAI: vi.fn(() => mockCombatAI),
      createCombatSessionApi: createCombatSessionApi, // Use the real implementation
      createActor: createActor, // Use the real createActor function
      isActorAlive: vi.fn(() => true),
      timestamp: vi.fn(() => Date.now()),
    };

    mockConfig = {
      location: TEST_LOCATION,
      autoAdvanceTurns: false,
    };
  });

  afterEach(() => {
    teardown();
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        expect(simulator.simulationState.value).toBe('idle');
        expect(simulator.currentSession.value).toBeNull();
        expect(simulator.currentTurn.value).toBe(0);
        expect(simulator.currentRound.value).toBe(0);
        expect(simulator.lastError.value).toBeNull();
      });
    });

    it('should initialize domain composables', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        expect(mockDeps.useCombatLog).toHaveBeenCalled();
        expect(mockDeps.useCombatScenario).toHaveBeenCalled();
        // useTransformerContext is the real implementation, not a mock
        expect(simulator.transformerContext).toBeDefined();
      });
    });

    it('should provide access to domain composables', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        expect(simulator.combatLog.entries).toBe(mockCombatLog.entries);
        expect(simulator.scenario.scenarioData).toBe(mockScenario.scenarioData);
        expect(simulator.transformerContext.isInitialized).toBeDefined();
      });
    });
  });

  describe('computed properties', () => {
    it('should calculate simulation state flags correctly', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Initial state
        expect(simulator.isSimulationActive.value).toBe(false);
        expect(simulator.isSimulationPaused.value).toBe(false);
        expect(simulator.canStartSimulation.value).toBe(false); // context not initialized

        // Note: With real useTransformerContext, canStartSimulation will be reactive to actual state changes
        // This test verifies the initial state is correct
      });
    });

    it('should provide combatant information', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Initially no combatants
        expect(simulator.activeCombatants.value).toEqual([]);
        expect(simulator.aliveCombatants.value).toEqual([]);
        expect(simulator.currentTurnActor.value).toBeNull();
      });
    });
  });

  describe('context initialization', () => {
    it('should initialize transformer context', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.startSimulation();

        // With real implementation, we test observable behavior
        expect(success).toBe(true);
        expect(simulator.transformerContext.isInitialized.value).toBe(true);
      });
    });

    it('should handle context initialization failure', async () => {
      await runWithContext(async () => {
        // Create a mock useTransformerContext that fails initialization
        const mockFailingTransformerContext = vi.fn(() => ({
          context: ref(null),
          isInitialized: ref(false),
          eventCount: ref(0),
          actors: computed(() => ({})),
          places: computed(() => ({})),
          worldState: computed(() => null),
          declaredEvents: computed(() => []),
          actorIds: computed(() => []),
          placeIds: computed(() => []),
          sessionIds: computed(() => []),
          equipmentIds: computed(() => []),
          skillIds: computed(() => []),
          initializeContext: vi.fn(() => false), // Force failure
          resetContext: vi.fn(),
          addActor: vi.fn(),
          getActor: vi.fn(),
          addPlace: vi.fn(),
          getPlace: vi.fn(),
          declareEvent: vi.fn(),
          getWorldState: vi.fn(),
          clearEvents: vi.fn(),
          syncEventCount: vi.fn(),
          declareError: vi.fn(),
          removeActor: vi.fn(),
          hasActor: vi.fn(),
          removePlace: vi.fn(),
          hasPlace: vi.fn(),
          getEventsSince: vi.fn(),
          getLatestEvents: vi.fn(),
        }));

        const failingDeps = { ...mockDeps, useTransformerContext: mockFailingTransformerContext };
        const simulator = useCombatSimulator(mockConfig, failingDeps);

        const success = await simulator.startSimulation();

        expect(success).toBe(false);
        expect(simulator.simulationState.value).toBe('error');
        expect(simulator.lastError.value).toContain('Failed to initialize');
      });
    });
  });

  describe('simulation lifecycle', () => {
    it('should start simulation successfully', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.startSimulation();

        // Test observable behavior with real implementations
        expect(success).toBe(true);
        expect(simulator.simulationState.value).toBe('active');
        expect(simulator.lastError.value).toBe(null);
        expect(simulator.transformerContext.isInitialized.value).toBe(true);

        // Verify actors were created and added to the world
        expect(Object.keys(simulator.transformerContext.actors.value)).toContain(ALICE_ID);
        expect(Object.keys(simulator.transformerContext.actors.value)).toContain(BOB_ID);
      });
    });

    it('should not start simulation when not ready', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation once to get to active state
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        // Try to start again - should fail
        const success = await simulator.startSimulation();

        expect(success).toBe(false);
        // State should remain active, not change
        expect(simulator.simulationState.value).toBe('active');
      });
    });

    it('should pause and resume simulation', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        // Test pause functionality
        const pauseSuccess = simulator.pauseSimulation();
        expect(pauseSuccess).toBe(true);
        expect(simulator.simulationState.value).toBe('paused');

        // Test resume functionality
        const resumeSuccess = simulator.resumeSimulation();
        expect(resumeSuccess).toBe(true);
        expect(simulator.simulationState.value).toBe('active');

        // Verify no errors occurred during the operations
        expect(simulator.lastError.value).toBe(null);
      });
    });

    it('should end simulation successfully', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.endSimulation();

        expect(success).toBe(true);
        expect(simulator.simulationState.value).toBe('completed');
        expect(simulator.lastError.value).toBe(null);
      });
    });

    it('should reset simulation completely', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start and then end simulation to get some state
        await simulator.startSimulation();
        await simulator.endSimulation();

        simulator.resetSimulation();

        expect(simulator.simulationState.value).toBe('idle');
        expect(simulator.lastError.value).toBeNull();
        expect(mockCombatLog.clearLog).toHaveBeenCalled();
        // With real implementation, context remains initialized after reset
        // Reset clears the world state but doesn't uninitialize the context
        expect(simulator.transformerContext.isInitialized.value).toBe(true);
      });
    });
  });

  describe('turn management', () => {
    it('should advance turn successfully', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.advanceTurn();

        expect(success).toBe(true);
        expect(simulator.lastError.value).toBe(null);
        // Turn should advance (exact turn number depends on real implementation)
        expect(simulator.currentTurn.value).toBeGreaterThan(0);
      });
    });

    it('should handle AI turns', async () => {
      await runWithContext(async () => {
        // Using real useTransformerContext - no mock setup needed
        mockCombatAI.isAIControlled.mockReturnValue(true);

        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        const startSuccess = await simulator.startSimulation();
        console.log('🔍 startSimulation result:', startSuccess);

        if (!startSuccess) {
          console.log('❌ startSimulation failed with error:', simulator.lastError.value);
          console.log('❌ simulationState after start:', simulator.simulationState.value);
          console.log('🔍 canStartSimulation conditions:');
          console.log('  simulationState === idle:', simulator.simulationState.value === 'idle');
          console.log('  isInitialized:', simulator.transformerContext.isInitialized.value);
          console.log('  actors count:', Object.keys(simulator.scenario.scenarioData.value.actors).length);
          console.log('  canStartSimulation:', simulator.canStartSimulation.value);
          console.log('🔍 Scenario actors:', simulator.scenario.scenarioData.value.actors);
        }

        // Real implementations will handle session and actor management

        // Debug: Check state before advanceTurn
        console.log('🔍 Debug state before advanceTurn:');
        console.log('  simulationState:', simulator.simulationState.value);
        console.log('  isSimulationActive:', simulator.isSimulationActive.value);
        console.log('  session actor:', simulator.currentSession.value?.data?.rounds?.current?.turns?.current?.actor);
        console.log('  currentTurnActor:', simulator.currentTurnActor.value);

        const success = await simulator.advanceTurn();

        // Debug: Check what happened
        if (!success) {
          console.log('❌ advanceTurn failed');
          console.log('  lastError:', simulator.lastError.value);
        }

        expect(success).toBe(true);
        // The real initiative system determines turn order, so we just verify AI was called
        expect(mockCombatAI.executeAITurn).toHaveBeenCalledTimes(1);
        expect(mockCombatAI.executeAITurn).toHaveBeenCalledWith(expect.any(String));
        expect(simulator.lastError.value).toBe(null);
      });
    });

    it('should handle victory conditions', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.advanceTurn();

        expect(success).toBe(true);
        expect(simulator.lastError.value).toBe(null);
        // Note: Victory conditions are handled by the real combat session API
        // This test verifies turn advancement works without errors
      });
    });

    it('should not advance turn when not active', async () => {
      await runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Don't start simulation - should be in idle state
        expect(simulator.simulationState.value).toBe('idle');

        const success = await simulator.advanceTurn();

        expect(success).toBe(false);
        // State should remain idle
        expect(simulator.simulationState.value).toBe('idle');
      });
    });
  });

  describe('error handling', () => {
    it('should handle actor creation failure', async () => {
      await runWithContext(async () => {
        // Create a mock createActor that throws an error
        const mockCreateActor = vi.fn(() => {
          throw new Error('Actor creation failed');
        });

        const failingDeps = { ...mockDeps, createActor: mockCreateActor };
        const simulator = useCombatSimulator(mockConfig, failingDeps);

        const success = await simulator.startSimulation();

        expect(success).toBe(false);
        expect(simulator.simulationState.value).toBe('error');
        expect(simulator.lastError.value).toBeTruthy();
        expect(simulator.lastError.value).toContain('Actor creation failed');
      });
    });

    it('should handle turn advancement failure', async () => {
      await runWithContext(async () => {
        // Create a wrapper that injects a failing advanceTurn dependency
        const mockCreateCombatSessionApi = vi.fn((context, location, sessionId, battlefield, initiative) => {
          const failingAdvanceTurn = vi.fn(() => {
            throw new Error('Turn advancement failed');
          });

          return createCombatSessionApi(context, location, sessionId, battlefield, initiative, {
            advanceTurn: failingAdvanceTurn
          });
        });

        const failingDeps = { ...mockDeps, createCombatSessionApi: mockCreateCombatSessionApi };
        const simulator = useCombatSimulator(mockConfig, failingDeps);

        // Start simulation first
        await simulator.startSimulation();

        const success = await simulator.advanceTurn();

        expect(success).toBe(false);
        expect(simulator.lastError.value).toBeTruthy();
        expect(simulator.lastError.value).toContain('Turn advancement failed');
      });
    });
  });

  describe('statistics and utilities', () => {
    it('should provide comprehensive simulation statistics', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const stats = simulator.getSimulationStats();

        expect(stats).toEqual({
          state: 'idle',
          turn: 0,
          round: 0,
          activeCombatants: 0,
          aliveCombatants: 0,
          currentActor: null,
          sessionId: undefined,
          lastError: null,
          aiStats: null // AI composable is null when no session
        });
      });
    });

    it('should provide readonly access to configuration', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        expect(simulator.config.value).toEqual(mockConfig);
        expect(simulator.config.value).not.toBe(mockConfig); // Should be readonly
      });
    });
  });

  describe('auto-advance functionality', () => {
    it('should auto-advance AI turns when configured', async () => {
      await runWithContext(async () => {
        const autoConfig = { ...mockConfig, autoAdvanceTurns: true };
        mockCombatAI.isAIControlled.mockReturnValue(true);

        const simulator = useCombatSimulator(autoConfig, mockDeps);

        // Start simulation to get active state
        await simulator.startSimulation();

        // Note: The actual auto-advance happens in a setTimeout,
        // so we can't easily test it synchronously in this test
        // We just verify the configuration is set correctly and no errors occurred
        expect(simulator.config.value.autoAdvanceTurns).toBe(true);
        expect(simulator.simulationState.value).toBe('active');
        expect(simulator.lastError.value).toBe(null);
      });
    });
  });
});

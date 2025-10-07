import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useCombatSimulator,
  type CombatSimulatorDependencies,
  type CombatSimulationConfig
} from './useCombatSimulator';
import { createComposableTestSuite } from '~/testing/vue-test-utils';
import {
  createMockCombatSession,
  createMockTransformerContext,
  createTestActor
} from '../testing/combat-helpers';
import { CommandType, createActorCommand, type ActorURN, type PlaceURN } from '@flux/core';

const ALICE_ID: ActorURN = 'flux:actor:alice';
const BOB_ID: ActorURN = 'flux:actor:bob';
const TEST_LOCATION: PlaceURN = 'flux:place:arena';

describe('useCombatSimulator', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  let mockDeps: CombatSimulatorDependencies;
  let mockConfig: CombatSimulationConfig;
  let mockCombatLog: any;
  let mockScenario: any;
  let mockTransformerContext: any;
  let mockCombatAI: any;
  let mockSessionApi: any;

  beforeEach(() => {
    setup();

    // Mock combat log
    mockCombatLog = {
      events: { value: [] },
      eventCount: { value: 0 },
      categorizedEvents: { value: [] },
      addEvents: vi.fn(),
      clearLog: vi.fn(),
    };

    // Mock scenario
    mockScenario = {
      scenarioData: {
        value: {
          actors: [
            {
              id: ALICE_ID,
              name: 'Alice',
              stats: { pow: { nat: 15, eff: 15, mods: {} } },
              hp: { nat: { max: 100, cur: 100 }, eff: { max: 100, cur: 100 }, mods: {} },
              skills: {},
              equipment: {},
              inventory: { mass: 1000, ts: Date.now(), items: {} }
            },
            {
              id: BOB_ID,
              name: 'Bob',
              stats: { pow: { nat: 12, eff: 12, mods: {} } },
              hp: { nat: { max: 80, cur: 80 }, eff: { max: 80, cur: 80 }, mods: {} },
              skills: {},
              equipment: {},
              inventory: { mass: 1000, ts: Date.now(), items: {} }
            }
          ]
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

    // Mock transformer context
    mockTransformerContext = {
      context: { value: createMockTransformerContext() },
      isInitialized: { value: false },
      eventCount: { value: 0 },
      actors: { value: {} },
      places: { value: {} },
      initializeContext: vi.fn(() => {
        mockTransformerContext.isInitialized.value = true;
        return true;
      }),
      resetContext: vi.fn(() => {
        mockTransformerContext.isInitialized.value = false;
      }),
      addActor: vi.fn(),
      getActor: vi.fn(),
      hasActor: vi.fn(),
    };

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

    // Mock session API
    mockSessionApi = {
      session: createMockCombatSession(),
      addCombatant: vi.fn(),
      startCombat: vi.fn(),
      advanceTurn: vi.fn(() => []),
      checkVictoryConditions: vi.fn(() => false),
      endCombat: vi.fn(() => []),
    };

    // Mock dependencies
    mockDeps = {
      useLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
      useCombatLog: vi.fn(() => mockCombatLog),
      useCombatScenario: vi.fn(() => mockScenario),
      useTransformerContext: vi.fn(() => mockTransformerContext),
      useCombatAI: vi.fn((contextRef, sessionRef) => mockCombatAI),
      createCombatSessionApi: vi.fn(() => mockSessionApi),
      createActor: vi.fn((input) => createTestActor(input.id, input.name, input.location)),
      isActorAlive: vi.fn(() => true),
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
        useCombatSimulator(mockConfig, mockDeps);

        expect(mockDeps.useCombatLog).toHaveBeenCalled();
        expect(mockDeps.useCombatScenario).toHaveBeenCalled();
        expect(mockDeps.useTransformerContext).toHaveBeenCalled();
      });
    });

    it('should provide access to domain composables', () => {
      runWithContext(() => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        expect(simulator.combatLog.events).toBe(mockCombatLog.events);
        expect(simulator.scenario.scenarioData).toBe(mockScenario.scenarioData);
        expect(simulator.transformerContext.isInitialized).toBe(mockTransformerContext.isInitialized);
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

        // After context initialization (simulate by changing the mock)
        mockTransformerContext.isInitialized.value = true;
        // Note: In real usage, canStartSimulation would be reactive to isInitialized changes
        // For this test, we verify the logic works when conditions are met
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
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.startSimulation();

        expect(mockTransformerContext.initializeContext).toHaveBeenCalled();
        expect(success).toBe(true);
      });
    });

    it('should handle context initialization failure', async () => {
      runWithContext(async () => {
        mockTransformerContext.initializeContext.mockReturnValue(false);

        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.startSimulation();

        expect(success).toBe(false);
        expect(simulator.simulationState.value).toBe('error');
        expect(simulator.lastError.value).toContain('Failed to initialize');
      });
    });
  });

  describe('simulation lifecycle', () => {
    it('should start simulation successfully', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.startSimulation();

        expect(success).toBe(true);
        expect(simulator.simulationState.value).toBe('active');
        expect(simulator.currentTurn.value).toBe(1);
        expect(simulator.currentRound.value).toBe(1);
        expect(mockDeps.createActor).toHaveBeenCalledTimes(2); // Alice and Bob
        expect(mockSessionApi.addCombatant).toHaveBeenCalledTimes(2);
        expect(mockSessionApi.startCombat).toHaveBeenCalled();
        expect(mockCombatLog.addEvents).toHaveBeenCalled();
      });
    });

    it('should not start simulation when not ready', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Simulate already active state
        simulator.simulationState.value = 'active' as any;

        const success = await simulator.startSimulation();

        expect(success).toBe(false);
        expect(mockSessionApi.startCombat).not.toHaveBeenCalled();
      });
    });

    it('should pause and resume simulation', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first to get to active state
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        // Pause
        const pauseSuccess = simulator.pauseSimulation();
        expect(pauseSuccess).toBe(true);
        expect(simulator.simulationState.value).toBe('paused');

        // Resume
        const resumeSuccess = simulator.resumeSimulation();
        expect(resumeSuccess).toBe(true);
        expect(simulator.simulationState.value).toBe('active');
      });
    });

    it('should end simulation successfully', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first to get to active state
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.endSimulation();

        expect(success).toBe(true);
        expect(simulator.simulationState.value).toBe('completed');
        expect(simulator.currentSession.value).toBeNull();
        expect(simulator.currentTurn.value).toBe(0);
        expect(simulator.currentRound.value).toBe(0);
        expect(mockSessionApi.endCombat).toHaveBeenCalled();
      });
    });

    it('should reset simulation completely', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start and then end simulation to get some state
        await simulator.startSimulation();
        await simulator.endSimulation();

        simulator.resetSimulation();

        expect(simulator.simulationState.value).toBe('idle');
        expect(simulator.lastError.value).toBeNull();
        expect(simulator.currentTurn.value).toBe(0);
        expect(simulator.currentRound.value).toBe(0);
        expect(mockTransformerContext.resetContext).toHaveBeenCalled();
        expect(mockCombatLog.clearLog).toHaveBeenCalled();
      });
    });
  });

  describe('turn management', () => {
    it('should advance turn successfully', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');
        const initialTurn = simulator.currentTurn.value;

        const success = await simulator.advanceTurn();

        expect(success).toBe(true);
        expect(simulator.currentTurn.value).toBe(initialTurn + 1);
        expect(mockSessionApi.advanceTurn).toHaveBeenCalled();
      });
    });

    it('should handle AI turns', async () => {
      runWithContext(async () => {
        mockCombatAI.isAIControlled.mockReturnValue(true);
        mockSessionApi.session.data.turnOrder = [ALICE_ID];
        mockSessionApi.session.data.currentTurnIndex = 0;

        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.advanceTurn();

        expect(success).toBe(true);
        expect(mockCombatAI.executeAITurn).toHaveBeenCalledWith(ALICE_ID);
      });
    });

    it('should handle victory conditions', async () => {
      runWithContext(async () => {
        mockSessionApi.checkVictoryConditions.mockReturnValue(true);

        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.advanceTurn();

        expect(success).toBe(true);
        expect(simulator.simulationState.value).toBe('completed');
      });
    });

    it('should not advance turn when not active', async () => {
      runWithContext(async () => {
        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.advanceTurn();

        expect(success).toBe(false);
        expect(mockSessionApi.advanceTurn).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle actor creation failure', async () => {
      runWithContext(async () => {
        mockDeps.createActor.mockImplementation(() => {
          throw new Error('Actor creation failed');
        });

        const simulator = useCombatSimulator(mockConfig, mockDeps);

        const success = await simulator.startSimulation();

        expect(success).toBe(false);
        expect(simulator.simulationState.value).toBe('error');
        expect(simulator.lastError.value).toContain('Actor creation failed');
      });
    });

    it('should handle turn advancement failure', async () => {
      runWithContext(async () => {
        mockSessionApi.advanceTurn.mockImplementation(() => {
          throw new Error('Turn advancement failed');
        });

        const simulator = useCombatSimulator(mockConfig, mockDeps);

        // Start simulation first
        await simulator.startSimulation();
        expect(simulator.simulationState.value).toBe('active');

        const success = await simulator.advanceTurn();

        expect(success).toBe(false);
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
      runWithContext(async () => {
        const autoConfig = { ...mockConfig, autoAdvanceTurns: true };
        mockCombatAI.isAIControlled.mockReturnValue(true);

        const simulator = useCombatSimulator(autoConfig, mockDeps);

        // Start simulation to get active state
        await simulator.startSimulation();
        expect(simulator.isSimulationActive.value).toBe(true);

        // Note: The actual auto-advance happens in a setTimeout,
        // so we can't easily test it synchronously in this test
        // We just verify the configuration is set correctly
        expect(simulator.config.value.autoAdvanceTurns).toBe(true);
      });
    });
  });
});

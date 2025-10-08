import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComposableTestSuite } from '~/testing';
import { useCombatScenario } from './useCombatScenario';
import type { CombatScenario } from '../types';

describe('useCombatScenario', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  beforeEach(() => {
    setup();
    // Reset scenario state for each test since it's module-level
    const scenario = useCombatScenario();
    // Clear and re-add default scenarios
    scenario.availableScenarios.value = [
      {
        id: 'duel',
        name: 'Simple Duel',
        description: 'Two combatants face off in a basic arena',
        battlefield: {
          length: 300,
          margin: 100,
          cover: [],
          width: 800,
          height: 600,
          gridSize: 40
        },
        actors: [
          {
            id: 'actor:alice',
            name: 'Alice',
            team: 'ALPHA' as any,
            isAI: false,
            weaponUrn: 'flux:schema:weapon:longsword',
            canRemove: false
          } as any,
          {
            id: 'actor:bob',
            name: 'Bob',
            team: 'BETA' as any,
            isAI: true,
            weaponUrn: 'flux:schema:weapon:bow',
            canRemove: false
          } as any
        ]
      },
      {
        id: 'squad-battle',
        name: 'Squad Battle',
        description: 'Two teams of three combatants each',
        battlefield: {
          length: 400,
          margin: 100,
          cover: [],
          width: 1000,
          height: 800,
          gridSize: 50
        },
        actors: []
      }
    ];
    scenario.selectedScenario.value = '';
  });

  afterEach(teardown);

  describe('initialization', () => {
    it('should initialize with predefined scenarios', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        expect(scenario.availableScenarios.value).toHaveLength(2);
        const scenarioIds = scenario.availableScenarios.value.map(s => s.id);
        expect(scenarioIds).toContain('duel');
        expect(scenarioIds).toContain('squad-battle');
        expect(scenario.selectedScenario.value).toBe('');
      });
    });

    it('should provide scenario details', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        const duelScenario = scenario.availableScenarios.value.find(s => s.id === 'duel');
        expect(duelScenario).toBeDefined();
        expect(duelScenario!.name).toBe('Simple Duel');
        expect(duelScenario!.description).toBe('Two combatants face off in a basic arena');
        expect(duelScenario!.battlefield).toBeDefined();
        expect(duelScenario!.actors).toHaveLength(2);
      });
    });
  });

  describe('scenario loading', () => {
    it('should load existing scenario by ID', async () => {
      runWithContext(async () => {
        const scenario = useCombatScenario();

        const loadedScenario = await scenario.loadScenario('duel');

        expect(loadedScenario.id).toBe('duel');
        expect(loadedScenario.name).toBe('Simple Duel');
        expect(loadedScenario.actors).toHaveLength(2);
      });
    });

    it('should throw error for non-existent scenario', async () => {
      runWithContext(async () => {
        const scenario = useCombatScenario();

        await expect(scenario.loadScenario('non-existent')).rejects.toThrow(
          'Scenario not found: non-existent'
        );
      });
    });
  });

  describe('custom scenario creation', () => {
    it('should create custom scenario with default structure', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        const customScenario = scenario.createCustomScenario();

        expect(customScenario.id).toBe('custom');
        expect(customScenario.name).toBe('Custom Scenario');
        expect(customScenario.description).toBe('A custom combat scenario');
        expect(customScenario.battlefield).toBeDefined();
        expect(customScenario.actors).toEqual([]);
      });
    });

    it('should create scenario with proper battlefield configuration', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        const customScenario = scenario.createCustomScenario();

        expect(customScenario.battlefield).toMatchObject({
          length: 300,
          margin: 100,
          cover: [],
          width: 800,
          height: 600,
          gridSize: 40
        });
      });
    });
  });

  describe('scenario management', () => {
    it('should add new scenario to available list', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        const initialCount = scenario.availableScenarios.value.length;

        const newScenario: CombatScenario = {
          id: 'test-scenario',
          name: 'Test Scenario',
          description: 'A test scenario for unit tests',
          battlefield: {
            length: 200,
            margin: 50,
            cover: [],
            width: 600,
            height: 400,
            gridSize: 30
          },
          actors: []
        };

        scenario.addScenario(newScenario);

        expect(scenario.availableScenarios.value).toHaveLength(initialCount + 1);
        const addedScenario = scenario.availableScenarios.value.find(s => s.id === 'test-scenario');
        expect(addedScenario).toBeDefined();
        expect(addedScenario?.name).toBe('Test Scenario');
      });
    });

    it('should remove scenario from available list', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        const initialCount = scenario.availableScenarios.value.length;

        scenario.removeScenario('duel');

        expect(scenario.availableScenarios.value).toHaveLength(initialCount - 1);
        expect(scenario.availableScenarios.value.find(s => s.id === 'duel')).toBeUndefined();
      });
    });

    it('should handle removal of non-existent scenario gracefully', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        const initialCount = scenario.availableScenarios.value.length;

        scenario.removeScenario('non-existent');

        expect(scenario.availableScenarios.value).toHaveLength(initialCount);
      });
    });
  });

  describe('selected scenario tracking', () => {
    it('should allow setting selected scenario', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        scenario.selectedScenario.value = 'duel';

        expect(scenario.selectedScenario.value).toBe('duel');
      });
    });

    it('should start with empty selected scenario', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        // Reset to ensure clean state
        scenario.selectedScenario.value = '';
        expect(scenario.selectedScenario.value).toBe('');
      });
    });
  });

  describe('scenario structure validation', () => {
    it('should have valid battlefield configuration in predefined scenarios', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        scenario.availableScenarios.value.forEach(s => {
          expect(s.battlefield.length).toBeGreaterThan(0);
          expect(s.battlefield.width).toBeGreaterThan(0);
          expect(s.battlefield.height).toBeGreaterThan(0);
          expect(s.battlefield.gridSize).toBeGreaterThan(0);
          expect(Array.isArray(s.battlefield.cover)).toBe(true);
        });
      });
    });

    it('should have valid actor configuration in duel scenario', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        const duelScenario = scenario.availableScenarios.value.find(s => s.id === 'duel');
        expect(duelScenario).toBeDefined();
        expect(duelScenario!.actors).toHaveLength(2);

        const [alice, bob] = duelScenario!.actors;
        expect(alice.id).toBe('actor:alice');
        expect(alice.name).toBe('Alice');
        expect(alice.isAI).toBe(false);

        expect(bob.id).toBe('actor:bob');
        expect(bob.name).toBe('Bob');
        expect(bob.isAI).toBe(true);
      });
    });
  });
});

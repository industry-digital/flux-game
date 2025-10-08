import { ref, type Ref } from 'vue';
import type { CombatScenario } from '../types';

// Mock scenarios for demo purposes
const mockScenarios: CombatScenario[] = [
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
    actors: [] // Simplified for now
  }
];

const availableScenarios = ref<CombatScenario[]>(mockScenarios);
const selectedScenario = ref<string>('');

/**
 * Combat scenario management composable
 *
 * Provides access to predefined combat scenarios and utilities for
 * loading, creating, and managing custom scenarios.
 */
export interface CombatScenarioAPI {
  // Reactive state
  availableScenarios: Ref<CombatScenario[]>;
  selectedScenario: Ref<string>;

  // Actions
  loadScenario: (scenarioId: string) => Promise<CombatScenario>;
  createCustomScenario: () => CombatScenario;
  addScenario: (scenario: CombatScenario) => void;
  removeScenario: (scenarioId: string) => void;
}

export function useCombatScenario(): CombatScenarioAPI {
  const loadScenario = async (scenarioId: string): Promise<CombatScenario> => {
    const scenario = availableScenarios.value.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    return scenario;
  };

  const createCustomScenario = (): CombatScenario => {
    return {
      id: 'custom',
      name: 'Custom Scenario',
      description: 'A custom combat scenario',
      battlefield: {
        length: 300,
        margin: 100,
        cover: [],
        width: 800,
        height: 600,
        gridSize: 40
      },
      actors: [] // Will be populated by useActorSetup
    };
  };

  const addScenario = (scenario: CombatScenario): void => {
    availableScenarios.value.push(scenario);
  };

  const removeScenario = (scenarioId: string): void => {
    const index = availableScenarios.value.findIndex(s => s.id === scenarioId);
    if (index !== -1) {
      availableScenarios.value.splice(index, 1);
    }
  };

  return {
    availableScenarios,
    selectedScenario,
    loadScenario,
    createCustomScenario,
    addScenario,
    removeScenario
  };
}

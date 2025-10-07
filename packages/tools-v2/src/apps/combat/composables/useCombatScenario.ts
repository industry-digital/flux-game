import { ref, computed, readonly, watch } from 'vue';
import { useLocalStorage } from '~/infrastructure/storage/storage';
import { useLogger } from '~/infrastructure/logging/composables';
import type {
  CombatScenarioData,
  CombatScenarioActorData,
  ActorURN,
  WeaponSchemaURN
} from '../types';

export type CombatScenarioDependencies = {
  useLocalStorage: typeof useLocalStorage;
  useLogger: typeof useLogger;
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimeout: (timeout: NodeJS.Timeout) => void;
};

export const DEFAULT_COMBAT_SCENARIO_DEPS: Readonly<CombatScenarioDependencies> = Object.freeze({
  useLocalStorage: useLocalStorage,
  useLogger: useLogger,
  setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
  clearTimeout: (timeout: NodeJS.Timeout) => clearTimeout(timeout),
});

// Default scenario configuration
const createDefaultScenario = (): CombatScenarioData => ({
  actors: {
    'flux:actor:alice': {
      stats: { pow: 10, fin: 10, res: 10, per: 10 },
      aiControlled: false,
      weapon: 'flux:schema:weapon:longsword' as WeaponSchemaURN,
      skills: {
        'flux:skill:evasion': 0,
        'flux:skill:weapon:melee': 0
      }
    },
    'flux:actor:bob': {
      stats: { pow: 10, fin: 10, res: 10 },
      aiControlled: true, // Bob is AI-controlled by default
      weapon: 'flux:schema:weapon:longsword' as WeaponSchemaURN,
      skills: {
        'flux:skill:evasion': 0,
        'flux:skill:weapon:melee': 0
      }
    }
  }
});
/**
 * Combat scenario data management composable
 *
 * Handles scenario persistence, default creation, and data validation.
 * Provides reactive scenario data with automatic localStorage synchronization.
 *
 * Single Responsibility: Scenario data persistence and management
 */
export function useCombatScenario(
  storageKey: string = 'combat-sandbox-scenario',
  deps: CombatScenarioDependencies = DEFAULT_COMBAT_SCENARIO_DEPS,
) {
  const log = deps.useLogger('useCombatScenario');


  // Storage integration - reactive localStorage
  const [storedScenario, setStoredScenario] = deps.useLocalStorage<CombatScenarioData>(
    storageKey,
    createDefaultScenario()
  );

  // Reactive state
  const isLoaded = ref(true); // Always loaded since useLocalStorage handles initialization
  const lastSaved = ref<Date | null>(null);
  const isDirty = ref(false);

  // Computed properties
  const actorIds = computed(() =>
    Object.keys(storedScenario.value.actors) as ActorURN[]
  );

  const actorCount = computed(() => actorIds.value.length);

  const hasUnsavedChanges = computed(() => isDirty.value);

  /**
   * Load scenario from localStorage (already handled by useLocalStorage)
   */
  const loadScenario = async (): Promise<boolean> => {
    // useLocalStorage automatically handles loading, so this is mostly for API compatibility
    isDirty.value = false;
    return true;
  };

  /**
   * Save scenario to localStorage (triggers automatic save via useLocalStorage)
   */
  const saveScenario = (): boolean => {
    try {
      // Force a save by updating the stored value
      setStoredScenario(storedScenario.value);
      lastSaved.value = new Date();
      isDirty.value = false;
      return true;
    } catch (error) {
      log.error('Failed to save combat scenario:', error);
      return false;
    }
  };

  /**
   * Reset scenario to defaults
   */
  const resetToDefaults = () => {
    setStoredScenario(createDefaultScenario());
    isDirty.value = true;
  };

  /**
   * Update actor data in scenario
   */
  const updateActorData = (
    actorId: ActorURN,
    updates: Partial<CombatScenarioActorData>
  ) => {
    if (!storedScenario.value.actors[actorId]) {
      log.warn(`Actor ${actorId} not found in scenario`);
      return;
    }

    const updatedScenario = {
      ...storedScenario.value,
      actors: {
        ...storedScenario.value.actors,
        [actorId]: {
          ...storedScenario.value.actors[actorId],
          ...updates
        }
      }
    };

    setStoredScenario(updatedScenario);
    isDirty.value = true;
  };

  /**
   * Add new actor to scenario
   */
  const addActor = (actorId: ActorURN, actorData: CombatScenarioActorData) => {
    if (storedScenario.value.actors[actorId]) {
      log.warn(`Actor ${actorId} already exists in scenario`);
      return false;
    }

    const updatedScenario = {
      ...storedScenario.value,
      actors: {
        ...storedScenario.value.actors,
        [actorId]: actorData
      }
    };

    setStoredScenario(updatedScenario);
    isDirty.value = true;
    return true;
  };

  /**
   * Remove actor from scenario
   */
  const removeActor = (actorId: ActorURN): boolean => {
    if (!storedScenario.value.actors[actorId]) {
      log.warn(`Actor ${actorId} not found in scenario`);
      return false;
    }

    const { [actorId]: removed, ...remainingActors } = storedScenario.value.actors;
    const updatedScenario = {
      ...storedScenario.value,
      actors: remainingActors
    };

    setStoredScenario(updatedScenario);
    isDirty.value = true;
    return true;
  };

  /**
   * Get actor data by ID
   */
  const getActorData = (actorId: ActorURN): CombatScenarioActorData | null => {
    return storedScenario.value.actors[actorId] || null;
  };

  /**
   * Check if actor exists in scenario
   */
  const hasActor = (actorId: ActorURN): boolean => {
    return actorId in storedScenario.value.actors;
  };

  // Auto-save when data changes (debounced) - useLocalStorage handles persistence automatically
  let saveTimeout: NodeJS.Timeout | null = null;
  watch(
    () => storedScenario.value,
    () => {
      isDirty.value = true;

      // Debounced save state update after 1 second of inactivity
      if (saveTimeout) {
        deps.clearTimeout(saveTimeout);
      }

      saveTimeout = deps.setTimeout(() => {
        isDirty.value = false;
        lastSaved.value = new Date();
      }, 1000);
    },
    { deep: true }
  );

  return {
    // Reactive state (readonly to prevent external mutation)
    scenarioData: readonly(storedScenario),
    isLoaded: readonly(isLoaded),
    lastSaved: readonly(lastSaved),
    isDirty: readonly(isDirty),

    // Computed properties
    actorIds,
    actorCount,
    hasUnsavedChanges,

    // Actions
    loadScenario,
    saveScenario,
    resetToDefaults,
    updateActorData,
    addActor,
    removeActor,
    getActorData,
    hasActor,
  };
}

// Validation is handled by TypeScript types and useLocalStorage

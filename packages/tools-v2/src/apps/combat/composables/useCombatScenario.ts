import { type Ref } from 'vue';
import { useLocalStorage } from '@flux/ui';
import { type Battlefield } from '@flux/core';
import type { ActorSetupData } from '../types';

const createDefaultBattlefield = (): Readonly<Battlefield> => ({
  length: 300,
  margin: 100,
  cover: [],
});

/**
 * Combat scenario management composable
 *
 * Manages custom combat scenario state with localStorage persistence.
 * Provides battlefield configuration and actor setup persistence.
 */
export interface CombatScenarioAPI {
  // Reactive state
  actorConfig: Ref<ActorSetupData[]>;

  // Configuration
  getBattlefieldConfig: () => Battlefield;

  // Actions
  saveSetup: (actors: ActorSetupData[]) => void;
  clearSetup: () => void;
}

export function useCombatScenario(): CombatScenarioAPI {
  // Persist setup actors to localStorage
  const [actorConfig, setActorConfig] = useLocalStorage<ActorSetupData[]>('combat-scenario-setup', []);
  const battlefield = createDefaultBattlefield();

  const getBattlefieldConfig = () => battlefield;

  const saveSetup = (actors: ActorSetupData[]): void => {
    setActorConfig(actors);
  };

  const clearSetup = (): void => {
    setActorConfig([]);
  };

  return {
    actorConfig,
    getBattlefieldConfig,
    saveSetup,
    clearSetup
  };
}

import { type Ref } from 'vue';
import { useLocalStorage } from '@flux/ui';
import { createActor, PlaceURN, type Battlefield } from '@flux/core';
import type { ActorSetupData } from '../types';
import { DEFAULT_LOCATION } from '../constants';

const createDefaultBattlefield = (): Readonly<Battlefield> => ({
  length: 300,
  margin: 100,
  cover: [],
});

const createDefaultActors = (location: PlaceURN): ActorSetupData[] => [
  {
    ...createActor({
      id: 'flux:actor:alice',
      name: 'Alice',
      location,
    }),
    team: 'alpha',
    isAI: false,
    canRemove: false,
  },
  {
    ...createActor({
      id: 'flux:actor:bob',
      name: 'Bob',
      location,
    }),
    team: 'bravo',
    isAI: true,
    canRemove: false,
  }
];

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
  battlefield: Battlefield;

  // Actions
  saveSetup: (actors: ActorSetupData[]) => void;
  clearSetup: () => void;
}

export function useCombatScenario(
  battlefield = createDefaultBattlefield(),
  location: PlaceURN = DEFAULT_LOCATION,
): CombatScenarioAPI {
  // Persist setup actors to localStorage, with default actors as fallback
  const [actorConfig, setActorConfig] = useLocalStorage<ActorSetupData[]>('combat-scenario-setup', createDefaultActors(location));

  const saveSetup = (actors: ActorSetupData[]): void => {
    setActorConfig(actors);
  };

  const clearSetup = (): void => {
    setActorConfig(createDefaultActors(location));
  };

  return {
    actorConfig,
    battlefield,
    saveSetup: saveSetup,
    clearSetup
  };
}

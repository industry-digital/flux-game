import { useCallback } from 'react';
import { useStorage } from '@flux/ui';
import type { ActorURN, WeaponSchemaURN, SkillURN, SkillSchemaURN } from '@flux/core';
import { Team, Gender } from '@flux/core';
import { BASE_HP, HP_PER_RES_BONUS, DEFAULT_BASE_AP, calculateStatBonus } from '@flux/core';

export type OptionalActorName = 'charlie' | 'eric' | 'dave' | 'franz';

export interface ActorStatsInput {
  pow?: number;
  fin?: number;
  res?: number;
  int?: number;
  per?: number;
  mem?: number;
}

/**
 * Derived stats calculated from base stats
 */
export interface DerivedStats {
  hp: number;
  ap: number;
}

export interface CombatScenarioActorData {
  stats: ActorStatsInput;
  aiControlled: boolean;
  weapon: WeaponSchemaURN;
  skills: Record<SkillURN, number>;
  team: Team;
  gender: Gender;
}

export interface CombatScenarioData {
  actors: Record<ActorURN, CombatScenarioActorData>;
}

// Actor URNs for the combat scenario
export const ALICE_ID: ActorURN = 'flux:actor:alice';
export const BOB_ID: ActorURN = 'flux:actor:bob';
export const CHARLIE_ID: ActorURN = 'flux:actor:charlie';
export const ERIC_ID: ActorURN = 'flux:actor:eric';
export const DAVE_ID: ActorURN = 'flux:actor:dave';
export const FRANZ_ID: ActorURN = 'flux:actor:franz';

// Team assignments
export const TEAM_ASSIGNMENTS: Record<ActorURN, Team> = {
  [ALICE_ID]: Team.ALPHA,
  [BOB_ID]: Team.BRAVO,
  [CHARLIE_ID]: Team.ALPHA,
  [ERIC_ID]: Team.ALPHA,
  [DAVE_ID]: Team.BRAVO,
  [FRANZ_ID]: Team.BRAVO,
};

// Default combat skills for new actors
export const DEFAULT_COMBAT_SKILLS: Record<SkillSchemaURN, number> = {
  'flux:schema:skill:evasion': 0,
  'flux:schema:skill:weapon:bow': 0,
  'flux:schema:skill:weapon:melee': 0,
  'flux:schema:skill:weapon:pistol': 0,
  'flux:schema:skill:weapon:smg': 0,
  'flux:schema:skill:weapon:rifle': 0,
  'flux:schema:skill:weapon:shotgun': 0,
};

// Helper functions
export const getActorIdFromName = (name: OptionalActorName): ActorURN => {
  switch (name) {
    case 'charlie': return CHARLIE_ID;
    case 'eric': return ERIC_ID;
    case 'dave': return DAVE_ID;
    case 'franz': return FRANZ_ID;
  }
};

export const getNameFromActorId = (actorId: ActorURN): string => {
  switch (actorId) {
    case ALICE_ID: return 'Alice';
    case BOB_ID: return 'Bob';
    case CHARLIE_ID: return 'Charlie';
    case ERIC_ID: return 'Eric';
    case DAVE_ID: return 'Dave';
    case FRANZ_ID: return 'Franz';
    default: return actorId;
  }
};

export const getTeamActors = (scenarioData: CombatScenarioData, team: Team): ActorURN[] => {
  return Object.entries(scenarioData.actors)
    .filter(([, data]) => data.team === team)
    .map(([actorId]) => actorId as ActorURN);
};

export const getAvailableOptionalActors = (scenarioData: CombatScenarioData, team: Team): OptionalActorName[] => {
  const teamActors = getTeamActors(scenarioData, team);
  const optionalActors: OptionalActorName[] = team === Team.ALPHA ? ['charlie', 'eric'] : ['dave', 'franz'];

  return optionalActors.filter(name => {
    const actorId = getActorIdFromName(name);
    return !teamActors.includes(actorId);
  });
};

export interface UseCombatScenarioResult {
  scenarioData: CombatScenarioData;
  updateActorStats: (actorId: ActorURN, stats: Partial<ActorStatsInput>) => void;
  updateActorWeapon: (actorId: ActorURN, weaponUrn: WeaponSchemaURN) => void;
  updateActorSkill: (actorId: ActorURN, skillUrn: SkillSchemaURN, rank: number) => void;
  updateActorAiControl: (actorId: ActorURN, enabled: boolean) => void;
  addOptionalActor: (name: OptionalActorName, onSessionAdd?: (actorId: ActorURN, team: Team) => void) => void;
  removeOptionalActor: (name: OptionalActorName, onSessionRemove?: (actorId: ActorURN) => void) => void;
  resetScenario: () => void;
  getTeamActors: (team: Team) => ActorURN[];
  getAvailableOptionalActors: (team: Team) => OptionalActorName[];
  calculateDerivedStats: (actorId: ActorURN) => DerivedStats;
  getActorStats: (actorId: ActorURN) => ActorStatsInput;
}

export interface CombatScenarioDependencies {
  storage: Storage;
}

export const DEFAULT_COMBAT_SCENARIO_DEPS: CombatScenarioDependencies = {
  storage: typeof window !== 'undefined' ? window.localStorage : {} as Storage,
};

/**
 * Hook for managing combat scenario data persistence
 * Handles localStorage operations and scenario data mutations
 */
export function useCombatScenario(
  defaultScenario: CombatScenarioData,
  storageKey = 'combat-sandbox-scenario',
  deps: CombatScenarioDependencies = DEFAULT_COMBAT_SCENARIO_DEPS
): UseCombatScenarioResult {
  const [scenarioData, setScenarioData] = useStorage(
    storageKey,
    defaultScenario,
    deps.storage,
  );

  const updateActorStats = useCallback((actorId: ActorURN, stats: Partial<ActorStatsInput>) => {
    setScenarioData((prev: CombatScenarioData) => ({
      ...prev,
      actors: {
        ...prev.actors,
        [actorId]: {
          ...prev.actors[actorId],
          stats: {
            ...prev.actors[actorId]?.stats,
            ...stats
          }
        }
      }
    }));
  }, [setScenarioData]);

  const updateActorWeapon = useCallback((actorId: ActorURN, weaponUrn: WeaponSchemaURN) => {
    setScenarioData((prev: CombatScenarioData) => ({
      ...prev,
      actors: {
        ...prev.actors,
        [actorId]: {
          ...prev.actors[actorId],
          weapon: weaponUrn
        }
      }
    }));
  }, [setScenarioData]);

  const updateActorSkill = useCallback((actorId: ActorURN, skillUrn: SkillSchemaURN, rank: number) => {
    setScenarioData((prev: CombatScenarioData) => ({
      ...prev,
      actors: {
        ...prev.actors,
        [actorId]: {
          ...prev.actors[actorId],
          skills: {
            ...prev.actors[actorId]?.skills,
            [skillUrn]: rank
          }
        }
      }
    }));
  }, [setScenarioData]);

  const updateActorAiControl = useCallback((actorId: ActorURN, enabled: boolean) => {
    setScenarioData((prev: CombatScenarioData) => ({
      ...prev,
      actors: {
        ...prev.actors,
        [actorId]: {
          ...prev.actors[actorId],
          aiControlled: enabled
        }
      }
    }));
  }, [setScenarioData]);

  const addOptionalActor = useCallback((name: OptionalActorName, onSessionAdd?: (actorId: ActorURN, team: Team) => void) => {
    const actorId = getActorIdFromName(name);
    const team = TEAM_ASSIGNMENTS[actorId];

    const defaultData: CombatScenarioActorData = {
      stats: { pow: 10, fin: 10, res: 10, int: 10, per: 10, mem: 10 },
      aiControlled: true, // Optional actors are AI-controlled by default
      weapon: 'flux:schema:weapon:longsword' as WeaponSchemaURN,
      skills: { ...DEFAULT_COMBAT_SKILLS },
      team,
      gender: Gender.MALE // Default gender for optional actors
    };

    setScenarioData((prev: CombatScenarioData) => ({
      ...prev,
      actors: {
        ...prev.actors,
        [actorId]: defaultData
      }
    }));

    // Notify session to add combatant
    if (onSessionAdd) {
      onSessionAdd(actorId, team);
    }
  }, [setScenarioData]);

  const removeOptionalActor = useCallback((name: OptionalActorName, onSessionRemove?: (actorId: ActorURN) => void) => {
    const actorId = getActorIdFromName(name);

    setScenarioData((prev: CombatScenarioData) => {
      const newActors = { ...prev.actors };
      delete newActors[actorId];
      return {
        ...prev,
        actors: newActors
      };
    });

    // Notify session to remove combatant
    if (onSessionRemove) {
      onSessionRemove(actorId);
    }
  }, [setScenarioData]);

  const resetScenario = useCallback(() => {
    setScenarioData(defaultScenario);
  }, [setScenarioData, defaultScenario]);

  const getTeamActorsCallback = useCallback((team: Team) =>
    getTeamActors(scenarioData, team), [scenarioData]);

  const getAvailableOptionalActorsCallback = useCallback((team: Team) =>
    getAvailableOptionalActors(scenarioData, team), [scenarioData]);

  const calculateDerivedStats = useCallback((actorId: ActorURN): DerivedStats => {
    const actorData = scenarioData.actors[actorId];
    if (!actorData) {
      throw new Error(`Actor ${actorId} not found in scenario data`);
    }

    const { res = 10 } = actorData.stats;

    // Calculate HP using the same formula as the core game logic
    const resBonus = calculateStatBonus(res);
    const hp = BASE_HP + (resBonus * HP_PER_RES_BONUS);

    // AP is fixed at MAX_AP for all actors
    const ap = DEFAULT_BASE_AP;

    return {
      hp,
      ap,
    };
  }, [scenarioData]);

  const getActorStats = useCallback((actorId: ActorURN): ActorStatsInput => {
    const actorData = scenarioData.actors[actorId];
    if (!actorData) {
      throw new Error(`Actor ${actorId} not found in scenario data`);
    }
    return { ...actorData.stats };
  }, [scenarioData]);

  return {
    scenarioData,
    updateActorStats,
    updateActorWeapon,
    updateActorSkill,
    updateActorAiControl,
    addOptionalActor,
    removeOptionalActor,
    resetScenario,
    getTeamActors: getTeamActorsCallback,
    getAvailableOptionalActors: getAvailableOptionalActorsCallback,
    calculateDerivedStats,
    getActorStats,
  };
}

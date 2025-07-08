/**
 * React integration utilities for worldgen library
 * Demonstrates how to use the pure, deterministic worldgen library in React context
 */

import { generateWorld, generateEcosystemSlice, EcosystemName } from './index';
import { analyzeAntiEquilibrium } from './test';
import { WorldGenerationConfig, GeneratedWorld, GAEAPlace } from './types';

/**
 * React hook for world generation
 * This would be used in a React component with proper React imports
 */
export interface WorldGenerationHook {
  world: GeneratedWorld | null;
  loading: boolean;
  error: string | null;
  regenerateWorld: (config?: Partial<WorldGenerationConfig>) => Promise<void>;
  generateSlice: (ecosystem: EcosystemName, config?: Partial<WorldGenerationConfig>) => GAEAPlace[];
  analyzeAntiEquilibrium: () => ReturnType<typeof analyzeAntiEquilibrium> | null;
}

/**
 * Factory function to create worldgen hook
 * Usage: const useWorldGeneration = createWorldGenerationHook();
 */
export function createWorldGenerationHook() {
  return function useWorldGeneration(initialConfig?: Partial<WorldGenerationConfig>): WorldGenerationHook {
    // In a real React app, these would be useState hooks
    let world: GeneratedWorld | null = null;
    let loading = false;
    let error: string | null = null;

    const regenerateWorld = async (newConfig?: Partial<WorldGenerationConfig>) => {
      loading = true;
      error = null;

      try {
        // Simulate async generation for better UX
        await new Promise(resolve => setTimeout(resolve, 100));

        const finalConfig = { ...initialConfig, ...newConfig } as WorldGenerationConfig;
        const newWorld = generateWorld(finalConfig);
        world = newWorld;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to generate world';
      } finally {
        loading = false;
      }
    };

    const generateSlice = (ecosystem: EcosystemName, sliceConfig?: Partial<WorldGenerationConfig>) => {
      const finalConfig = { ...initialConfig, ...sliceConfig } as WorldGenerationConfig;
      return generateEcosystemSlice(ecosystem, finalConfig);
    };

    const analyzeAntiEquilibriumResult = () => {
      if (!world) return null;
      return analyzeAntiEquilibrium(world.places);
    };

    return {
      world,
      loading,
      error,
      regenerateWorld,
      generateSlice,
      analyzeAntiEquilibrium: analyzeAntiEquilibriumResult
    };
  };
}

/**
 * React component state interface
 */
export interface WorldGenComponentState {
  world: GeneratedWorld | null;
  selectedEcosystem: EcosystemName | null;
  randomSeed: number;
  isGenerating: boolean;
  antiEquilibriumAnalysis: ReturnType<typeof analyzeAntiEquilibrium> | null;
}

/**
 * React component actions
 */
export interface WorldGenComponentActions {
  generateNewWorld: (seed?: number) => Promise<void>;
  setSelectedEcosystem: (ecosystem: EcosystemName | null) => void;
  setRandomSeed: (seed: number) => void;
  filterByEcosystem: (ecosystem: EcosystemName) => GAEAPlace[];
  groupByTopologyZone: () => Record<string, GAEAPlace[]>;
}

/**
 * Component logic for worldgen React integration
 */
export function createWorldGenComponentLogic(
  initialConfig?: Partial<WorldGenerationConfig>
): {
  state: WorldGenComponentState;
  actions: WorldGenComponentActions;
} {
  const state: WorldGenComponentState = {
    world: null,
    selectedEcosystem: null,
    randomSeed: 42,
    isGenerating: false,
    antiEquilibriumAnalysis: null
  };

  const actions: WorldGenComponentActions = {
    generateNewWorld: async (seed?: number) => {
      state.isGenerating = true;

      try {
        // Simulate async generation
        await new Promise(resolve => setTimeout(resolve, 100));

        const config: WorldGenerationConfig = {
          ...initialConfig,
          random_seed: seed || state.randomSeed
        } as WorldGenerationConfig;

        const newWorld = generateWorld(config);
        state.world = newWorld;
        state.antiEquilibriumAnalysis = analyzeAntiEquilibrium(newWorld.places);
      } finally {
        state.isGenerating = false;
      }
    },

    setSelectedEcosystem: (ecosystem: EcosystemName | null) => {
      state.selectedEcosystem = ecosystem;
    },

    setRandomSeed: (seed: number) => {
      state.randomSeed = seed;
    },

    filterByEcosystem: (ecosystem: EcosystemName) => {
      if (!state.world) return [];
      return state.world.places.filter(place => place.ecology.ecosystem === ecosystem);
    },

    groupByTopologyZone: () => {
      if (!state.world) return {};
      return state.world.places.reduce((zones, place) => {
        zones[place.topology_zone] = zones[place.topology_zone] || [];
        zones[place.topology_zone].push(place);
        return zones;
      }, {} as Record<string, GAEAPlace[]>);
    }
  };

  return { state, actions };
}

/**
 * Utility functions for React integration
 */
export const WorldGenUtils = {
  /**
   * Format world summary for display
   */
  formatWorldSummary: (world: GeneratedWorld) => ({
    totalPlaces: world.places.length,
    infectionZones: world.infection_zones.length,
    worshipperTerritories: world.worshipper_territories.length,
    worldRadius: world.topology.ecosystem_slices.outer_radius,
    ecosystemCounts: world.places.reduce((counts, place) => {
      counts[place.ecology.ecosystem] = (counts[place.ecology.ecosystem] || 0) + 1;
      return counts;
    }, {} as Record<string, number>)
  }),

  /**
   * Calculate ecosystem statistics
   */
  calculateEcosystemStats: (places: GAEAPlace[]) => {
    if (places.length === 0) return null;

    return {
      count: places.length,
      avgInfectionRisk: places.reduce((sum, p) => sum + p.cordyceps_habitat.infection_risk, 0) / places.length,
      avgGaeaOptimization: places.reduce((sum, p) => sum + p.gaea_management.optimization_level, 0) / places.length,
      avgWorshipperPresence: places.reduce((sum, p) => sum + p.gaea_management.worshipper_presence, 0) / places.length,
      fungalCultivationSites: places.filter(p => p.cordyceps_habitat.gaea_cultivation).length
    };
  },

  /**
   * Generate color intensity for G.A.E.A. management visualization
   */
  getGaeaIntensityColor: (place: GAEAPlace) => {
    const intensity = place.gaea_management.optimization_level;
    return {
      backgroundColor: `rgba(255, 0, 0, ${intensity})`,
      border: place.cordyceps_habitat.gaea_cultivation ? '2px solid green' : '1px solid gray'
    };
  },

  /**
   * Format anti-equilibrium analysis for display
   */
  formatAntiEquilibriumAnalysis: (analysis: ReturnType<typeof analyzeAntiEquilibrium>) => ({
    gaeaGradient: analysis.gaea_intensity_gradient.toFixed(3),
    fungalVariance: analysis.fungal_cultivation_variance.toFixed(3),
    territorialChaos: analysis.worshipper_territorial_chaos.toFixed(3),
    ecosystemDiversity: analysis.ecosystem_diversity_index.toFixed(3),
    infectionDistribution: analysis.infection_risk_distribution.toFixed(3),
    antiEquilibriumScore: [
      analysis.gaea_intensity_gradient > 0.3,
      analysis.fungal_cultivation_variance > 0.05,
      analysis.worshipper_territorial_chaos > 0.2,
      analysis.ecosystem_diversity_index > 0.5,
      analysis.infection_risk_distribution > 0.1
    ].filter(Boolean).length
  })
};

/**
 * Example React component usage (pseudo-code)
 */
export const REACT_USAGE_EXAMPLE = `
import React, { useState, useEffect, useMemo } from 'react';
import { createWorldGenerationHook, WorldGenUtils } from './worldgen/react-integration';

const useWorldGeneration = createWorldGenerationHook();

export const WorldGenComponent = () => {
  const { world, loading, regenerateWorld, analyzeAntiEquilibrium } = useWorldGeneration();
  const [seed, setSeed] = useState(42);

  useEffect(() => {
    regenerateWorld({ random_seed: seed });
  }, [seed]);

  const worldSummary = useMemo(() =>
    world ? WorldGenUtils.formatWorldSummary(world) : null
  , [world]);

  const antiEquilibrium = useMemo(() =>
    analyzeAntiEquilibrium() ? WorldGenUtils.formatAntiEquilibriumAnalysis(analyzeAntiEquilibrium()) : null
  , [world]);

  return (
    <div>
      <h2>FLUX World Generation</h2>

      <input
        type="number"
        value={seed}
        onChange={(e) => setSeed(Number(e.target.value))}
      />

      <button onClick={() => regenerateWorld({ random_seed: seed })}>
        Generate World
      </button>

      {loading && <div>Generating...</div>}

      {worldSummary && (
        <div>
          <h3>World Summary</h3>
          <p>Places: {worldSummary.totalPlaces}</p>
          <p>Infection Zones: {worldSummary.infectionZones}</p>
          <p>Worshipper Territories: {worldSummary.worshipperTerritories}</p>
        </div>
      )}

      {antiEquilibrium && (
        <div>
          <h3>Anti-Equilibrium Analysis</h3>
          <p>G.A.E.A. Gradient: {antiEquilibrium.gaeaGradient}</p>
          <p>Fungal Variance: {antiEquilibrium.fungalVariance}</p>
          <p>Score: {antiEquilibrium.antiEquilibriumScore}/5</p>
        </div>
      )}
    </div>
  );
};
`;

/**
 * Export everything for easy integration
 */
export {
  generateWorld,
  generateEcosystemSlice
} from './index';

export { analyzeAntiEquilibrium } from './test';

export type {
  WorldGenerationConfig,
  GeneratedWorld,
  GAEAPlace,
  EcosystemName
} from './types';

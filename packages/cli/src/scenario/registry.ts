/**
 * Scenario Registry
 *
 * Central registry for all available game scenarios.
 * Provides type-safe scenario loading and discovery.
 */

import { ActorURN, TransformerContext, WorldScenarioHook } from '@flux/core';
import { createDefaultWorldScenario } from './default';
import { ScenarioResolver } from '~/types';

// ===== SCENARIO TYPES =====

export type ScenarioMetadata = {
  readonly name: string;
  readonly description: string;
  readonly factory: ScenarioResolver;
};

export type ScenarioId = string;

// ===== SCENARIO REGISTRY =====

const SCENARIOS = new Map<ScenarioId, ScenarioMetadata>([
  ['default', {
    name: 'Default Scenario',
    description: 'Alice and Bob in Origin with basic equipment and currency',
    factory: createDefaultWorldScenario,
  }],
  // Add more scenarios here as they're created
]);

// ===== REGISTRY OPERATIONS =====

export const getScenario = (id: ScenarioId): ScenarioMetadata | undefined => {
  return SCENARIOS.get(id);
};

export const loadScenario = (
  context: TransformerContext,
  id: ScenarioId,
  setCurrentActor: (actorId: ActorURN) => void
): WorldScenarioHook => {
  const scenario = SCENARIOS.get(id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}. Available scenarios: ${getAvailableScenarios().join(', ')}`);
  }
  return scenario.factory(context, setCurrentActor);
};

export const getAvailableScenarios = (): readonly ScenarioId[] => {
  // Not in the hot path, so we can allocate freely
  return Array.from(SCENARIOS.keys());
};

export const getAllScenarios = (): readonly ScenarioMetadata[] => {
  // Not in the hot path, so we can allocate freely
  return Array.from(SCENARIOS.values());
};

export const hasScenario = (id: ScenarioId): boolean => {
  return SCENARIOS.has(id);
};

// ===== SCENARIO REGISTRATION =====

export const registerScenario = (
  id: ScenarioId,
  metadata: ScenarioMetadata
): void => {
  if (SCENARIOS.has(id)) {
    throw new Error(`Scenario ${id} is already registered`);
  }
  SCENARIOS.set(id, metadata);
};

// ===== DEFAULT SCENARIO =====

export const DEFAULT_SCENARIO_ID = 'default' as const;

export const loadDefaultScenario = (
  context: TransformerContext,
  setCurrentActor: (actorId: ActorURN) => void
): WorldScenarioHook => {
  return loadScenario(context, DEFAULT_SCENARIO_ID, setCurrentActor);
};

// ===== SCENARIO SELECTION HELPERS =====

export const getScenarioFromEnvironment = (
  env = process.env,
  console = global.console,
): ScenarioId => {
  const envScenario = env.FLUX_SCENARIO;
  if (envScenario) {
    if (hasScenario(envScenario)) {
      return envScenario;
    }
    console.warn(`Unknown scenario: ${envScenario}. Using default.`);
  }
  return DEFAULT_SCENARIO_ID;
};

export const getScenarioFromArgs = (
  args: string[] = process.argv,
  console = global.console,
): ScenarioId => {
  const scenarioIndex = args.findIndex(arg => arg === '--scenario');
  if (scenarioIndex !== -1 && scenarioIndex + 1 < args.length) {
    const scenarioId = args[scenarioIndex + 1];
    if (hasScenario(scenarioId)) {
      return scenarioId;
    }
    console.warn(`Unknown scenario: ${scenarioId}. Using \`default\`.`);
  }
  return DEFAULT_SCENARIO_ID;
};

export const resolveScenarioId = (args?: string[]): ScenarioId => {
  // Priority: CLI args > environment > default
  const fromArgs = getScenarioFromArgs(args);
  if (fromArgs !== DEFAULT_SCENARIO_ID) {
    return fromArgs;
  }

  const fromEnv = getScenarioFromEnvironment();
  if (fromEnv !== DEFAULT_SCENARIO_ID) {
    return fromEnv;
  }

  return DEFAULT_SCENARIO_ID;
};

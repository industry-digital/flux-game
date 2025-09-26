import { CombatMetrics } from '~/types/handler';

/**
 * Pure functional metrics state - immutable data structure
 */
export type CombatMetricsState = {
  readonly timings: ReadonlyMap<string, readonly number[]>;
  readonly counters: ReadonlyMap<string, number>;
  readonly values: ReadonlyMap<string, readonly number[]>;
};

/**
 * Creates an empty metrics state
 */
export const createEmptyMetricsState = (): CombatMetricsState => ({
  timings: new Map(),
  counters: new Map(),
  values: new Map(),
});

/**
 * Pure function to record a timing measurement
 */
export const recordTiming = (
  state: CombatMetricsState,
  metric: string,
  duration: number
): CombatMetricsState => {
  const existingTimings = state.timings.get(metric) || [];
  const newTimings = new Map(state.timings);
  newTimings.set(metric, [...existingTimings, duration]);

  return {
    ...state,
    timings: newTimings,
  };
};

/**
 * Pure function to increment a counter
 */
export const incrementCounter = (
  state: CombatMetricsState,
  metric: string
): CombatMetricsState => {
  const currentCount = state.counters.get(metric) || 0;
  const newCounters = new Map(state.counters);
  newCounters.set(metric, currentCount + 1);

  return {
    ...state,
    counters: newCounters,
  };
};

/**
 * Pure function to record a value measurement
 */
export const recordValue = (
  state: CombatMetricsState,
  metric: string,
  value: number
): CombatMetricsState => {
  const existingValues = state.values.get(metric) || [];
  const newValues = new Map(state.values);
  newValues.set(metric, [...existingValues, value]);

  return {
    ...state,
    values: newValues,
  };
};

/**
 * Pure function to get summary statistics for a metric
 */
export const getMetricSummary = (
  state: CombatMetricsState,
  metric: string
): {
  count: number;
  timings: { count: number; total: number; avg: number; min: number; max: number } | null;
  values: { count: number; total: number; avg: number; min: number; max: number } | null;
} => {
  const count = state.counters.get(metric) || 0;

  const timings = state.timings.get(metric);
  const timingSummary = timings && timings.length > 0 ? {
    count: timings.length,
    total: timings.reduce((sum, t) => sum + t, 0),
    avg: timings.reduce((sum, t) => sum + t, 0) / timings.length,
    min: Math.min(...timings),
    max: Math.max(...timings),
  } : null;

  const values = state.values.get(metric);
  const valueSummary = values && values.length > 0 ? {
    count: values.length,
    total: values.reduce((sum, v) => sum + v, 0),
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  } : null;

  return {
    count,
    timings: timingSummary,
    values: valueSummary,
  };
};

/**
 * Creates a stateful CombatMetrics API that wraps the pure functions
 * This provides the interface expected by the combat system while maintaining purity
 */
export const createCombatMetricsApi = (
  onStateChange?: (state: CombatMetricsState) => void
): CombatMetrics & { getState: () => CombatMetricsState } => {
  let state = createEmptyMetricsState();

  const updateState = (newState: CombatMetricsState) => {
    state = newState;
    onStateChange?.(state);
  };

  return {
    recordTiming: (metric: string, duration: number): void => {
      updateState(recordTiming(state, metric, duration));
    },

    incrementCounter: (metric: string): void => {
      updateState(incrementCounter(state, metric));
    },

    recordValue: (metric: string, value: number): void => {
      updateState(recordValue(state, metric, value));
    },

    getState: (): CombatMetricsState => state,
  };
};

/**
 * Creates a no-op metrics implementation for production use
 */
export const createNoOpCombatMetrics = (): CombatMetrics => ({
  recordTiming: () => {},
  incrementCounter: () => {},
  recordValue: () => {},
});

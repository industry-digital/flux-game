/**
 * Units of time in our simulation. These are used to express temporal durations
 * within the game world, such as effect durations, skill cooldowns, and event timing.
 */
export enum TimeUnit {
  // Combat-specific time units
  COMBAT_TURN = 'turn',  // A single combat turn
  // Standard time units with consistent abbreviations
  MILLISECOND = 'ms',
  SECOND = 's',
  MINUTE = 'm',
  HOUR = 'h',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  SEASON = 'season', // For seasonal effects/events
  YEAR = 'year',
}

/**
 * Special duration values that aren't expressed in standard time units
 */
export enum SpecialDuration {
  INSTANT = 'instant', // Takes effect immediately and doesn't last
  INDEFINITE = 'indefinite', // Lasts for an unspecified duration, often until a condition is met
  PERMANENT = 'permanent', // Lasts indefinitely until explicitly removed
}

/**
 * Common time periods expressed as milliseconds for resource generation,
 * cooldowns, and other timing calculations where performance matters.
 */
export enum WellKnownDuration {
  MILLISECOND = 1,
  SECOND = 1_000,
  MINUTE = 60 * 1_000,
  HOUR = 60 * 60 * 1_000,
  DAY = 24 * 60 * 60 * 1_000,
  WEEK = 7 * 24 * 60 * 60 * 1_000,

  // Combat and short-term durations
  COMBAT_TURN = 6 * 1_000, // 6 seconds per combat turn
  SHORT_COOLDOWN = 10 * 1_000, // 10 seconds
  MEDIUM_COOLDOWN = 30 * 1_000, // 30 seconds
  LONG_COOLDOWN = 5 * 60 * 1_000, // 5 minutes
}

/**
 * A duration in the game world, expressed either as a quantity of a TimeUnit
 * (e.g. "5min" for 5 minutes) or as a SpecialDuration.
 */
export type Duration = SpecialDuration | `${number}${TimeUnit}`;

/**
 * A mixin for anything that has
 */
export type ScheduledDuration = {
  /**
   * The duration
   */
  duration: Duration; // The duration of the modifier

  /**
   * The moment the duration started, expressed as milliseconds since the UNIX epoch
   */
  ts: number; // The moment the modifier was applied, expressed as milliseconds since the UNIX epoch
}

// Time in the simulation progresses at the same rate as real time.
// So every human day is 1 day in the simulation.
export const GLOBAL_TIME_SCALE = 1.0;

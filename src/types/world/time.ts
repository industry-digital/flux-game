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
 * A duration in the game world, expressed either as a quantity of a TimeUnit
 * (e.g. "5min" for 5 minutes) or as a SpecialDuration.
 */
export type Duration = SpecialDuration | [number, TimeUnit];

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

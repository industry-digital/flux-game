/**
 * Narrative Utilities
 *
 * Global utilities for narrative template functions that can be used
 * across all event types and domains.
 */

export {
  // Core composable utilities
  withSystemEventFilter,
  withActorValidation,
  withActorAndTargetValidation,
  withSystemEventOnly,

  // Convenience combinations
  withUserEventValidation,
  withInteractionValidation,

  // Template creators
  createPerspectiveTemplate,
  createSystemTemplate,
  createSystemPerspectiveTemplate,
  createDynamicSystemPerspectiveTemplate,

  // Helper utilities
  getWeaponInfo,
  formatDistance,
  formatApCost,
} from './perspective';

import { ref, computed, readonly } from 'vue';
import type { WorldEvent } from '@flux/core';
import type { CombatLogEntry } from '../types';

/**
 * Combat log management composable
 *
 * Handles combat event logging with automatic deduplication,
 * filtering, and narrative enhancement capabilities.
 *
 * Migrated from React useCombatLog hook with Vue reactivity improvements.
 */
export function useCombatLog(maxEntries: number = 1000) {
  // Reactive state
  const entries = ref<CombatLogEntry[]>([]);
  const filters = ref<Set<string>>(new Set());

  // Computed properties
  const filteredEntries = computed(() => {
    if (filters.value.size === 0) {
      return entries.value;
    }

    return entries.value.filter(entry =>
      filters.value.has(entry.type) ||
      (entry.category && filters.value.has(entry.category))
    );
  });

  const entryCount = computed(() => entries.value.length);
  const hasEntries = computed(() => entries.value.length > 0);

  /**
   * Add new events to the log with automatic deduplication
   */
  const addEvents = (events: WorldEvent[]) => {
    if (events.length === 0) return;

    // Convert WorldEvents to CombatLogEntries with enhanced metadata
    const newEntries: CombatLogEntry[] = events.map(event => ({
      ...event,
      category: categorizeEvent(event),
      narrative: generateNarrative(event),
    }));

    // Deduplicate by ID
    const existingIds = new Set(entries.value.map(e => e.id));
    const uniqueNewEntries = newEntries.filter(e => !existingIds.has(e.id));

    if (uniqueNewEntries.length === 0) return;

    // Add new entries and enforce max limit
    const updatedEntries = [...entries.value, ...uniqueNewEntries];

    // Keep only the most recent entries if we exceed the limit
    if (updatedEntries.length > maxEntries) {
      entries.value = updatedEntries.slice(-maxEntries);
    } else {
      entries.value = updatedEntries;
    }
  };

  /**
   * Set the entire log (replaces all entries)
   */
  const setLog = (events: WorldEvent[]) => {
    const logEntries: CombatLogEntry[] = events.map(event => ({
      ...event,
      category: categorizeEvent(event),
      narrative: generateNarrative(event),
    }));

    entries.value = logEntries.slice(-maxEntries);
  };

  /**
   * Clear all log entries
   */
  const clearLog = () => {
    entries.value = [];
  };

  /**
   * Add filter for event types or categories
   */
  const addFilter = (filter: string) => {
    filters.value.add(filter);
  };

  /**
   * Remove filter
   */
  const removeFilter = (filter: string) => {
    filters.value.delete(filter);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    filters.value.clear();
  };

  /**
   * Get the most recent entry
   */
  const getLatestEntry = () => {
    return entries.value[entries.value.length - 1] || null;
  };

  /**
   * Get entries by type
   */
  const getEntriesByType = (type: string) => {
    return entries.value.filter(entry => entry.type === type);
  };

  return {
    // Reactive state (readonly to prevent external mutation)
    entries: readonly(entries),
    filteredEntries,
    filters: readonly(filters),

    // Computed properties
    entryCount,
    hasEntries,

    // Actions
    addEvents,
    setLog,
    clearLog,
    addFilter,
    removeFilter,
    clearFilters,
    getLatestEntry,
    getEntriesByType,
  };
}

/**
 * Categorize events for better filtering and display
 */
function categorizeEvent(event: WorldEvent): CombatLogEntry['category'] {
  const type = event.type.toLowerCase();

  if (type.includes('damage') || type.includes('hit') || type.includes('die')) {
    return 'damage';
  }

  if (type.includes('turn') || type.includes('initiative')) {
    return 'turn';
  }

  if (type.includes('attack') || type.includes('defend') || type.includes('move')) {
    return 'action';
  }

  return 'system';
}

/**
 * Generate human-readable narrative for events
 * This can be enhanced with more sophisticated narrative generation
 */
function generateNarrative(event: WorldEvent): string {
  // For now, return a simple narrative based on event type
  // This can be expanded with more sophisticated narrative generation
  const type = event.type;
  const actorName = event.actor ? extractActorName(event.actor) : 'Unknown';

  // Use string matching instead of strict enum comparison for flexibility
  if (type.includes('TURN_DID_START')) {
    return `${actorName}'s turn begins`;
  }

  if (type.includes('TURN_DID_END')) {
    return `${actorName}'s turn ends`;
  }

  if (type.includes('DID_ATTACK')) {
    return `${actorName} attacks`;
  }

  if (type.includes('DID_DEFEND')) {
    return `${actorName} defends`;
  }

  if (type.includes('TAKE_DAMAGE')) {
    return `${actorName} takes damage`;
  }

  if (type.includes('DID_DIE')) {
    return `${actorName} is defeated`;
  }

  return `${actorName}: ${type}`;
}

/**
 * Extract readable name from actor URN
 */
function extractActorName(actorUrn: string): string {
  const parts = actorUrn.split(':');
  const name = parts[parts.length - 1];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

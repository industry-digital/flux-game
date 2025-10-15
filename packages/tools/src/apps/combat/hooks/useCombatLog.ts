import { useState, useCallback, useMemo } from 'react';
import type { WorldEvent } from '@flux/core';

export interface UseCombatLogResult {
  /**
   * Current combat log entries
   */
  combatLog: WorldEvent[];
  /**
   * Add new events to the log
   */
  addEvents: (events: WorldEvent[]) => void;
  /**
   * Set the entire log (replaces all entries)
   */
  setLog: (events: WorldEvent[]) => void;
  /**
   * Clear all log entries
   */
  clearLog: () => void;
}

/**
 * Hook for managing combat event logs.
 *
 * Assumes events are never duplicated at the source, so no deduplication
 * is performed for optimal performance.
 */
export function useCombatLog(): UseCombatLogResult {
  const [combatLog, setCombatLog] = useState<WorldEvent[]>([]);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const addEvents = useCallback((events: WorldEvent[]) => {
    if (events.length === 0) return;
    setLastEventId(events[events.length - 1].id);
    setCombatLog(prev => [...prev, ...events]);
  }, []);

  const setLog = useCallback((events: WorldEvent[]) => {
    setCombatLog(events);
  }, []);

  const clearLog = useCallback(() => {
    setCombatLog([]);
  }, []);

  return useMemo(() => ({
    combatLog,
    lastEventId,
    addEvents,
    setLog,
    clearLog,
  }), [combatLog, lastEventId]);
}

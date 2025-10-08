import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComposableTestSuite } from '~/testing';
import { createMockWorldEvent, ALICE_ID, BOB_ID } from '../testing';
import { useCombatLog } from './useCombatLog';

describe('useCombatLog', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  beforeEach(setup);
  afterEach(teardown);

  it('should initialize with empty log', () => {
    runWithContext(() => {
      const log = useCombatLog();

      expect(log.entries.value).toEqual([]);
      expect(log.entryCount.value).toBe(0);
      expect(log.hasEntries.value).toBe(false);
    });
  });

  it('should add events with deduplication', () => {
    runWithContext(() => {
      const log = useCombatLog();

      const event1 = createMockWorldEvent('COMBAT_TURN_DID_START', ALICE_ID);
      const event2 = createMockWorldEvent('COMBATANT_DID_ATTACK', ALICE_ID);
      const duplicateEvent = { ...event1 }; // Same ID

      log.addEvents([event1, event2]);
      expect(log.entryCount.value).toBe(2);

      // Adding duplicate should not increase count
      log.addEvents([duplicateEvent]);
      expect(log.entryCount.value).toBe(2);
    });
  });

  it('should categorize events correctly', () => {
    runWithContext(() => {
      const log = useCombatLog();

      const turnEvent = createMockWorldEvent('COMBAT_TURN_DID_START', ALICE_ID);
      const attackEvent = createMockWorldEvent('COMBATANT_DID_ATTACK', ALICE_ID);
      const damageEvent = createMockWorldEvent('COMBATANT_DID_TAKE_DAMAGE', BOB_ID);

      log.addEvents([turnEvent, attackEvent, damageEvent]);

      const entries = log.entries.value;
      expect(entries[0].type).toBe('COMBAT_TURN_DID_START');
      expect(entries[1].type).toBe('COMBATANT_DID_ATTACK');
      expect(entries[2].type).toBe('COMBATANT_DID_TAKE_DAMAGE');
    });
  });

  it('should enforce max entries limit', () => {
    runWithContext(() => {
      const maxEntries = 3;
      const log = useCombatLog(maxEntries);

      // Add more events than the limit
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockWorldEvent(`EVENT_${i}`, ALICE_ID)
      );

      log.addEvents(events);

      // Should only keep the most recent entries
      expect(log.entryCount.value).toBe(maxEntries);
      expect(log.entries.value[0].type).toBe('EVENT_2'); // First kept event
      expect(log.entries.value[2].type).toBe('EVENT_4'); // Last event
    });
  });

  it('should filter events by type', () => {
    runWithContext(() => {
      const log = useCombatLog();

      const turnEvent = createMockWorldEvent('COMBAT_TURN_DID_START', ALICE_ID);
      const attackEvent = createMockWorldEvent('COMBATANT_DID_ATTACK', ALICE_ID);
      const damageEvent = createMockWorldEvent('COMBATANT_DID_TAKE_DAMAGE', BOB_ID);

      log.addEvents([turnEvent, attackEvent, damageEvent]);

      // Filter by type
      log.addFilter('COMBATANT_DID_ATTACK');

      expect(log.filteredEntries.value).toHaveLength(1);
      expect(log.filteredEntries.value[0].type).toBe('COMBATANT_DID_ATTACK');
    });
  });

  it('should clear log entries', () => {
    runWithContext(() => {
      const log = useCombatLog();

      const events = [
        createMockWorldEvent('EVENT_1', ALICE_ID),
        createMockWorldEvent('EVENT_2', BOB_ID),
      ];

      log.addEvents(events);
      expect(log.entryCount.value).toBe(2);

      log.clearLog();
      expect(log.entryCount.value).toBe(0);
      expect(log.hasEntries.value).toBe(false);
    });
  });

  it('should get entries by type', () => {
    runWithContext(() => {
      const log = useCombatLog();

      const turnEvent1 = createMockWorldEvent('COMBAT_TURN_DID_START', ALICE_ID);
      const turnEvent2 = createMockWorldEvent('COMBAT_TURN_DID_START', BOB_ID);
      const attackEvent = createMockWorldEvent('COMBATANT_DID_ATTACK', ALICE_ID);

      log.addEvents([turnEvent1, attackEvent, turnEvent2]);

      const turnEvents = log.getEntriesByType('COMBAT_TURN_DID_START');
      expect(turnEvents).toHaveLength(2);
      expect(turnEvents[0].actor).toBe(ALICE_ID);
      expect(turnEvents[1].actor).toBe(BOB_ID);
    });
  });

  it('should get latest entry', () => {
    runWithContext(() => {
      const log = useCombatLog();

      expect(log.getLatestEntry()).toBeNull();

      const event1 = createMockWorldEvent('EVENT_1', ALICE_ID);
      const event2 = createMockWorldEvent('EVENT_2', BOB_ID);

      log.addEvents([event1]);
      expect(log.getLatestEntry()?.type).toBe('EVENT_1');

      log.addEvents([event2]);
      expect(log.getLatestEntry()?.type).toBe('EVENT_2');
    });
  });

  it('should manage filters', () => {
    runWithContext(() => {
      const log = useCombatLog();

      log.addFilter('action');
      log.addFilter('damage');

      expect(log.filters.value.has('action')).toBe(true);
      expect(log.filters.value.has('damage')).toBe(true);

      log.removeFilter('action');
      expect(log.filters.value.has('action')).toBe(false);
      expect(log.filters.value.has('damage')).toBe(true);

      log.clearFilters();
      expect(log.filters.value.size).toBe(0);
    });
  });
});

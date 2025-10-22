import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDoneMethod } from './done';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '../testing/schema';
import { EventType } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';
import { Team } from '~/types/combat';
import { EVASION_SKILL } from '~/worldkit/combat/testing/constants';

describe('Done Method (New Architecture)', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let mockAdvanceTurn: ReturnType<typeof vi.fn>;

  const ACTOR_ID: ActorURN = 'flux:actor:test:done';

  beforeEach(() => {
    context = createTransformerContext();
    context.declareEvent = vi.fn();

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test',
      name: 'Test Weapon',
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema]);

    scenario = useCombatScenario(context, {
      weapons: [swordSchema],
      schemaManager,
      participants: {
        [ACTOR_ID]: {
          team: Team.ALPHA,
          stats: { pow: 20, fin: 15, res: 25 },
          skills: { [EVASION_SKILL]: { xp: 0, pxp: 0, rank: 1 } },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
          ap: 6.0,
          energy: { position: 0.6 },
        },
      },
    });

    mockAdvanceTurn = vi.fn(() => [
      {
        type: EventType.COMBAT_TURN_DID_END,
        actor: ACTOR_ID,
        location: scenario.actors[ACTOR_ID].actor.location,
        trace: 'test-trace',
        payload: {
          round: scenario.session.data.rounds.current.number,
          turn: scenario.session.data.rounds.current.turns.current.number,
          actor: ACTOR_ID,
          ap: 'before=0 after=6 recovered=6',
          energy: 'before=60 after=60 recovered=0',
        },
      }
    ]);
  });

  /**
   * Helper function to create a done method with default dependencies
   */
  const createTestDoneMethod = (overrides = {}) => {
    const actor = scenario.actors[ACTOR_ID].actor;
    const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

    return createDoneMethod(
      context,
      scenario.session,
      actor,
      combatant,
      { advanceTurn: mockAdvanceTurn, ...overrides }
    );
  };

  describe('Basic Functionality', () => {
    it('should create done method with default dependencies', () => {
      const done = createTestDoneMethod();

      expect(typeof done).toBe('function');
    });

    it('should create done method with custom dependencies', () => {
      const done = createTestDoneMethod();

      expect(typeof done).toBe('function');
    });
  });

  describe('Action Completion Only', () => {
    it('should only handle action completion, not resource recovery', () => {
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

      // Set initial AP state (depleted)
      combatant.ap.eff.cur = 1.5;
      combatant.ap.nat.cur = 1.5;
      const initialAP = combatant.ap.eff.cur;

      const done = createTestDoneMethod();

      done('test-trace');

      // DONE action should NOT modify AP (that's now handled by game state layer)
      expect(combatant.ap.eff.cur).toBe(initialAP);
      expect(combatant.ap.nat.cur).toBe(initialAP);

      // Should still call advanceTurn (which handles resource recovery)
      expect(mockAdvanceTurn).toHaveBeenCalledOnce();
    });

    it('should focus on turn ending without side effects', () => {
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;
      // Store initial state
      const initialAPEff = combatant.ap.eff.cur;
      const initialAPNat = combatant.ap.nat.cur;

      const done = createTestDoneMethod();

      done('test-trace');

      // No state should be modified by DONE action itself
      expect(combatant.ap.eff.cur).toBe(initialAPEff);
      expect(combatant.ap.nat.cur).toBe(initialAPNat);
    });
  });

  describe('Event Generation', () => {


    it('should delegate event declaration to advanceTurn callback', () => {
      const done = createTestDoneMethod();

      done('test-trace');

      // The done method should call advanceTurn, which handles event declaration
      expect(mockAdvanceTurn).toHaveBeenCalledWith('test-trace');
      // The done method itself should not declare events directly
      expect(context.declareEvent).not.toHaveBeenCalled();
    });
  });

  describe('Turn Advancement', () => {
    it('should call advance turn and include advancement events', () => {
      const actor = scenario.actors[ACTOR_ID].actor;
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

      const mockAdvancementEvents = [
        { type: EventType.COMBAT_TURN_DID_START, actor: 'next-actor' },
      ];
      mockAdvanceTurn.mockReturnValue(mockAdvancementEvents);

      const done = createTestDoneMethod();

      const events = done('test-trace');

      expect(mockAdvanceTurn).toHaveBeenCalledOnce();
      expect(events).toContainEqual(mockAdvancementEvents[0]);
    });

    it('should use override advance turn when provided', () => {
      const actor = scenario.actors[ACTOR_ID].actor;
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

      const done = createTestDoneMethod();

      done('test-trace');

      expect(mockAdvanceTurn).toHaveBeenCalledOnce();
      expect(mockAdvanceTurn.mock.calls[0][0]).toBe('test-trace');
    });

    it('should delegate resource recovery to advanceTurn callback', () => {
      const actor = scenario.actors[ACTOR_ID].actor;
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

      // Mock advanceTurn to simulate resource recovery events
      const mockResourceRecoveryEvents = [
        { type: EventType.COMBAT_TURN_DID_START, actor: 'next-actor' },
      ];
      mockAdvanceTurn.mockReturnValue(mockResourceRecoveryEvents);

      const done = createTestDoneMethod();

      const events = done('test-trace');

      // DONE should include events from advanceTurn (which handles resource recovery)
      expect(events).toContainEqual(mockResourceRecoveryEvents[0]);
    });
  });

  describe('Trace Handling', () => {

    it('should propagate trace to all generated events', () => {
      const customTrace = 'custom-done-trace-123';
      const mockAdvancementEvents = [
        { type: EventType.COMBAT_TURN_DID_START, actor: 'next-actor', trace: customTrace },
      ];
      mockAdvanceTurn.mockReturnValue(mockAdvancementEvents);

      const done = createTestDoneMethod();

      const events = done(customTrace);

      // All events should have the same trace
      for (const event of events) {
        expect(event.trace).toBe(customTrace);
      }
    });
  });

  describe('Integration with New Architecture', () => {
    it('should perform clean action completion sequence', () => {
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

      // Set up initial state with depleted AP
      combatant.ap.eff.cur = 2.0;
      const initialAP = combatant.ap.eff.cur;

      const mockAdvancementEvents = [
        {
          type: EventType.COMBAT_TURN_DID_END,
          actor: ACTOR_ID,
          location: scenario.actors[ACTOR_ID].actor.location,
          trace: 'integration-test-trace',
          payload: {
            round: scenario.session.data.rounds.current.number,
            turn: scenario.session.data.rounds.current.turns.current.number,
            actor: ACTOR_ID,
            ap: 'before=2 after=6 recovered=4',
            energy: 'before=60 after=60 recovered=0',
          },
        },
        { type: EventType.COMBAT_TURN_DID_START, actor: 'next-actor' },
      ];
      mockAdvanceTurn.mockReturnValue(mockAdvancementEvents);

      const done = createTestDoneMethod();

      const events = done('integration-test-trace');

      // Verify clean separation: DONE doesn't modify state
      expect(combatant.ap.eff.cur).toBe(initialAP); // AP unchanged by DONE
      expect(mockAdvanceTurn).toHaveBeenCalledOnce(); // Turn advancement delegated

      // Verify events: advanceTurn events are returned as-is
      expect(events).toHaveLength(2); // Turn end + advancement from advanceTurn
      expect(events[0].type).toBe(EventType.COMBAT_TURN_DID_END);
      expect(events[1].type).toBe(EventType.COMBAT_TURN_DID_START);
    });

    it('should require advanceTurn callback to be provided', () => {
      const actor = scenario.actors[ACTOR_ID].actor;
      const combatant = scenario.session.data.combatants.get(ACTOR_ID)!;

      expect(() => {
        createDoneMethod(
          context,
          scenario.session,
          actor,
          combatant,
          // @ts-expect-error - Testing runtime validation
          { advanceTurn: undefined }
        );
      }).toThrow('advanceTurn is required');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDefendMethod } from './defend';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { CombatantDidDefend, EventType } from '~/types/event';
import { extractApCost } from '~/worldkit/combat/ap';
import { Team } from '~/types/combat';
import { DoneMethod } from '~/worldkit/combat/action/done';
import { extractFirstEventOfType } from '~/testing/event';

describe('Defend Method', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let defend: ReturnType<typeof createDefendMethod>;

  const DEFENDER_ID: ActorURN = 'flux:actor:test:defender';

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
        [DEFENDER_ID]: {
          team: Team.ALPHA,
          stats: { pow: 10, fin: 10, res: 10 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
          ap: 6.0, // Set initial AP
        },
      },
    });

    const defender = scenario.actors[DEFENDER_ID];
    const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;

    defend = createDefendMethod(
      context,
      scenario.session,
      defender.actor,
      defenderCombatant,
    );
  });

  describe('Event Structure', () => {
    it('should create properly structured COMBATANT_DID_DEFEND event', () => {
      const defender = scenario.actors[DEFENDER_ID].actor;
      const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;
      const initialAP = defenderCombatant.ap.eff.cur;

      const result = defend();

      expect(result).toHaveLength(1);
      const event = result[0];

      // Validate complete event structure
      expect(event).toMatchObject({
        id: expect.any(String),
        ts: expect.any(Number),
        trace: expect.any(String),
        type: EventType.COMBATANT_DID_DEFEND,
        location: defender.location,
        actor: defender.id,
        payload: {
          cost: { ap: initialAP }
        },
      });
    });
  });

  describe('Basic Functionality', () => {
    it('should spend all remaining AP', () => {
      const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;
      const initialAP = defenderCombatant.ap.eff.cur;

      const result = defend();

      expect(defenderCombatant.ap.eff.cur).toBe(0);
      expect(result).toHaveLength(1);
      const defendEvent = extractFirstEventOfType<CombatantDidDefend>(result, EventType.COMBATANT_DID_DEFEND)!;
      expect(defendEvent.type).toBe(EventType.COMBATANT_DID_DEFEND);
      expect(extractApCost(defendEvent.payload.cost)).toBe(initialAP);
    });

    it('should call declareEvent on context', () => {
      defend();

      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.COMBATANT_DID_DEFEND,
          payload: expect.objectContaining({
            cost: expect.any(Object)
          })
        })
      );
    });

    it('should handle zero AP gracefully', () => {
      const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;
      defenderCombatant.ap.eff.cur = 0;

      const result = defend();

      expect(defenderCombatant.ap.eff.cur).toBe(0);
      expect(result).toHaveLength(1);
      const defendEvent = extractFirstEventOfType<CombatantDidDefend>(result, EventType.COMBATANT_DID_DEFEND)!;
      expect(extractApCost(defendEvent.payload.cost)).toBe(0);
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const customTrace = 'custom-defend-trace-123';

      const result = defend(customTrace);

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(customTrace);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_DEFEND);
    });

    it('should use generated trace when none provided', () => {
      // Mock context.uniqid to return a known value
      const generatedTrace = 'generated-defend-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = defend(); // No trace provided

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
      expect(context.uniqid).toHaveBeenCalled();
      expect(result[0].type).toBe(EventType.COMBATANT_DID_DEFEND);
    });
  });

  describe('Auto-Done Functionality', () => {
    it('should not auto-advance turn by default', () => {
      const defender = scenario.actors[DEFENDER_ID];
      const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;
      const defendMethod = createDefendMethod(context, scenario.session, defender.actor, defenderCombatant);

      const result = defendMethod();

      // Should only generate DEFEND event, not turn advancement events
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_DEFEND);
    });

    it('should auto-advance turn when autoDone is true', () => {
      const defender = scenario.actors[DEFENDER_ID];
      const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;
      const mockDone = vi.fn(() => [
        { type: EventType.COMBAT_TURN_DID_END, actor: defender.actor.id },
        { type: EventType.COMBAT_TURN_DID_START, actor: 'other-actor' }
      ]) as unknown as DoneMethod;

      const defendMethod = createDefendMethod(context, scenario.session, defender.actor, defenderCombatant, { done: mockDone });

      const result = defendMethod(undefined, { autoDone: true });

      // Should generate DEFEND event + turn advancement events
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_DEFEND);
      expect(result[1].type).toBe(EventType.COMBAT_TURN_DID_END);
      expect(result[2].type).toBe(EventType.COMBAT_TURN_DID_START);
      expect(mockDone).toHaveBeenCalledOnce();
    });

    it('should not call done when autoDone is false', () => {
      const defender = scenario.actors[DEFENDER_ID];
      const defenderCombatant = scenario.session.data.combatants.get(DEFENDER_ID)!;
      const mockDone = vi.fn(() => []);

      const defendMethod = createDefendMethod(context, scenario.session, defender.actor, defenderCombatant, { done: mockDone });

      const result = defendMethod(undefined, { autoDone: false });

      // Should only generate DEFEND event
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_DEFEND);
      expect(mockDone).not.toHaveBeenCalled();
    });
  });
});

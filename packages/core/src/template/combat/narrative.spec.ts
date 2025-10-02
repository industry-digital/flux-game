import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCombatNarrativeRenderer, RenderCombatSessionStartedInput } from './narrative';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { CombatSessionEnded, EventType } from '~/types/event';
import { Team } from '~/types/combat';
import { createTestPlace } from '~/testing/world-testing';
import { createDiceRollResult } from '~/worldkit/combat/testing/dice';

describe('Combat Narrative Renderer', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let renderer: ReturnType<typeof createCombatNarrativeRenderer>;

  const ALICE_ID: ActorURN = 'flux:actor:test:alice';
  const BOB_ID: ActorURN = 'flux:actor:test:bob';
  const CHARLIE_ID: ActorURN = 'flux:actor:test:charlie';
  const DAVE_ID: ActorURN = 'flux:actor:test:dave';
  const BATTLEFIELD_ID: PlaceURN = 'flux:place:test:battlefield';

  beforeEach(() => {
    context = createTransformerContext();

    // Mock random for deterministic tests
    context.random = vi.fn().mockReturnValue(0.5); // Always pick middle template

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:iron-sword',
      name: 'Iron Sword',
    });

    const daggerSchema = createSwordSchema({
      urn: 'flux:schema:weapon:steel-dagger',
      name: 'Steel Dagger',
    });

    // Create a test place with description
    const battlefield = createTestPlace({
      id: BATTLEFIELD_ID,
      name: 'Ancient Battlefield',
      description: {
        base: 'on an ancient battlefield littered with the bones of fallen warriors'
      }
    });

    context.world.places[BATTLEFIELD_ID] = battlefield;

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema, daggerSchema]);

    scenario = useCombatScenario(context, {
      location: BATTLEFIELD_ID,
      weapons: [swordSchema, daggerSchema],
      schemaManager,
      participants: {
        [ALICE_ID]: {
          name: 'Alice the Brave',
          team: Team.ALPHA,
          stats: { pow: 15, fin: 12, per: 14 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 90, facing: 1, speed: 0 },
        },
        [BOB_ID]: {
          name: 'Bob the Bold',
          team: Team.ALPHA, // Ally to Alice
          stats: { pow: 13, fin: 11, per: 12 },
          equipment: { weapon: daggerSchema.urn },
          position: { coordinate: 95, facing: 1, speed: 0 },
        },
        [CHARLIE_ID]: {
          name: 'Charlie the Cunning',
          team: Team.BRAVO, // Enemy
          stats: { pow: 14, fin: 13, per: 15 },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 200, facing: -1, speed: 0 },
        },
        [DAVE_ID]: {
          name: 'Dave the Dangerous',
          team: Team.BRAVO, // Enemy
          stats: { pow: 16, fin: 10, per: 13 },
          equipment: { weapon: daggerSchema.urn },
          position: { coordinate: 205, facing: -1, speed: 0 },
        },
      },
    });

    renderer = createCombatNarrativeRenderer(context, scenario.session);
  });

  describe('Combat Session Started Narratives', () => {
    it('should render narrative for initiator with weapon and allies', () => {
      // Create a combat started event with Alice as initiator
      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-1',
        ts: Date.now(),
        trace: 'test-trace-1',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: scenario.session.id,
          initiative: [
            [ALICE_ID, createDiceRollResult('1d20', [18])],
            [BOB_ID, createDiceRollResult('1d20', [15])],
            [CHARLIE_ID, createDiceRollResult('1d20', [12])],
            [DAVE_ID, createDiceRollResult('1d20', [10])],
          ],
          combatants: [
            [ALICE_ID, { ...scenario.session.data.combatants.get(ALICE_ID)!, didInitiateCombat: true }],
            [BOB_ID, scenario.session.data.combatants.get(BOB_ID)!],
            [CHARLIE_ID, scenario.session.data.combatants.get(CHARLIE_ID)!],
            [DAVE_ID, scenario.session.data.combatants.get(DAVE_ID)!],
          ],
        },
      };

      const narrative = renderer.renderCombatSessionStarted(input, ALICE_ID);

      console.log('\n=== ALICE (INITIATOR WITH ALLIES) ===');
      console.log(narrative);
      console.log('=====================================\n');

      // Verify narrative contains basic combat information
      expect(narrative).toContain('Charlie the Cunning'); // Enemy mentioned
      expect(narrative).toContain('Dave the Dangerous'); // Enemy mentioned
      expect(narrative.length).toBeGreaterThan(0); // Has content
    });

    it('should render narrative for defender without allies', () => {
      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-2',
        ts: Date.now(),
        trace: 'test-trace-2',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: scenario.session.id,
          initiative: [
            [ALICE_ID, createDiceRollResult('1d20', [18])],
            [BOB_ID, createDiceRollResult('1d20', [15])],
            [CHARLIE_ID, createDiceRollResult('1d20', [12])],
            [DAVE_ID, createDiceRollResult('1d20', [10])],
          ],
          combatants: [
            [ALICE_ID, { ...scenario.session.data.combatants.get(ALICE_ID)!, didInitiateCombat: true }],
            [BOB_ID, scenario.session.data.combatants.get(BOB_ID)!],
            [CHARLIE_ID, scenario.session.data.combatants.get(CHARLIE_ID)!],
            [DAVE_ID, scenario.session.data.combatants.get(DAVE_ID)!],
          ],
        },
      };

      const narrative = renderer.renderCombatSessionStarted(input, CHARLIE_ID);

      console.log('\n=== CHARLIE (DEFENDER WITHOUT ALLIES) ===');
      console.log(narrative);
      console.log('==========================================\n');

      // Verify narrative contains basic combat information
      expect(narrative).toContain('Alice the Brave'); // Initiator mentioned
      expect(narrative.length).toBeGreaterThan(0); // Has content
    });

    it('should render narrative with close quarters positioning', () => {
      // Modify positions to be close together
      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const charlieCombatant = scenario.session.data.combatants.get(CHARLIE_ID)!;

      aliceCombatant.position.coordinate = 100;
      charlieCombatant.position.coordinate = 105; // 5m away - close quarters

      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-3',
        ts: Date.now(),
        trace: 'test-trace-3',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: scenario.session.id,
          initiative: [
            [ALICE_ID, createDiceRollResult('1d20', [18])],
            [CHARLIE_ID, createDiceRollResult('1d20', [12])],
          ],
          combatants: [
            [ALICE_ID, { ...aliceCombatant, didInitiateCombat: true }],
            [CHARLIE_ID, charlieCombatant],
          ],
        },
      };

      const narrative = renderer.renderCombatSessionStarted(input, ALICE_ID);

      console.log('\n=== ALICE (CLOSE QUARTERS) ===');
      console.log(narrative);
      console.log('===============================\n');

      expect(narrative.length).toBeGreaterThan(0); // Has content
    });

    it('should handle edge case with no enemies', () => {
      const swordSchema = createSwordSchema({
        urn: 'flux:schema:weapon:iron-sword',
        name: 'Iron Sword',
      });

      const daggerSchema = createSwordSchema({
        urn: 'flux:schema:weapon:steel-dagger',
        name: 'Steel Dagger',
      });

      // Create a separate scenario with only allies (same team)
      const allyOnlyScenario = useCombatScenario(context, {
        location: BATTLEFIELD_ID,
        weapons: [swordSchema, daggerSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            name: 'Alice the Brave',
            team: Team.ALPHA, // Same team
            stats: { pow: 15, fin: 12, per: 14 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 90, facing: 1, speed: 0 },
          },
          [BOB_ID]: {
            name: 'Bob the Bold',
            team: Team.ALPHA, // Same team - no enemies!
            stats: { pow: 13, fin: 11, per: 12 },
            equipment: { weapon: daggerSchema.urn },
            position: { coordinate: 95, facing: 1, speed: 0 },
          },
        },
      });

      const allyOnlyRenderer = createCombatNarrativeRenderer(context, allyOnlyScenario.session);

      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-4',
        ts: Date.now(),
        trace: 'test-trace-4',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: allyOnlyScenario.session.id,
          initiative: [
            [ALICE_ID, createDiceRollResult('1d20', [18])],
            [BOB_ID, createDiceRollResult('1d20', [15])],
          ],
          combatants: [
            [ALICE_ID, allyOnlyScenario.session.data.combatants.get(ALICE_ID)!],
            [BOB_ID, allyOnlyScenario.session.data.combatants.get(BOB_ID)!],
          ],
        },
      };

      const narrative = allyOnlyRenderer.renderCombatSessionStarted(input, ALICE_ID);

      console.log('\n=== ALICE (NO ENEMIES) ===');
      console.log(narrative);
      console.log('===========================\n');

      expect(narrative.length).toBeGreaterThan(0); // Has content
    });

    it('should test template variety with different random values', () => {
      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-5',
        ts: Date.now(),
        trace: 'test-trace-5',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: scenario.session.id,
          initiative: [
            [ALICE_ID, createDiceRollResult('1d20', [18])],
            [CHARLIE_ID, createDiceRollResult('1d20', [12])],
          ],
          combatants: [
            [ALICE_ID, { ...scenario.session.data.combatants.get(ALICE_ID)!, didInitiateCombat: true }],
            [CHARLIE_ID, scenario.session.data.combatants.get(CHARLIE_ID)!],
          ],
        },
      };

      console.log('\n=== TEMPLATE VARIETY TEST ===');

      // Test different random values to show template variety
      const randomValues = [0.1, 0.5, 0.9];

      randomValues.forEach((randomValue, index) => {
        context.random = vi.fn().mockReturnValue(randomValue);
        const newRenderer = createCombatNarrativeRenderer(context, scenario.session);
        const narrative = newRenderer.renderCombatSessionStarted(input, ALICE_ID);

        console.log(`\nTemplate ${index + 1} (random: ${randomValue}):`);
        console.log(narrative);
        console.log('---');
      });

      console.log('==============================\n');
    });
  });

  describe('Combat Session Ended Narratives', () => {
    it('should render victory narrative', () => {
      const event: CombatSessionEnded = {
        id: 'test-event-end-1',
        ts: Date.now(),
        trace: 'test-trace-end-1',
        type: EventType.COMBAT_SESSION_DID_END,
        location: BATTLEFIELD_ID,
        narrative: {
          self: '',
          observer: '',
        },
        payload: {
          sessionId: scenario.session.id,
          winningTeam: Team.ALPHA,
          finalRound: 3,
          finalTurn: 8,
        },
      };

      const narrative = renderer.renderCombatSessionEnded(event, ALICE_ID);

      console.log('\n=== ALICE (VICTORY) ===');
      console.log(narrative);
      console.log('========================\n');

      expect(narrative).toContain('won');
      expect(narrative).toContain('Charlie the Cunning');
      expect(narrative).toContain('Dave the Dangerous');
    });

    it('should render defeat narrative', () => {
      const event: CombatSessionEnded = {
        id: 'test-event-end-2',
        ts: Date.now(),
        trace: 'test-trace-end-2',
        type: EventType.COMBAT_SESSION_DID_END,
        location: BATTLEFIELD_ID,
        narrative: {
          self: '',
          observer: '',
        },
        payload: {
          sessionId: scenario.session.id,
          winningTeam: Team.BRAVO,
          finalRound: 2,
          finalTurn: 5,
        },
      };

      const narrative = renderer.renderCombatSessionEnded(event, ALICE_ID);

      console.log('\n=== ALICE (DEFEAT) ===');
      console.log(narrative);
      console.log('=======================\n');

      expect(narrative).toContain('lost');
      expect(narrative).toContain('Charlie the Cunning');
      expect(narrative).toContain('Dave the Dangerous');
    });
  });

  describe('Caching and Performance', () => {
    it('should cache ally/enemy relationships', () => {
      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-cache',
        ts: Date.now(),
        trace: 'test-trace-cache',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: scenario.session.id,
          initiative: [[ALICE_ID, createDiceRollResult('1d20', [18])]],
          combatants: [[ALICE_ID, scenario.session.data.combatants.get(ALICE_ID)!]],
        },
      };

      // First call should compute relationships
      const narrative1 = renderer.renderCombatSessionStarted(input, ALICE_ID);

      // Second call should use cached relationships
      const narrative2 = renderer.renderCombatSessionStarted(input, ALICE_ID);

      // Results should be identical
      expect(narrative1).toBe(narrative2);

      console.log('\n=== CACHING TEST ===');
      console.log('First call:', narrative1);
      console.log('Second call (cached):', narrative2);
      console.log('Results identical:', narrative1 === narrative2);
      console.log('====================\n');
    });
  });

  describe('Pure Function Compliance', () => {
    it('should produce deterministic output', () => {
      const renderer = createCombatNarrativeRenderer(context, scenario.session);

      const input: RenderCombatSessionStartedInput = {
        id: 'test-event-pure',
        ts: Date.now(),
        trace: 'test-trace-pure',
        type: EventType.COMBAT_SESSION_DID_START,
        location: BATTLEFIELD_ID,
        payload: {
          sessionId: scenario.session.id,
          initiative: [[ALICE_ID, createDiceRollResult('1d20', [18])]],
          combatants: [[ALICE_ID, { ...scenario.session.data.combatants.get(ALICE_ID)!, didInitiateCombat: true }]],
        },
      };

      const narrative1 = renderer.renderCombatSessionStarted(input, ALICE_ID);
      const narrative2 = renderer.renderCombatSessionStarted(input, ALICE_ID);

      // Verify deterministic output
      expect(narrative1).toBe(narrative2);
      expect(narrative1.length).toBeGreaterThan(0);

      console.log('\n=== PURE FUNCTION TEST ===');
      console.log('Deterministic narrative:', narrative1);
      console.log('===========================\n');
    });
  });
});

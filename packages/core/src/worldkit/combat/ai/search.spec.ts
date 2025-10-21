import { describe, it, expect, beforeEach } from 'vitest';
import { getValidActions, createInitialNode } from './search';
import { analyzeBattlefield } from './analysis';
import { createTransformerContext } from '~/worldkit/context';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { Team } from '~/types/combat';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { ActorURN } from '~/types/taxonomy';
import { CommandType } from '~/types/intent';

const ALICE_ID: ActorURN = 'flux:actor:alice';
const BOB_ID: ActorURN = 'flux:actor:bob';

describe('AI Combat Planning - Session Context', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let swordSchema: ReturnType<typeof createSwordSchema>;

  beforeEach(() => {
    context = createTransformerContext();
    swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test-sword',
      name: 'Test Sword',
    });
  });

  describe('getValidActions', () => {
    it('should include session ID in all generated commands', () => {
      // Create a combat scenario
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: 1, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: -1, speed: 0 },
          },
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const aliceActor = scenario.actors[ALICE_ID].actor;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(aliceActor)!;
      const situation = analyzeBattlefield(context, scenario.session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      // Generate all valid actions
      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'test-trace'
      ));

      // Verify all commands have session context
      expect(actions.length).toBeGreaterThan(0);

      for (const action of actions) {
        expect(action.session).toBeDefined();
        expect(action.session).toBe(scenario.session.id);
        expect(action.actor).toBe(ALICE_ID);
        expect(action.location).toBe(situation.session.data.location);
      }
    });

    it('should generate TARGET command with session when no current target', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: undefined, // No current target
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: 1, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 105, facing: -1, speed: 0 },
          },
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const aliceActor = scenario.actors[ALICE_ID].actor;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(aliceActor)!;
      const situation = analyzeBattlefield(context, scenario.session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'test-trace'
      ));

      // Should generate TARGET command first
      const targetCommand = actions.find(action => action.type === 'TARGET');
      expect(targetCommand).toBeDefined();
      expect(targetCommand!.session).toBe(scenario.session.id);
      expect(targetCommand!.args.target).toBe(BOB_ID);
    });

    it('should generate STRIKE command with session when target available', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: 1, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 101, facing: -1, speed: 0 }, // Within 1m range
          },
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const aliceActor = scenario.actors[ALICE_ID].actor;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(aliceActor)!;
      const situation = analyzeBattlefield(context, scenario.session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'test-trace'
      ));

      // Should generate STRIKE command
      const strikeCommand = actions.find(action => action.type === CommandType.STRIKE);
      expect(strikeCommand).toBeDefined();
      expect(strikeCommand!.session).toBe(scenario.session.id);
      expect(strikeCommand!.args.target).toBe(BOB_ID);
    });

    it('should generate ADVANCE command with session when movement needed', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: 1, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 120, facing: -1, speed: 0 }, // Far away
          },
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const aliceActor = scenario.actors[ALICE_ID].actor;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(aliceActor)!;
      const situation = analyzeBattlefield(context, scenario.session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'test-trace'
      ));

      // Should generate ADVANCE command
      const advanceCommand = actions.find(action => action.type === 'ADVANCE');
      expect(advanceCommand).toBeDefined();
      expect(advanceCommand!.session).toBe(scenario.session.id);
      expect(advanceCommand!.args.distance).toBeGreaterThan(0);
    });

    it('should generate DEFEND command with session when no other actions available', () => {
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: BOB_ID,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: 1, speed: 0 },
            ap: 0.5, // Very low AP
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 120, facing: -1, speed: 0 },
          },
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const aliceActor = scenario.actors[ALICE_ID].actor;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(aliceActor)!;
      const situation = analyzeBattlefield(context, scenario.session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'test-trace'
      ));

      // Should generate DEFEND command when no other actions possible
      const defendCommand = actions.find(action => action.type === 'DEFEND');
      expect(defendCommand).toBeDefined();
      expect(defendCommand!.session).toBe(scenario.session.id);
      expect(defendCommand!.args.autoDone).toBe(true);
    });
  });

  describe('Session Context Regression Tests', () => {
    it('should never generate commands without session field', () => {
      // This test specifically prevents regression of the session context bug
      const scenario = useCombatScenario(context, {
        weapons: [swordSchema],
        schemaManager: context.schemaManager,
        participants: {
          [ALICE_ID]: {
            team: Team.ALPHA,
            target: undefined,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 100, facing: 1, speed: 0 },
            ap: 6.0,
            energy: 20000,
          },
          [BOB_ID]: {
            team: Team.BRAVO,
            stats: { pow: 10, fin: 10, res: 10 },
            equipment: { weapon: swordSchema.urn },
            position: { coordinate: 110, facing: -1, speed: 0 },
          },
        },
      });

      const aliceCombatant = scenario.session.data.combatants.get(ALICE_ID)!;
      const aliceActor = scenario.actors[ALICE_ID].actor;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(aliceActor)!;
      const situation = analyzeBattlefield(context, scenario.session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      // Generate many actions to test all code paths
      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'regression-test'
      ));

      // CRITICAL: Every single command must have session context
      for (const action of actions) {
        expect(action.session,
          `Command ${action.type} missing session field - this would cause "Expected combat session ID" error`
        ).toBeDefined();

        expect(action.session,
          `Command ${action.type} has wrong session ID`
        ).toBe(scenario.session.id);
      }

      // Verify we actually generated some actions
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});

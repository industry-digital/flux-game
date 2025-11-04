import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getValidActions, createInitialNode } from './search';
import { analyzeBattlefield } from './analysis';
import { createTransformerContext } from '~/worldkit/context';
import { CombatFacing, CombatSession, Team } from '~/types/combat';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { CommandType } from '~/types/intent';
import { WeaponSchema } from '~/types/schema/weapon';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { createPlace } from '~/worldkit/entity/place';
import { createDefaultActors } from '~/testing/actors';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { CombatSessionApi, createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Actor } from '~/types/entity/actor';
import { setAp } from '~/worldkit/combat/ap';
import { ActorURN } from '~/types/taxonomy';

describe('AI Combat Planning - Session Context', () => {
  let context: ReturnType<typeof createTransformerContext>;
  let scenario: WorldScenarioHook;
  let combatSessionApi: CombatSessionApi;
  let session: CombatSession;

  let swordSchema: WeaponSchema;

  let alice: Actor;
  let bob: Actor;

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob } = createDefaultActors(place.id));
    context = createTransformerContext();
    scenario = createWorldScenario(context, {
      places: [place],
      actors: [alice, bob],
    });

    context.declareEvent = vi.fn();

    // Create weapon schema
    swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test-sword',
      name: 'Test Sword',
    });

    // Register schema and assign weapons
    scenario.registerSchema(swordSchema);
    scenario.assignWeapon(alice, swordSchema);
    scenario.assignWeapon(bob, swordSchema);

    // Create combat session and add combatants
    combatSessionApi = createCombatSessionApi(context, place.id);
    combatSessionApi.addCombatant(alice.id, Team.ALPHA, { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 });
    combatSessionApi.addCombatant(bob.id, Team.BRAVO, { coordinate: 105, facing: CombatFacing.LEFT, speed: 0 });

    session = combatSessionApi.session;
  });

  // Helper function for setting up actors with targets and AP
  const setupActorWithTarget = (actor: Actor, target: ActorURN | null, ap = 6.0): void => {
    const combatant = session.data.combatants.get(actor.id)!;
    combatant.target = target;
    setAp(combatant, ap, ap);
  };

  describe('getValidActions', () => {
    it('should include session ID in all generated commands', () => {
      // Set up Alice with target and AP
      setupActorWithTarget(alice, BOB_ID);

      const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(alice)!;
      const situation = analyzeBattlefield(context, session, aliceCombatant, weaponSchema);
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
        expect(action.session).toBe(session.id);
        expect(action.actor).toBe(ALICE_ID);
        expect(action.location).toBe(situation.session.data.location);
      }
    });

    it('should generate TARGET command with session when no current target', () => {
      // Set up Alice with no target but with AP
      setupActorWithTarget(alice, null);

      const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(alice)!;
      const situation = analyzeBattlefield(context, session, aliceCombatant, weaponSchema);
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
      expect(targetCommand!.session).toBe(session.id);
      expect(targetCommand!.args.target).toBe(BOB_ID);
    });

    it('should generate STRIKE command with session when target available', () => {
      // Set up Alice with target and position Bob within 1m range
      setupActorWithTarget(alice, BOB_ID);

      const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
      const bobCombatant = session.data.combatants.get(BOB_ID)!;
      aliceCombatant.position.coordinate = 100;
      bobCombatant.position.coordinate = 101; // Within 1m range

      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(alice)!;
      const situation = analyzeBattlefield(context, session, aliceCombatant, weaponSchema);
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
      expect(strikeCommand!.session).toBe(session.id);
      expect(strikeCommand!.args.target).toBe(BOB_ID);
    });

    it('should generate ADVANCE command with session when movement needed', () => {
      // Set up Alice with target and position Bob far away
      setupActorWithTarget(alice, BOB_ID);

      const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
      const bobCombatant = session.data.combatants.get(BOB_ID)!;
      aliceCombatant.position.coordinate = 100;
      bobCombatant.position.coordinate = 120; // Far away

      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(alice)!;
      const situation = analyzeBattlefield(context, session, aliceCombatant, weaponSchema);
      const initialNode = createInitialNode(situation);

      const actions = Array.from(getValidActions(
        context,
        initialNode,
        situation,
        'test-trace'
      ));

      // Should generate ADVANCE command
      const advanceCommand = actions.find(action => action.type === CommandType.ADVANCE);
      expect(advanceCommand).toBeDefined();
      expect(advanceCommand!.session).toBe(session.id);
      expect(advanceCommand!.args.distance).toBeGreaterThan(0);
    });

    it('should generate DEFEND command with session when no other actions available', () => {
      // Set up Alice with target but very low AP
      setupActorWithTarget(alice, BOB_ID, 0.5); // Very low AP

      const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
      const bobCombatant = session.data.combatants.get(BOB_ID)!;
      aliceCombatant.position.coordinate = 100;
      bobCombatant.position.coordinate = 120; // Far away

      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(alice)!;
      const situation = analyzeBattlefield(context, session, aliceCombatant, weaponSchema);
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
      expect(defendCommand!.session).toBe(session.id);
      expect(defendCommand!.args.autoDone).toBe(true);
    });
  });

  describe('Session Context Regression Tests', () => {
    it('should never generate commands without session field', () => {
      // This test specifically prevents regression of the session context bug
      // Set up Alice with no target and Bob at medium distance
      setupActorWithTarget(alice, null);

      const aliceCombatant = session.data.combatants.get(ALICE_ID)!;
      const bobCombatant = session.data.combatants.get(BOB_ID)!;
      aliceCombatant.position.coordinate = 100;
      bobCombatant.position.coordinate = 110;

      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(alice)!;
      const situation = analyzeBattlefield(context, session, aliceCombatant, weaponSchema);
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
        ).toBe(session.id);
      }

      // Verify we actually generated some actions
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});

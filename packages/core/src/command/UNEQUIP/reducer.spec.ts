import { describe, it, expect, beforeEach } from 'vitest';
import { ActorDidUnequipWeapon, EventType } from '~/types/event';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { ItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { ALICE_ID, BOB_ID, DEFAULT_COMBAT_SESSION, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { TransformerContext } from '~/types/handler';
import { createUnequipCommand } from '~/testing/command/factory/equipment';
import { Actor } from '~/types/entity/actor';
import { extractFirstEventOfType } from '~/testing/event';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon';
import { createPlace } from '~/worldkit/entity/place';
import { UnequipCommand } from '~/command/UNEQUIP/types';
import { unequipReducer } from '~/command/UNEQUIP/reducer';
import { ErrorCode } from '~/types/error';
import { createDefaultActors } from '~/testing/actors';
import { getCurrentAp } from '~/worldkit/combat/ap';
import { CombatSessionApi, createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';

describe('UNEQUIP Command Reducer', () => {
  const DEFAULT_WEAPON: ItemURN = 'flux:item:weapon:iron-sword';
  const DEFAULT_WEAPON_SCHEMA: WeaponSchemaURN = 'flux:schema:weapon:sword';

  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let bob: Actor;
  let defaultWeaponSchema: WeaponSchema;

  type Transform = <T>(x: T) => T;
  const identity: Transform = (x) => x;

  // Helper to create basic command with common defaults
  const createMockUnequipCommand = (
    transform: Transform = identity,
  ) => {
    return createUnequipCommand(
      (command: UnequipCommand) => transform({
        ...command,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        ts: DEFAULT_TIMESTAMP,
        args: {
          item: DEFAULT_WEAPON,
        },
      })
    );
  };

  // Helper assertions to reduce repetition
  const expectSuccessfulUnequip = (result: TransformerContext, expectedCost?: { ap: number; energy: number }) => {
    expect(result.getDeclaredErrors()).toHaveLength(0);

    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);

    const unequipEvent = extractFirstEventOfType<ActorDidUnequipWeapon>(events, EventType.ACTOR_DID_UNEQUIP_WEAPON)!;
    expect(unequipEvent).toBeDefined();
    expect(unequipEvent.payload.itemId).toBe(DEFAULT_WEAPON);
    expect(unequipEvent.payload.schema).toBe(DEFAULT_WEAPON_SCHEMA);

    if (expectedCost) {
      expect(unequipEvent.payload.cost).toEqual(expectedCost);
    } else {
      expect(unequipEvent.payload.cost).toBeUndefined();
    }

    expect(result.equipmentApi.getEquippedWeapon(alice)).toBeNull();
  };

  const expectError = (result: TransformerContext, expectedErrorCode: ErrorCode) => {
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(expectedErrorCode);
    expect(result.getDeclaredEvents()).toHaveLength(0);
  };

  beforeEach(() => {
    const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob } = createDefaultActors(DEFAULT_LOCATION));

    context = createTransformerContext();
    scenario = createWorldScenario(context, {
      places: [place],
      actors: [alice, bob],
    });

    // Create and register weapon schema
    defaultWeaponSchema = createWeaponSchema((w: WeaponSchema) => ({
      ...w,
      urn: DEFAULT_WEAPON_SCHEMA,
    }));

    // Register schema, add weapon to inventory, and equip it (UNEQUIP tests need equipped weapon)
    scenario.registerSchema(defaultWeaponSchema);
    scenario.assignItem(alice, { id: DEFAULT_WEAPON, schema: defaultWeaponSchema.urn });
    context.equipmentApi.equip(alice, DEFAULT_WEAPON);
  });

  describe('Out of Combat (No Session)', () => {
    it('should unequip weapon without AP costs when not in combat', () => {
      const command = createMockUnequipCommand();
      const result = unequipReducer(context, command);
      expectSuccessfulUnequip(result); // No cost expected (out of combat)
    });

    it('should error when item not found in inventory', () => {
      delete alice.inventory.items[DEFAULT_WEAPON];
      const command = createMockUnequipCommand();
      const result = unequipReducer(context, command);
      expectError(result, ErrorCode.INVALID_TARGET);
    });

    it('should error when item is not equipped', () => {
      const unequippedWeapon = 'flux:item:weapon:second-sword' as ItemURN;
      scenario.assignItem(alice, { id: unequippedWeapon, schema: defaultWeaponSchema.urn });

      const command = createMockUnequipCommand((c) => ({ ...c, args: { item: unequippedWeapon } }));
      const result = unequipReducer(context, command);
      expectError(result, ErrorCode.INVALID_TARGET);
    });
  });

  describe('In Combat (With Session)', () => {
    let combatSessionApi: CombatSessionApi;

    // Create a combat session and add Alice to it
    beforeEach(() => {
      combatSessionApi = createCombatSessionApi(context, DEFAULT_LOCATION, DEFAULT_COMBAT_SESSION);
      combatSessionApi.addCombatant(alice.id, Team.ALPHA);
      alice.session = combatSessionApi.session.id;
    });

    it('should unequip weapon with AP costs when in combat', () => {
      const command = createMockUnequipCommand((c) => ({ ...c, session: combatSessionApi.session.id }));
      const result = unequipReducer(context, command);
      expectSuccessfulUnequip(result, { ap: 0, energy: 0 }); // UNEQUIP is free action

      // AP should remain unchanged (free action)
      const { combatant } = combatSessionApi.getCombatantApi(ALICE_ID);
      expect(getCurrentAp(combatant)).toBe(6.0); // No AP deducted
    });

    it('should error when session does not exist', () => {
      const command = createMockUnequipCommand((c) => ({
        ...c,
        session: 'flux:session:combat:nonexistent'
      }));

      const result = unequipReducer(context, command);
      expectError(result, ErrorCode.INVALID_SESSION);
    });

    it('should succeed when command.session provided but actor not in combat (command.session is non-authoritative)', () => {
      // Give Bob a weapon to unequip
      const weaponItem = scenario.assignItem(bob, { schema: defaultWeaponSchema.urn });
      context.equipmentApi.equip(bob, weaponItem.id);

      // Try to unequip Bob's weapon while referencing the combat session
      // Bob is not actually in combat (actor.session is undefined), so this should succeed without costs
      // command.session is non-authoritative - we only check actor.session
      const command = createMockUnequipCommand((c) => ({
        ...c,
        session: combatSessionApi.session.id,
        actor: BOB_ID,
        args: { item: weaponItem.id }
      }));

      const result = unequipReducer(context, command);

      // Should succeed because Bob is not in combat (based on actor.session)
      expect(result.getDeclaredErrors()).toHaveLength(0);
      expect(result.getDeclaredEvents()).toHaveLength(1);
      expect(result.equipmentApi.getEquippedWeapon(bob)).toBeNull();
    });
  });
});

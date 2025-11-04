import { describe, it, expect, beforeEach } from 'vitest';
import { equipReducer } from './reducer';
import { EquipCommand } from './types';
import { ActorDidEquipWeapon, EventType } from '~/types/event';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { ItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP, DEFAULT_COMBAT_SESSION } from '~/testing/constants';
import { TransformerContext } from '~/types/handler';
import { createEquipCommand } from '~/testing/command/factory/equipment';
import { Actor } from '~/types/entity/actor';
import { extractFirstEventOfType } from '~/testing/event';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon';
import { ErrorCode } from '~/types/error';
import { createDefaultActors } from '~/testing/actors';
import { getCurrentAp, setCurrentAp } from '~/worldkit/combat/ap';
import { CombatSessionApi, createCombatSessionApi } from '~/worldkit/combat/session/session';
import { createPlace } from '~/worldkit/entity/place';
import { Team } from '~/types/combat';
import { ArmorSchema } from '~/types/schema/armor';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';

type Transform = <T>(x: T) => T;
const identity: Transform = (x) => x;

describe('EQUIP Command Reducer', () => {
  const DEFAULT_WEAPON: ItemURN = 'flux:item:weapon:iron-sword';
  const DEFAULT_WEAPON_SCHEMA: WeaponSchemaURN = 'flux:schema:weapon:sword';

  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let bob: Actor;
  let defaultWeaponSchema: WeaponSchema;

  // Helper to create basic command with common defaults
  const createMockEquipCommand = (
    transform: Transform = identity,
  ) => {
    return createEquipCommand(
      (command: EquipCommand) => transform({
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
  const expectSuccessfulEquip = (result: TransformerContext, expectedCost?: { ap: number; energy: number }) => {
    expect(result.getDeclaredErrors()).toHaveLength(0);

    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);

    const equipEvent = extractFirstEventOfType<ActorDidEquipWeapon>(events, EventType.ACTOR_DID_EQUIP_WEAPON)!;
    expect(equipEvent).toBeDefined();
    expect(equipEvent.payload.itemId).toBe(DEFAULT_WEAPON);
    expect(equipEvent.payload.schema).toBe(DEFAULT_WEAPON_SCHEMA);

    if (expectedCost) {
      expect(equipEvent.payload.cost).toEqual(expectedCost);
    } else {
      expect(equipEvent.payload.cost).toBeUndefined();
    }

    expect(result.equipmentApi.getEquippedWeapon(alice)).toBe(DEFAULT_WEAPON);
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
      timers: {
        ...w.timers,
        setup: 500, // 500ms = 0.5 AP
      },
    }));

    // Register schema and add weapon to inventory (but don't equip it yet)
    scenario.registerSchema(defaultWeaponSchema);
    scenario.assignItem(alice, { id: DEFAULT_WEAPON, schema: defaultWeaponSchema.urn });
  });

  describe('Out of Combat (No Session)', () => {
    it('should equip weapon without AP costs when not in combat', () => {
      const command = createMockEquipCommand();
      const result = equipReducer(context, command);
      expectSuccessfulEquip(result); // No cost expected (out of combat)
    });

    it('should error when item not found in inventory', () => {
      delete alice.inventory.items[DEFAULT_WEAPON];
      const command = createMockEquipCommand();
      const result = equipReducer(context, command);
      expectError(result, ErrorCode.INVALID_TARGET);
    });

    // Only weapons are supported at the moment
    it('should error when item is not a weapon', () => {
      const nonWeaponId = 'flux:item:armor:leather-jacket' as ItemURN;
      const nonWeaponSchema = {
        urn: 'flux:schema:armor:leather-jacket',
        baseMass: 2_000,
        fit: {
          [HumanAnatomy.TORSO]: 1,
        },
      } as unknown as ArmorSchema;

      scenario.registerSchema(nonWeaponSchema);
      scenario.assignItem(alice, { id: nonWeaponId, schema: nonWeaponSchema.urn });
      const command = createMockEquipCommand((c) => ({ ...c, args: { item: nonWeaponId } }));
      const result = equipReducer(context, command);

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

    it('should equip weapon with AP costs when in combat', () => {
      const command = createMockEquipCommand((c) => ({ ...c, session: combatSessionApi.session.id }));
      const result = equipReducer(context, command);
      expectSuccessfulEquip(result, { ap: 0.1, energy: 0 }); // Actual cost from weapon schema

      // Should have deducted AP from combatant
      const { combatant } = combatSessionApi.getCombatantApi(ALICE_ID);
      expect(getCurrentAp(combatant)).toBe(5.9); // 6.0 - 0.1
    });

    it('should error when insufficient AP in combat', () => {
      // Alice already has the weapon from beforeEach, so no need to add it again

      const aliceCombatant = combatSessionApi.getCombatantApi(ALICE_ID).combatant;
      setCurrentAp(aliceCombatant, 0);

      // Add the weapon to inventory manually (since we didn't pre-equip)
      const command = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: DEFAULT_COMBAT_SESSION,
        ts: DEFAULT_TIMESTAMP,
        args: { item: DEFAULT_WEAPON }
      }));

      const result = equipReducer(context, command);
      const errors = result.getDeclaredErrors();

      // Should error due to insufficient AP
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INSUFFICIENT_AP);

      // Should not declare any events
      expect(result.getDeclaredEvents()).toHaveLength(0);

      // Should not have equipped the weapon
      const actor = result.world.actors[ALICE_ID];
      expect(result.equipmentApi.getEquippedWeapon(actor)).toBeNull();

      // AP should remain unchanged
      expect(getCurrentAp(aliceCombatant)).toBe(0);
    });

    it('should error when session does not exist', () => {
      // Use a fresh context for this test since we need no combat session
      const context = createTransformerContext();
      const command = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        session: 'flux:session:combat:nonexistent',
        args: { item: DEFAULT_WEAPON }
      }));

      const result = equipReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });

    it('should error when actor not in combat session', () => {
      // Give Bob a weapon to equip
      const weaponItem = scenario.assignItem(bob, { schema: defaultWeaponSchema.urn });

      // Try to equip Bob's weapon while referencing the combat session
      // Bob is not in the combat session, so this should error
      const command = createMockEquipCommand((c) => ({
        ...c,
        session: combatSessionApi.session.id,
        actor: bob.id,
        args: { item: weaponItem.id }
      }));

      const result = equipReducer(context, command);

      expectError(result, ErrorCode.FORBIDDEN);
    });
  });
});

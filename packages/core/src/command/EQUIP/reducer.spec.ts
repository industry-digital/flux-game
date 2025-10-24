import { describe, it, expect, beforeEach } from 'vitest';
import { equipReducer } from './reducer';
import { EquipCommand } from './types';
import { ActorDidEquipWeapon, EventType } from '~/types/event';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createTransformerContext, createWorldProjection } from '~/worldkit/context';
import { ActorURN, ItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { WorldProjection } from '~/types/world';
import { createActor } from '~/worldkit/entity/actor';
import { TransformerContext } from '~/types/handler';
import { createEquipCommand } from '~/testing/command/factory/equipment';
import { Actor } from '~/types/entity/actor';
import { extractFirstEventOfType } from '~/testing/event';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon';
import { createPlace } from '~/worldkit/entity/place';
import { Place } from '~/types/entity/place';
import { MAX_AP } from '~/worldkit/combat/ap';
import { ErrorCode } from '~/types/error';

describe('EQUIP Command Reducer', () => {
  const DEFAULT_WEAPON: ItemURN = 'flux:item:weapon:iron-sword';
  const DEFAULT_WEAPON_SCHEMA: WeaponSchemaURN = 'flux:schema:weapon:sword';

  let context: TransformerContext;
  let command: EquipCommand;
  let alice: Actor;

  let defaultWeaponSchema: WeaponSchema;
  beforeEach(() => {
    defaultWeaponSchema = createWeaponSchema((w: WeaponSchema) => ({
      ...w,
      urn: DEFAULT_WEAPON_SCHEMA,
      timers: {
        ...w.timers,
        setup: 500, // 500ms = 0.5 AP
      },
    }));

    context = createTransformerContext((c: TransformerContext) => ({
      ...c,
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        actors: {
          [ALICE_ID]: createActor((a: Actor) => ({
            ...a,
            id: ALICE_ID,  // Ensure the ID is set correctly
            location: DEFAULT_LOCATION,
          })),
        },
        places: {
          [DEFAULT_LOCATION]: createPlace((p: Place) => ({
            ...p,
            id: DEFAULT_LOCATION,
          })),
        },
      })),
    }));

    // Get the alice actor from the context (not a separate instance)
    alice = context.world.actors[ALICE_ID];

    context.inventoryApi.addItem(alice, { id: DEFAULT_WEAPON, schema: DEFAULT_WEAPON_SCHEMA });

    command = createEquipCommand((command: EquipCommand) => ({
      ...command,
      args: {
        item: DEFAULT_WEAPON,
      },
    }));

  });

  describe('Out of Combat (No Session)', () => {
    it('should equip weapon without AP costs when not in combat', () => {
      const result = equipReducer(context, command);

      // Should succeed without errors
      expect(result.getDeclaredErrors()).toHaveLength(0);

      // Should declare ACTOR_DID_EQUIP_WEAPON event
      const events = result.getDeclaredEvents();
      expect(events).toHaveLength(1);

      const equipEvent = extractFirstEventOfType<ActorDidEquipWeapon>(events, EventType.ACTOR_DID_EQUIP_WEAPON)!;
      expect(equipEvent).toBeDefined();
      expect(equipEvent.payload.itemId).toBe(DEFAULT_WEAPON);
      expect(equipEvent.payload.schema).toBe(DEFAULT_WEAPON_SCHEMA);

      // Should NOT have cost in payload (out of combat)
      expect(equipEvent.payload.cost).toBeUndefined();

      // Should have equipped the weapon
      const actor = result.world.actors[ALICE_ID];
      expect(result.equipmentApi.getEquippedWeapon(actor)).toBe(DEFAULT_WEAPON);
    });

    it('should error when item not found in inventory', () => {
      // Remove the weapon from inventory to test the error case
      const actor = context.world.actors[ALICE_ID];
      delete actor.inventory.items[DEFAULT_WEAPON];

      const result = equipReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });

    it('should error when item is not a weapon', () => {
      const nonWeaponId = 'flux:item:health-potion' as ItemURN;

      // Add a non-weapon item to inventory and update command to reference it
      const actor = context.world.actors[ALICE_ID];
      actor.inventory.items[nonWeaponId] = {
        id: nonWeaponId,
        schema: 'flux:schema:armor:leather-jacket',
      };

      const testCommand = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        args: { item: nonWeaponId }
      }));

      const result = equipReducer(context, testCommand);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });
  });

  describe('In Combat (With Session)', () => {
    it('should equip weapon with AP costs when in combat', () => {
      // Create a base context with the proper place setup (like our beforeEach)
      const baseContext = createTransformerContext((c: TransformerContext) => ({
        ...c,
        world: createWorldProjection((w: WorldProjection) => ({
          ...w,
          places: {
            [DEFAULT_LOCATION]: createPlace((p: Place) => ({
              ...p,
              id: DEFAULT_LOCATION,
            })),
          },
        })),
      }));

      // Use useCombatScenario with our properly configured context
      const scenario = useCombatScenario(baseContext, {
        participants: {
          [ALICE_ID]: {
            team: 'heroes',
            name: 'Test Warrior',
            ap: MAX_AP,
            // Don't pre-equip - we want to test equipping it
          }
        },
        weapons: [defaultWeaponSchema],
        location: DEFAULT_LOCATION // Use the same location as our other tests
      });

      // Add the weapon to inventory manually (since we didn't pre-equip)
      const weaponItem = scenario.context.inventoryApi.addItem(
        scenario.actors[ALICE_ID].actor,
        { schema: defaultWeaponSchema.urn as WeaponSchemaURN }
      );

      const command = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: scenario.session.id,
        ts: DEFAULT_TIMESTAMP,
        args: { item: weaponItem.id }
      }));


      const result = equipReducer(scenario.context, command);

      // Should succeed without errors
      expect(result.getDeclaredErrors()).toHaveLength(0);

      // Should declare ACTOR_DID_EQUIP_WEAPON event with cost
      const events = result.getDeclaredEvents();
      expect(events).toHaveLength(1);

      const equipEvent = extractFirstEventOfType<ActorDidEquipWeapon>(events, EventType.ACTOR_DID_EQUIP_WEAPON)!;
      expect(equipEvent).toBeDefined();
      expect(equipEvent.payload.itemId).toBe(weaponItem.id);
      expect(equipEvent.payload.schema).toBe(defaultWeaponSchema.urn);

      // Should have cost in payload (in combat)
      expect(equipEvent.payload.cost).toEqual({ ap: 0.5, energy: 0 });

      // Should have equipped the weapon
      const actor = result.world.actors[ALICE_ID];
      expect(result.equipmentApi.getEquippedWeapon(actor)).toBe(weaponItem.id);

      // Should have deducted AP from combatant
      const updatedCombatant = result.world.sessions[scenario.session.id].data.combatants.get(ALICE_ID)!;
      expect(updatedCombatant.ap.eff.cur).toBe(5.5); // 6.0 - 0.5
    });

    it('should error when insufficient AP in combat', () => {
      // Create a base context with the proper place setup (like our successful test)
      const baseContext = createTransformerContext((c: TransformerContext) => ({
        ...c,
        world: createWorldProjection((w: WorldProjection) => ({
          ...w,
          places: {
            [DEFAULT_LOCATION]: createPlace((p: Place) => ({
              ...p,
              id: DEFAULT_LOCATION,
            })),
          },
        })),
      }));

      // Use useCombatScenario with our properly configured context
      const scenario = useCombatScenario(baseContext, {
        participants: {
          [ALICE_ID]: {
            team: 'heroes',
            name: 'Test Warrior',
            ap: 0.3, // Less than 0.5 AP required
            // Don't pre-equip - we want to test equipping it
          }
        },
        weapons: [defaultWeaponSchema],
        location: DEFAULT_LOCATION // Use the same location as our other tests
      });

      // Add the weapon to inventory manually (since we didn't pre-equip)
      const weaponItem = scenario.context.inventoryApi.addItem(
        scenario.actors[ALICE_ID].actor,
        { schema: defaultWeaponSchema.urn as WeaponSchemaURN }
      );

      const command = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: scenario.session.id,
        ts: DEFAULT_TIMESTAMP,
        args: { item: weaponItem.id }
      }));

      const result = equipReducer(scenario.context, command);
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
      const updatedCombatant = result.world.sessions[scenario.session.id].data.combatants.get(ALICE_ID)!;
      expect(updatedCombatant.ap.eff.cur).toBe(0.3);
    });

    it('should error when session does not exist', () => {
      // Use a fresh context for this test since we need no combat session

      const command = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        session: 'flux:session:combat:nonexistent',
        args: { item: DEFAULT_WEAPON }
      }));

      const result = equipReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_SESSION);
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });

    it('should error when actor not in combat session', () => {
      const otherActorId = 'flux:actor:other-warrior' as ActorURN;

      // Create a base context with the proper place setup
      const baseContext = createTransformerContext((c: TransformerContext) => ({
        ...c,
        world: createWorldProjection((w: WorldProjection) => ({
          ...w,
          places: {
            [DEFAULT_LOCATION]: createPlace((p: Place) => ({
              ...p,
              id: DEFAULT_LOCATION,
            })),
          },
        })),
      }));

      // Create a combat scenario with a different actor
      const scenario = useCombatScenario(baseContext, {
        participants: {
          [otherActorId]: {
            team: 'enemies',
            name: 'Other Warrior'
          }
        },
        weapons: [defaultWeaponSchema],
        location: DEFAULT_LOCATION
      });

      // Add ALICE to the world but NOT to the combat session
      scenario.context.world.actors[ALICE_ID] = createActor((a: Actor) => ({
        ...a,
        id: ALICE_ID,
        location: DEFAULT_LOCATION, // Ensure proper location
      }));

      const weaponItem = scenario.context.inventoryApi.addItem(
        scenario.context.world.actors[ALICE_ID],
        { schema: defaultWeaponSchema.urn as WeaponSchemaURN }
      );

      const command = createEquipCommand((cmd: EquipCommand) => ({
        ...cmd,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: scenario.session.id,
        ts: DEFAULT_TIMESTAMP,
        args: { item: weaponItem.id }
      }));

      const result = equipReducer(scenario.context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.FORBIDDEN);
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });
  });
});

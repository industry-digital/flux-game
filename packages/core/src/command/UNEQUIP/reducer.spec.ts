import { describe, it, expect, beforeEach } from 'vitest';
import { ActorDidUnequipWeapon, EventType } from '~/types/event';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createTransformerContext, createWorldProjection } from '~/worldkit/context';
import { ActorURN, ItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { WorldProjection } from '~/types/world';
import { createActor } from '~/worldkit/entity/actor';
import { TransformerContext } from '~/types/handler';
import { createUnequipCommand } from '~/testing/command/factory/equipment';
import { Actor } from '~/types/entity/actor';
import { extractFirstEventOfType } from '~/testing/event';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWeaponSchema } from '~/worldkit/schema/weapon';
import { createPlace } from '~/worldkit/entity/place';
import { Place } from '~/types/entity/place';
import { UnequipCommand } from '~/command/UNEQUIP/types';
import { unequipReducer } from '~/command/UNEQUIP/reducer';

describe('UNEQUIP Command Reducer', () => {
  const DEFAULT_WEAPON: ItemURN = 'flux:item:weapon:iron-sword';
  const DEFAULT_WEAPON_SCHEMA: WeaponSchemaURN = 'flux:schema:weapon:sword';

  let context: TransformerContext;
  let command: UnequipCommand;
  let alice: Actor;

  let defaultWeaponSchema: WeaponSchema;
  beforeEach(() => {
    defaultWeaponSchema = createWeaponSchema((w: WeaponSchema) => ({
      ...w,
      urn: DEFAULT_WEAPON_SCHEMA,
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

    // Add weapon to inventory and equip it (since UNEQUIP tests need an equipped weapon)
    context.inventoryApi.addItem(alice, { id: DEFAULT_WEAPON, schema: DEFAULT_WEAPON_SCHEMA });
    context.equipmentApi.equipWeapon(alice, DEFAULT_WEAPON);

    command = createUnequipCommand((command: UnequipCommand) => ({
      ...command,
      args: {
        item: DEFAULT_WEAPON,
      },
    }));

  });

  describe('Out of Combat (No Session)', () => {
    it('should unequip weapon without AP costs when not in combat', () => {
      const result = unequipReducer(context, command);

      // Should succeed without errors
      expect(result.getDeclaredErrors()).toHaveLength(0);

      // Should declare ACTOR_DID_UNEQUIP_WEAPON event
      const events = result.getDeclaredEvents();
      expect(events).toHaveLength(1);

      const unequipEvent = extractFirstEventOfType<ActorDidUnequipWeapon>(events, EventType.ACTOR_DID_UNEQUIP_WEAPON)!;
      expect(unequipEvent).toBeDefined();
      expect(unequipEvent.payload.itemId).toBe(DEFAULT_WEAPON);
      expect(unequipEvent.payload.schema).toBe(DEFAULT_WEAPON_SCHEMA);

      // Should NOT have cost in payload (out of combat)
      expect(unequipEvent.payload.cost).toBeUndefined();

      // Should have unequipped the weapon
      const actor = result.world.actors[ALICE_ID];
      expect(result.equipmentApi.getEquippedWeapon(actor)).toBeNull();
    });

    it('should error when item not found in inventory', () => {
      // Remove the weapon from inventory to test the error case
      const actor = context.world.actors[ALICE_ID];
      delete actor.inventory.items[DEFAULT_WEAPON];

      const result = unequipReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toContain('not found in actor');
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });

    it('should error when item is not equipped', () => {
      // Add a weapon to inventory but don't equip it (use the same weapon as the equipped one for simplicity)
      const unequippedWeapon = 'flux:item:weapon:second-sword' as ItemURN;
      const actor = context.world.actors[ALICE_ID];

      context.inventoryApi.addItem(actor, {
        id: unequippedWeapon,
        schema: DEFAULT_WEAPON_SCHEMA // Use the same schema as the equipped weapon
      });

      const testCommand = createUnequipCommand((cmd: UnequipCommand) => ({
        ...cmd,
        args: { item: unequippedWeapon }
      }));

      const result = unequipReducer(context, testCommand);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toContain('Item is not equipped');
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });
  });

  describe('In Combat (With Session)', () => {
    it('should unequip weapon with AP costs when in combat', () => {
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
            ap: 2.0, // More than enough for any AP cost
            equipment: { weapon: defaultWeaponSchema.urn } // Pre-equip the weapon
          }
        },
        weapons: [defaultWeaponSchema],
        location: DEFAULT_LOCATION // Use the same location as our other tests
      });

      // Get the equipped weapon from the actor
      const actor = scenario.actors[ALICE_ID].actor;
      const equippedWeaponId = scenario.context.equipmentApi.getEquippedWeapon(actor);

      const command = createUnequipCommand((cmd: UnequipCommand) => ({
        ...cmd,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: scenario.session.id,
        ts: DEFAULT_TIMESTAMP,
        args: { item: equippedWeaponId! }
      }));

      const result = unequipReducer(scenario.context, command);

      // Should succeed without errors
      expect(result.getDeclaredErrors()).toHaveLength(0);

      // Should declare ACTOR_DID_UNEQUIP_WEAPON event with cost
      const events = result.getDeclaredEvents();
      expect(events).toHaveLength(1);

      const unequipEvent = extractFirstEventOfType<ActorDidUnequipWeapon>(events, EventType.ACTOR_DID_UNEQUIP_WEAPON)!;
      expect(unequipEvent).toBeDefined();
      expect(unequipEvent.payload.itemId).toBe(equippedWeaponId);
      expect(unequipEvent.payload.schema).toBe(defaultWeaponSchema.urn);

      // Should have cost in payload (in combat) - UNEQUIP is free action
      expect(unequipEvent.payload.cost).toEqual({ ap: 0, energy: 0 });

      // Should have unequipped the weapon
      const resultActor = result.world.actors[ALICE_ID];
      expect(result.equipmentApi.getEquippedWeapon(resultActor)).toBeNull();

      // AP should remain unchanged (free action)
      const updatedCombatant = result.world.sessions[scenario.session.id].data.combatants.get(ALICE_ID)!;
      expect(updatedCombatant.ap.eff.cur).toBe(2.0); // No AP deducted
    });


    it('should error when session does not exist', () => {
      // Use a fresh context for this test since we need no combat session

      const command = createUnequipCommand((cmd: UnequipCommand) => ({
        ...cmd,
        session: 'flux:session:combat:nonexistent',
        args: { item: DEFAULT_WEAPON }
      }));

      const result = unequipReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toContain('Could not find session in world projection');
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

      // Add weapon to ALICE's inventory and equip it
      const weaponItem = scenario.context.inventoryApi.addItem(
        scenario.context.world.actors[ALICE_ID],
        { schema: defaultWeaponSchema.urn as WeaponSchemaURN }
      );
      scenario.context.equipmentApi.equipWeapon(scenario.context.world.actors[ALICE_ID], weaponItem.id);

      const command = createUnequipCommand((cmd: UnequipCommand) => ({
        ...cmd,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: scenario.session.id,
        ts: DEFAULT_TIMESTAMP,
        args: { item: weaponItem.id }
      }));

      const result = unequipReducer(scenario.context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toContain('Combat session required');
      expect(result.getDeclaredEvents()).toHaveLength(0);
    });
  });
});

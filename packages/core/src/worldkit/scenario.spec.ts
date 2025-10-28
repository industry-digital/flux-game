import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createWorldScenario, DEFAULT_WORLD_SCENARIO_INPUT } from './scenario';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_LOCATION } from '../testing/constants';
import { createTransformerContext } from '~/worldkit/context';
import { TransformerContext } from '~/types/handler';
import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { Party } from '~/types/entity/group';
import { WeaponSchema } from '~/types/schema/weapon';
import { AmmoSchema } from '~/types/schema/ammo';
import { CurrencyType } from '~/types/currency';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWeaponSchema } from '~/worldkit/schema/weapon/factory';
import { createAmmoSchema } from '~/worldkit/schema/ammo/factory';
import { createGroup } from '~/worldkit/entity/group/factory';
import { GroupType } from '~/types/entity/group';
import { ActorURN } from '~/types/taxonomy';

describe('createWorldScenario', () => {
  let context: TransformerContext;
  let testPlace: Place;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;
  let weapon: WeaponSchema;
  let ammo: AmmoSchema;

  beforeEach(() => {
    context = createTransformerContext();
    testPlace = createPlace((place: Place) => ({ ...place, id: DEFAULT_LOCATION, name: 'Test Location' }));
    alice = createActor((actor: Actor) => ({ ...actor, id: ALICE_ID, name: 'Alice' }));
    bob = createActor((actor: Actor) => ({ ...actor, id: BOB_ID, name: 'Bob' }));
    charlie = createActor((actor: Actor) => ({ ...actor, id: CHARLIE_ID, name: 'Charlie' }));
    weapon = createWeaponSchema({ urn: 'flux:schema:weapon:test-sword' });
    ammo = createAmmoSchema((schema: AmmoSchema) => ({ ...schema, urn: 'flux:schema:ammo:test-arrow' }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should return scenario with all expected functions', () => {
      const scenario = createWorldScenario(context);

      expect(scenario).toHaveProperty('addPlace');
      expect(scenario).toHaveProperty('addActor');
      expect(scenario).toHaveProperty('assignWeapon');
      expect(scenario).toHaveProperty('assignAmmo');
      expect(scenario).toHaveProperty('assignCurrency');
      expect(scenario).toHaveProperty('createParty');
      expect(scenario).toHaveProperty('assignToParty');
      expect(typeof scenario.addPlace).toBe('function');
      expect(typeof scenario.addActor).toBe('function');
      expect(typeof scenario.assignWeapon).toBe('function');
      expect(typeof scenario.assignAmmo).toBe('function');
      expect(typeof scenario.assignCurrency).toBe('function');
      expect(typeof scenario.createParty).toBe('function');
      expect(typeof scenario.assignToParty).toBe('function');
    });

    it('should use default input when none provided', () => {
      const scenario = createWorldScenario(context);

      // Should not throw and should return valid scenario
      expect(scenario).toBeDefined();
      expect(Object.keys(context.world.actors)).toHaveLength(0);
      expect(Object.keys(context.world.places)).toHaveLength(0);
    });

    it('should process input actors during initialization', () => {
      createWorldScenario(context, { actors: [alice, bob] });
      expect(context.world.actors[alice.id]).toEqual(alice);
      expect(context.world.actors[bob.id]).toEqual(bob);
    });

    it('should process input places during initialization', () => {
      createWorldScenario(context, { places: [testPlace] });

      expect(context.world.places[testPlace.id]).toEqual(testPlace);
    });

    it('should handle empty input arrays gracefully', () => {
      const scenario = createWorldScenario(context, { actors: [], places: [] });

      expect(scenario).toBeDefined();
      expect(Object.keys(context.world.actors)).toHaveLength(0);
      expect(Object.keys(context.world.places)).toHaveLength(0);
    });
  });

  describe('addPlace', () => {
    it('should add place to world', () => {
      const scenario = createWorldScenario(context);
      scenario.addPlace(testPlace);

      expect(context.world.places[testPlace.id]).toEqual(testPlace);
    });

    it('should overwrite existing place with same id', () => {
      const scenario = createWorldScenario(context);
      const place1: Place = createPlace((place: Place) => ({ ...place, id: DEFAULT_LOCATION, name: 'Original Place' }));
      const place2: Place = createPlace((place: Place) => ({ ...place, id: DEFAULT_LOCATION, name: 'Updated Place' }));

      scenario.addPlace(place1);
      scenario.addPlace(place2);

      expect(context.world.places[place2.id]).toEqual(place2);
      expect(context.world.places[place2.id].name).toBe('Updated Place');
    });
  });

  describe('addActor', () => {
    it('should add actor to world', () => {
      const scenario = createWorldScenario(context);
      scenario.addActor(alice);
      expect(context.world.actors[alice.id]).toEqual(alice);
    });

    it('should overwrite existing actor with same id', () => {
      const scenario = createWorldScenario(context);
      const alice1 = createActor((actor: Actor) => ({ ...actor, id: ALICE_ID, name: 'Alice Original' }));
      const alice2 = createActor((actor: Actor) => ({ ...actor, id: ALICE_ID, name: 'Alice Updated' }));

      scenario.addActor(alice1);
      scenario.addActor(alice2);

      expect(context.world.actors[alice2.id]).toEqual(alice2);
      expect(context.world.actors[alice2.id].name).toBe('Alice Updated');
    });
  });

  describe('assignWeapon', () => {
    let scenario: ReturnType<typeof createWorldScenario>;

    beforeEach(() => {
      scenario = createWorldScenario(context);
      scenario.addActor(alice);
    });

    it('should add weapon schema if not already present', () => {
      expect(context.schemaManager.hasSchema(weapon.urn)).toBe(false);

      scenario.assignWeapon(alice, weapon);

      expect(context.schemaManager.hasSchema(weapon.urn)).toBe(true);
      expect(context.schemaManager.getSchema(weapon.urn)).toEqual(weapon);
    });

    it('should not add weapon schema if already present', () => {
      context.schemaManager.addSchema(weapon);
      const originalSchema = context.schemaManager.getSchema(weapon.urn);

      scenario.assignWeapon(alice, weapon);

      expect(context.schemaManager.getSchema(weapon.urn)).toEqual(originalSchema);
    });

    it('should add weapon item to actor inventory and equip it', () => {
      const addItemSpy = vi.spyOn(context.inventoryApi, 'addItem');
      const getItemSpy = vi.spyOn(context.inventoryApi, 'getItem');
      const equipWeaponSpy = vi.spyOn(context.equipmentApi, 'equipWeapon');
      const mockItem = { id: 'item-123', schema: weapon.urn };
      addItemSpy.mockReturnValue(mockItem as any);
      getItemSpy.mockReturnValue(mockItem as any);

      scenario.assignWeapon(alice, weapon);

      expect(addItemSpy).toHaveBeenCalledWith(alice, { schema: weapon.urn });
      expect(equipWeaponSpy).toHaveBeenCalledWith(alice, 'item-123');
    });

  });

  describe('assignAmmo', () => {
    let scenario: ReturnType<typeof createWorldScenario>;

    beforeEach(() => {
      scenario = createWorldScenario(context);
      scenario.addActor(alice);
    });

    it('should add ammo schema if not already present', () => {
      expect(context.schemaManager.hasSchema(ammo.urn)).toBe(false);

      scenario.assignAmmo(alice, ammo, 50);

      expect(context.schemaManager.hasSchema(ammo.urn)).toBe(true);
      expect(context.schemaManager.getSchema(ammo.urn)).toEqual(ammo);
    });

    it('should not add ammo schema if already present', () => {
      context.schemaManager.addSchema(ammo);
      const originalSchema = context.schemaManager.getSchema(ammo.urn);

      scenario.assignAmmo(alice, ammo, 50);

      expect(context.schemaManager.getSchema(ammo.urn)).toEqual(originalSchema);
    });

    it('should add ammo to actor inventory with specified quantity', () => {
      const addAmmoSpy = vi.spyOn(context.weaponApi, 'addAmmoToInventory');

      scenario.assignAmmo(alice, ammo, 25);

      expect(addAmmoSpy).toHaveBeenCalledWith(alice, ammo.urn, 25);
    });
  });

  describe('assignCurrency', () => {
    let scenario: ReturnType<typeof createWorldScenario>;

    beforeEach(() => {
      scenario = createWorldScenario(context);
      scenario.addActor(alice);
    });

    it('should create and execute currency transaction', () => {
      const uniqidSpy = vi.spyOn(context, 'uniqid').mockReturnValue('test-trace-123');

      scenario.assignCurrency(alice, CurrencyType.SCRAP, 100);

      expect(uniqidSpy).toHaveBeenCalled();
      // Note: Testing the actual transaction execution would require mocking
      // the currency transaction functions, which depends on their implementation
    });

    it('should handle different currency types', () => {
      const uniqidSpy = vi.spyOn(context, 'uniqid').mockReturnValue('test-trace-456');

      scenario.assignCurrency(alice, CurrencyType.SCRAP, 250);
      scenario.assignCurrency(alice, CurrencyType.SCRAP, 1000);

      expect(uniqidSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle zero amount gracefully', () => {
      const uniqidSpy = vi.spyOn(context, 'uniqid').mockReturnValue('test-trace-zero');

      expect(() => scenario.assignCurrency(alice, CurrencyType.SCRAP, 0)).not.toThrow();
      expect(uniqidSpy).toHaveBeenCalled();
    });
  });

  describe('DEFAULT_WORLD_SCENARIO_INPUT', () => {
    it('should be frozen and contain empty arrays', () => {
      expect(Object.isFrozen(DEFAULT_WORLD_SCENARIO_INPUT)).toBe(true);
      expect(DEFAULT_WORLD_SCENARIO_INPUT.actors).toEqual([]);
      expect(DEFAULT_WORLD_SCENARIO_INPUT.places).toEqual([]);
    });

    it('should not allow modification', () => {
      expect(() => {
        (DEFAULT_WORLD_SCENARIO_INPUT as any).actors = ['modified'];
      }).toThrow();
    });
  });

  describe('createParty', () => {
    let scenario: ReturnType<typeof createWorldScenario>;

    beforeEach(() => {
      scenario = createWorldScenario(context);
      scenario.addActor(alice);
    });

    it('should create party with leader', () => {
      const createPartySpy = vi.spyOn(context.partyApi, 'createParty');
      const addPartyMemberSpy = vi.spyOn(context.partyApi, 'addPartyMember');
      const mockParty = createGroup(GroupType.PARTY, (party) => ({
        ...party,
        owner: alice.id,
      }));
      createPartySpy.mockReturnValue(mockParty as Party);

      const party = scenario.createParty(alice);

      expect(createPartySpy).toHaveBeenCalled();
      expect(addPartyMemberSpy).toHaveBeenCalledWith(mockParty, alice.id);
      expect(party).toEqual(mockParty);
    });

    it('should return the created party', () => {
      const mockParty = createGroup(GroupType.PARTY, (party) => ({
        ...party,
        owner: alice.id,
      }));
      vi.spyOn(context.partyApi, 'createParty').mockReturnValue(mockParty as Party);
      vi.spyOn(context.partyApi, 'addPartyMember').mockImplementation(() => {});

      const party = scenario.createParty(alice);

      expect(party).toBe(mockParty);
    });
  });

  describe('assignToParty', () => {
    let scenario: ReturnType<typeof createWorldScenario>;
    let party: Party;

    beforeEach(() => {
      scenario = createWorldScenario(context);
      scenario.addActor(alice);
      scenario.addActor(bob);
      scenario.addActor(charlie);

      party = createGroup(GroupType.PARTY, (party) => ({
        ...party,
        owner: alice.id,
        members: { [alice.id]: 1 } as Record<ActorURN, 1>,
        size: 1,
      })) as Party;
    });

    it('should add actors to party using partyApi', () => {
      const addPartyMemberSpy = vi.spyOn(context.partyApi, 'addPartyMember');

      scenario.assignToParty(party, [bob, charlie]);

      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, bob.id);
      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, charlie.id);
      expect(addPartyMemberSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle partyApi errors gracefully', () => {
      const addPartyMemberSpy = vi.spyOn(context.partyApi, 'addPartyMember');
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock partyApi to throw error for bob but succeed for charlie
      addPartyMemberSpy.mockImplementation((party, actorId) => {
        if (actorId === bob.id) {
          throw new Error('Already a member');
        }
      });

      expect(() => scenario.assignToParty(party, [bob, charlie])).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Could not add ${bob.id} to party ${party.id}`)
      );
      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, bob.id);
      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, charlie.id);

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty actor array gracefully', () => {
      const addPartyMemberSpy = vi.spyOn(context.partyApi, 'addPartyMember');

      scenario.assignToParty(party, []);

      expect(addPartyMemberSpy).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex scenario setup', () => {
      const battleAxe = createWeaponSchema({ urn: 'flux:schema:weapon:battle-axe' });
      const throwingKnife = createAmmoSchema((schema: AmmoSchema) => ({
        ...schema,
        urn: 'flux:schema:ammo:throwing-knife'
      }));

      const scenario = createWorldScenario(context, { actors: [alice], places: [testPlace] });

      // Verify initial setup
      expect(context.world.actors[alice.id]).toEqual(alice);
      expect(context.world.places[testPlace.id]).toEqual(testPlace);

      // Add equipment and currency
      scenario.assignWeapon(alice, battleAxe);
      scenario.assignAmmo(alice, throwingKnife, 10);
      scenario.assignCurrency(alice, CurrencyType.SCRAP, 500);

      // Verify schemas were added
      expect(context.schemaManager.hasSchema(battleAxe.urn)).toBe(true);
      expect(context.schemaManager.hasSchema(throwingKnife.urn)).toBe(true);
    });

    it('should handle party-based scenario setup', () => {
      const createPartySpy = vi.spyOn(context.partyApi, 'createParty');
      const addPartyMemberSpy = vi.spyOn(context.partyApi, 'addPartyMember');
      const mockParty = createGroup(GroupType.PARTY, (party) => ({
        ...party,
        name: 'Adventure Party',
        owner: alice.id,
      }));
      createPartySpy.mockReturnValue(mockParty as Party);

      const scenario = createWorldScenario(context, { actors: [alice, bob, charlie], places: [testPlace] });

      // Create party with Alice as leader
      const party = scenario.createParty(alice);

      // Add other members to the party
      scenario.assignToParty(party, [bob, charlie]);

      // Equip the party
      scenario.assignWeapon(alice, weapon);
      scenario.assignAmmo(alice, ammo, 20);
      scenario.assignCurrency(alice, CurrencyType.SCRAP, 1000);

      // Verify party creation and membership
      expect(createPartySpy).toHaveBeenCalled();
      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, alice.id);
      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, bob.id);
      expect(addPartyMemberSpy).toHaveBeenCalledWith(party, charlie.id);
      expect(party).toBe(mockParty);

      // Verify world state
      expect(context.world.actors[alice.id]).toEqual(alice);
      expect(context.world.actors[bob.id]).toEqual(bob);
      expect(context.world.actors[charlie.id]).toEqual(charlie);
      expect(context.world.places[testPlace.id]).toEqual(testPlace);
    });
  });
});

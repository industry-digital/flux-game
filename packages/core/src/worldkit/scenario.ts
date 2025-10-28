import { CurrencyType, TransactionType } from '~/types/currency';
import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { Party } from '~/types/entity/group';
import { TransformerContext } from '~/types/handler';
import { AmmoSchema } from '~/types/schema/ammo';
import { WeaponSchema } from '~/types/schema/weapon';
import { createCurrencyTransaction, executeCurrencyTransaction } from '~/worldkit/entity';

export type WorldScenarioHook = {
  addPlace: (place: Place) => void,
  addActor: (actor: Actor) => void,
  assignWeapon: (actor: Actor, weapon: WeaponSchema) => void,
  assignAmmo: (actor: Actor, ammo: AmmoSchema, quantity: number) => void,
  assignCurrency: (actor: Actor, currency: CurrencyType, amount: number) => void,
  createParty: (leader: Actor) => Party,
  assignToParty: (party: Party, actors: Actor[]) => void,
};

export type WorldScenarioInput = {
  actors?: Actor[];
  places?: Place[];
};

export const DEFAULT_WORLD_SCENARIO_INPUT: Readonly<WorldScenarioInput> = Object.freeze({
  actors: [],
  places: [],
});

export const createWorldScenario = (
  context: TransformerContext,
  input: WorldScenarioInput = DEFAULT_WORLD_SCENARIO_INPUT,
): WorldScenarioHook => {
  const { world, schemaManager, inventoryApi, equipmentApi, weaponApi, partyApi } = context;

  const addPlace = (place: Place) => {
    world.places[place.id] = place;
  };

  const addActor = (actor: Actor) => {
    world.actors[actor.id] = actor;
  };

  const assignWeapon = (actor: Actor, weapon: WeaponSchema) => {
    if (!context.schemaManager.hasSchema(weapon.urn)) {
      schemaManager.addSchema(weapon);
    }
    const weaponItem = inventoryApi.addItem(actor, { schema: weapon.urn });
    equipmentApi.equipWeapon(actor, weaponItem.id);
  };

  const assignAmmo = (actor: Actor, ammo: AmmoSchema, quantity: number) => {
    if (!schemaManager.hasSchema(ammo.urn)) {
      schemaManager.addSchema(ammo);
    }
    weaponApi.addAmmoToInventory(actor, ammo.urn, quantity);
  };

  const assignCurrency = (actor: Actor, currency: CurrencyType, amount: number) => {
    const transaction = createCurrencyTransaction({
      type: TransactionType.CREDIT,
      actorId: actor.id,
      currency,
      amount,
      trace: context.uniqid(),
    });

    executeCurrencyTransaction(context, actor, transaction);
  };

  const createParty = (leader: Actor): Party => {
    // Use the existing partyApi to create the party
    const party = partyApi.createParty();

    // Add the leader as the first member
    partyApi.addPartyMember(party, leader.id);

    return party;
  };

  const assignToParty = (party: Party, actors: Actor[]) => {
    for (const actor of actors) {
      try {
        // Use the existing partyApi which handles all the validation
        partyApi.addPartyMember(party, actor.id);
      } catch (error) {
        // partyApi will handle cases like: already a member, etc.
        // We could either ignore or re-throw depending on test needs
        console.warn(`Could not add ${actor.id} to party ${party.id}: ${error}`);
      }
    }
  };

  if (input.actors) {
    for (const actor of input.actors) {
      addActor(actor);
    }
  }

  if (input.places) {
    for (const place of input.places) {
      addPlace(place);
    }
  }

  return {
    addPlace,
    addActor,
    assignWeapon,
    assignAmmo,
    assignCurrency,
    createParty,
    assignToParty,
  };
};

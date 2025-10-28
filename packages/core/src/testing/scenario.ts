import { CurrencyType, TransactionType } from '~/types/currency';
import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
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
};

const NO_ACTORS: Actor[] = [];
const NO_PLACES: Place[] = [];

export type WorldScenarioInput = {
  actors?: Actor[];
  places?: Place[];
};

export const DEFAULT_WORLD_SCENARIO_INPUT = {
  actors: [],
  places: [],
};

export const useWorldScenario = (
  context: TransformerContext,
  input: WorldScenarioInput = DEFAULT_WORLD_SCENARIO_INPUT,
): WorldScenarioHook => {

  const addPlace = (place: Place) => {
    context.world.places[place.id] = place;
  };

  const addActor = (actor: Actor) => {
    context.world.actors[actor.id] = actor;
  };

  const assignWeapon = (actor: Actor, weapon: WeaponSchema) => {
    const weaponItem = context.inventoryApi.addItem(actor, { schema: weapon.urn });
    context.equipmentApi.equipWeapon(actor, weaponItem.id);
  };

  const assignAmmo = (actor: Actor, ammo: AmmoSchema, quantity: number) => {
    context.weaponApi.addAmmoToInventory(actor, ammo.urn, quantity);
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
  };
};

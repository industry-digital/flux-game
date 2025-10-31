import { createPlace, createWorldScenario, CurrencyType, WorldScenarioHook } from '@flux/core';
import { TransformerContext } from '@flux/core';
import { createDefaultActors } from '~/scenario/actors';

export const createDefaultWorldScenario = (context: TransformerContext): WorldScenarioHook => {
  const scenario  = createWorldScenario(context);

  const place = createPlace({
    id: 'flux:place:origin',
    name: 'Origin',
  });

  scenario.addPlace(place);

  const { alice, bob } = createDefaultActors(place);

  scenario.addActor(alice);
  scenario.addActor(bob);

  const sword = context.schemaManager.getSchema('flux:schema:weapon:sword');

  scenario.assignWeapon(alice, sword);
  scenario.assignWeapon(bob, sword);

  scenario.assignCurrency(alice, CurrencyType.SCRAP, 10_000);
  scenario.assignCurrency(bob, CurrencyType.SCRAP, 10_000);

  return scenario;
};

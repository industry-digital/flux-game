import { TransformerContext } from '~/types/handler';
import { createWorldScenario } from '~/worldkit/scenario';
import { createDefaultActors } from '~/testing/actors';
import { createPlace } from '~/worldkit/entity/place';
import { DEFAULT_LOCATION } from '~/testing/constants';

export const createDefaultWorldScenario = (context: TransformerContext) => {
  const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
  const { alice, bob } = createDefaultActors();

  alice.location = place.id;
  bob.location = place.id;

  return createWorldScenario(context, {
    places: [place],
    actors: [alice, bob],
  });
}

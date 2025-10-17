import { createActor, createPlace, createTransformerContext, createWorldProjection, Gender, type TransformerContext, type WorldProjection } from '@flux/core';
import { useRef } from 'react';
import { TEST_PLACE_ID, ALICE_ID, BOB_ID, CHARLIE_ID, DAVE_ID, ERIC_ID, FRANZ_ID } from '../constants';

export const useTransformerContext = (): TransformerContext => {
  // Create the shared TransformerContext at the composition root
  // Use ref to maintain stable reference and avoid infinite re-renders
  const contextRef = useRef<TransformerContext | null>(null);
  if (!contextRef.current) {
    contextRef.current = createTransformerContext(
      (c: TransformerContext) => ({
        ...c,
        world: createWorldProjection((w: WorldProjection) => ({
          ...w,
          places: {
            ...w.places,
            [TEST_PLACE_ID]: createPlace({ id: TEST_PLACE_ID }),
          },
          actors: {
            ...w.actors,
            [ALICE_ID]: createActor({ id: ALICE_ID, name: 'Alice', gender: Gender.FEMALE }),
            [BOB_ID]: createActor({ id: BOB_ID, name: 'Bob' }),
            [CHARLIE_ID]: createActor({ id: CHARLIE_ID, name: 'Charlie' }),
            [DAVE_ID]: createActor({ id: DAVE_ID, name: 'Dave' }),
            [ERIC_ID]: createActor({ id: ERIC_ID, name: 'Eric', }),
            [FRANZ_ID]: createActor({ id: FRANZ_ID, name: 'Franz' }),
          },
        })),
      })
    );
  }

  return contextRef.current;
};

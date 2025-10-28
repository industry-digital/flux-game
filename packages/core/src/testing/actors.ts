import { Actor, Gender } from "~/types/entity/actor";
import { ALICE_ID, BOB_ID, CHARLIE_ID, DAVID_ID } from "./constants";
import { createActor } from '~/worldkit/entity/actor';

export type DefaultActors = {
  alice: Actor;
  bob: Actor;
  charlie: Actor;
  david: Actor;
};

export const createDefaultActors = (): DefaultActors => {
  return {
    alice: createActor({ id: ALICE_ID, name: 'Alice', gender: Gender.FEMALE }),
    bob: createActor({ id: BOB_ID, name: 'Bob' }),
    charlie: createActor({ id: CHARLIE_ID, name: 'Charlie' }),
    david: createActor({ id: DAVID_ID, name: 'David' }),
  };
};

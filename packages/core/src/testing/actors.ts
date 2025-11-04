import { Actor, Gender } from "~/types/entity/actor";
import { ALICE_ID, BOB_ID, CHARLIE_ID, DAVID_ID, DEFAULT_LOCATION } from "./constants";
import { createActor } from '~/worldkit/entity/actor';
import { PlaceURN } from '~/types/taxonomy';

export type DefaultActors = {
  alice: Actor;
  bob: Actor;
  charlie: Actor;
  david: Actor;
};

export const createDefaultActors = (location: PlaceURN = DEFAULT_LOCATION): DefaultActors => {
  return {
    alice: createActor({ id: ALICE_ID, name: 'Alice', gender: Gender.FEMALE, location }),
    bob: createActor({ id: BOB_ID, name: 'Bob', location }),
    charlie: createActor({ id: CHARLIE_ID, name: 'Charlie', location }),
    david: createActor({ id: DAVID_ID, name: 'David', location }),
  };
};

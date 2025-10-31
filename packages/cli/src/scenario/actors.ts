import { Actor, createActor, Gender, Place } from '@flux/core';

const DEFAULT_ACTORS = [
  { id: 'flux:actor:alice', name: 'Alice', gender: Gender.FEMALE },
  { id: 'flux:actor:bob', name: 'Bob', gender: Gender.MALE },
  { id: 'flux:actor:charlie', name: 'Charlie', gender: Gender.MALE },
] as const;

export type DefaultActors = {
  alice: Actor;
  bob: Actor;
  charlie: Actor;
};

export const createDefaultActors = (place: Place): DefaultActors => {
  const [aliceInput, bobInput, charlieInput] = DEFAULT_ACTORS;

  return {
    alice: createActor((actor) => ({ ...actor, ...aliceInput, location: place.id })),
    bob: createActor((actor) => ({ ...actor, ...bobInput, location: place.id })),
    charlie: createActor((actor) => ({ ...actor, ...charlieInput, location: place.id })),
  };
};

import { describe, expect, it } from 'vitest';
import { createActor } from '.';
import { WellKnownPlace } from '~/types/world/space';

describe('createActor', () => {
  it('should create an actor with the default location', () => {
    const actor = createActor({});
    expect(actor.location).toBe(WellKnownPlace.ORIGIN);
  });
});

import { describe, expect, it } from 'vitest';
import { createActor } from '.';

describe('createActor', () => {
  it('should create an actor no arguments', () => {
    const actor = createActor();
    expect(actor.id).toBeDefined();
  });

  it('should create an actor with a custom input', () => {
    const actor = createActor({
      name: 'Test Actor',
    });
    expect(actor.name).toBe('Test Actor');
  });

  it('should create an actor with a custom transform', () => {
    const actor = createActor((actor) => ({
      ...actor,
      name: 'Test Actor',
    }));
    expect(actor.name).toBe('Test Actor');
  });
});

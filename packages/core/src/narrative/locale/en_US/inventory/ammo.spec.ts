import { describe, it, expect, beforeEach } from 'vitest';
import { narrateActorDidGainInventoryAmmo, narrateActorDidLoseInventoryAmmo } from './ammo';
import { createTransformerContext } from '~/worldkit/context';
import { ActorURN, AmmoSchemaURN } from '~/types/taxonomy';
import { ALICE_ID, BOB_ID } from '~/testing/constants';
import { createActorDidGainAmmoEvent, createActorDidLoseAmmoEvent } from '~/testing/event/factory/ammo';
import { Gender } from '~/types/entity/actor';
import { createActor } from '~/worldkit/entity/actor';

describe('Ammo Inventory Narratives', () => {
  let context: ReturnType<typeof createTransformerContext>;

  beforeEach(() => {
    context = createTransformerContext();

    // Create test actors
    const alice = createActor({ id: ALICE_ID, name: 'Alice', gender: Gender.FEMALE });
    const bob = createActor({ id: BOB_ID, name: 'Bob', gender: Gender.MALE });

    context.world.actors[ALICE_ID] = alice;
    context.world.actors[BOB_ID] = bob;
  });

  describe('narrateActorDidGainInventoryAmmo', () => {
    it('should render gain narrative from actor perspective with different sources', () => {
      const foundEvent = createActorDidGainAmmoEvent((e) => ({ ...e, payload: { ...e.payload, source: 'found' } }));
      const unloadedEvent = createActorDidGainAmmoEvent((e) => ({ ...e, payload: { ...e.payload, source: 'unloaded' } }));
      const purchasedEvent = createActorDidGainAmmoEvent((e) => ({ ...e, payload: { ...e.payload, source: 'purchased' } }));

      expect(narrateActorDidGainInventoryAmmo(context, foundEvent, ALICE_ID)).toBe('You find 10 pistol rounds.');
      expect(narrateActorDidGainInventoryAmmo(context, unloadedEvent, ALICE_ID)).toBe('You unload 10 pistol rounds.');
      expect(narrateActorDidGainInventoryAmmo(context, purchasedEvent, ALICE_ID)).toBe('You acquire 10 pistol rounds.');
    });

    it('should render gain narrative from observer perspective', () => {
      const event = createActorDidGainAmmoEvent();
      const narrative = narrateActorDidGainInventoryAmmo(context, event, BOB_ID);
      expect(narrative).toBe('Alice finds 10 pistol rounds.');
    });

    it('should handle singular quantities correctly', () => {
      const event = createActorDidGainAmmoEvent((e) => ({ ...e, payload: { ...e.payload, quantity: 1 } }));
      const narrative = narrateActorDidGainInventoryAmmo(context, event, ALICE_ID);
      expect(narrative).toBe('You find 1 pistol round.');
    });

    it('should handle different ammo types', () => {
      const arrowEvent = createActorDidGainAmmoEvent((e) => ({
        ...e,
        payload: {
          ...e.payload,
          schema: 'flux:schema:ammo:arrow' as AmmoSchemaURN,
          quantity: 5
        }
      }));
      const narrative = narrateActorDidGainInventoryAmmo(context, arrowEvent, ALICE_ID);
      expect(narrative).toBe('You find 5 arrows.');
    });

    it('should return empty string for missing actor', () => {
      const event = createActorDidGainAmmoEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidGainInventoryAmmo(context, event, ALICE_ID);
      expect(narrative).toBe('');
    });
  });

  describe('narrateActorDidLoseInventoryAmmo', () => {
    it('should render loss narrative from actor perspective', () => {
      const event = createActorDidLoseAmmoEvent();
      const narrative = narrateActorDidLoseInventoryAmmo(context, event, ALICE_ID);
      expect(narrative).toBe('You lose 10 pistol rounds.');
    });

    it('should render loss narrative from observer perspective', () => {
      const event = createActorDidLoseAmmoEvent();
      const narrative = narrateActorDidLoseInventoryAmmo(context, event, BOB_ID);
      expect(narrative).toBe('Alice loses 10 pistol rounds.');
    });

    it('should handle singular quantities correctly', () => {
      const event = createActorDidLoseAmmoEvent((e) => ({ ...e, payload: { ...e.payload, quantity: 1 } }));
      const narrative = narrateActorDidLoseInventoryAmmo(context, event, ALICE_ID);
      expect(narrative).toBe('You lose 1 pistol round.');
    });

    it('should return empty string for missing actor', () => {
      const event = createActorDidLoseAmmoEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidLoseInventoryAmmo(context, event, ALICE_ID);
      expect(narrative).toBe('');
    });
  });
});

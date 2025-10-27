import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_TRACE } from '~/testing/constants';
import { Transform } from '~/testing/types';
import { ActorDidGainAmmo, ActorDidLoseAmmo, EventType, WorldEvent, WorldEventInput } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';

const identity = <T>(x: T): T => x;

export type AmmoEventFactoryDependencies = {
  createWorldEvent: (input: WorldEventInput) => WorldEvent;
};

export const DEFAULT_AMMO_EVENT_FACTORY_DEPS: AmmoEventFactoryDependencies = {
  createWorldEvent,
};

export const createActorDidGainAmmoEvent = (
  transform: Transform<ActorDidGainAmmo> = identity,
  deps: AmmoEventFactoryDependencies = DEFAULT_AMMO_EVENT_FACTORY_DEPS
): ActorDidGainAmmo => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidGainAmmo = createWorldEvent({
    type: EventType.ACTOR_DID_GAIN_AMMO,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      itemId: 'flux:item:ammo:001',
      schema: 'flux:schema:ammo:pistol',
      quantity: 10,
      source: 'found' as const,
    },
  }) as ActorDidGainAmmo;

  return transform(baseEvent);
};

export const createActorDidLoseAmmoEvent = (
  transform: Transform<ActorDidLoseAmmo> = identity,
  deps: AmmoEventFactoryDependencies = DEFAULT_AMMO_EVENT_FACTORY_DEPS
): ActorDidLoseAmmo => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidLoseAmmo = createWorldEvent({
    type: EventType.ACTOR_DID_LOSE_AMMO,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      itemId: 'flux:item:ammo:001',
      schema: 'flux:schema:ammo:pistol',
      quantity: 10,
    },
  }) as ActorDidLoseAmmo;

  return transform(baseEvent);
};

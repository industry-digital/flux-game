import { createWorldEvent } from '~/worldkit/event';

export type CombatEventFactoryDependencies = {
  createWorldEvent: typeof createWorldEvent;
};

export const DEFAULT_COMBAT_EVENT_FACTORY_DEPS: Readonly<CombatEventFactoryDependencies>
  = Object.freeze({ createWorldEvent });

import { WellKnownDuration } from '~/types/world/time';
import { createEffectSchema } from './factory';
import { EffectCurve, EffectTerminationCondition } from '~/types/schema/effect';

/**
 * Bleeding effect schema - damage over time that starts strong and clots
 */
export const bleedingEffectSchema = createEffectSchema(
  (defaults) => ({
    ...defaults,
    urn: 'flux:effect:condition:bleeding',
    curve: EffectCurve.EASE_OUT,
    duration: [3, WellKnownDuration.COMBAT_TURN],
    lifecycle: {
      [EffectTerminationCondition.ENDS_ON_DEATH]: 1,
    },
  }),
);

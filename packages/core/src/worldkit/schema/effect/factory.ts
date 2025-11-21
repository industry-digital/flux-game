import { EffectSchema, EffectCurve, EffectTerminationCondition } from '~/types/schema/effect';
import { WellKnownDuration } from '~/types/world/time';

type Transform<T> = (x: T) => T;
const identity: Transform<any> = x => x;

/**
 * Create an effect schema with sensible defaults
 * Follows the same pattern as createWeaponSchema
 */
export function createEffectSchema(
  transform = identity,
): EffectSchema {
  const defaults: Partial<EffectSchema> = {
    curve: EffectCurve.LINEAR,
    duration: WellKnownDuration.COMBAT_TURN,
    lifecycle: {
      [EffectTerminationCondition.ENDS_ON_DEATH]: 1,
    },
    presentation: {
      icon: 'default-effect',
      color: '#ffffff',
    },
  };

  const output = transform(defaults) as EffectSchema;
  if (!output.urn) {
    throw new Error('Effect schema must have a URN');
  }

  return output;
}

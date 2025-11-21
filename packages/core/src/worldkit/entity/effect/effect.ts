import { AppliedEffects, WellKnownEffect } from '~/types/entity/effect';
import { EffectURN } from '~/types/taxonomy';

export type EntityWithAppliedEffects = {
  effects: AppliedEffects;
};

export type EntityEffectQueryFn = (entity: EntityWithAppliedEffects) => boolean;

const withFirstEffectHavingSchema = (
  schema: EffectURN,
  queryFn?: EntityEffectQueryFn,
): EntityEffectQueryFn => {
  return (entity: EntityWithAppliedEffects) => {
    for (const effectId in entity.effects) {
      const effect = entity.effects[effectId];
      if (effect.schema === schema) {
        return true;
      }
    }
    return queryFn ? queryFn(entity) : false;
  };
};

export const isBurning = withFirstEffectHavingSchema(WellKnownEffect.BURNING);

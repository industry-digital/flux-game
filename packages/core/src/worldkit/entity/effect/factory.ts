import { AppliedEffect } from '~/types/entity/effect';
import { EffectURN } from '~/types/taxonomy';
import { timestamp } from '~/lib/timestamp';

export type AppliedEffectFactoryDependencies = {
  timestamp: () => number;
};

export const DEFAULT_APPLIED_EFFECT_FACTORY_DEPS: AppliedEffectFactoryDependencies = {
  timestamp,
};

export const createAppliedEffect = (
  schema: EffectURN,
  input: Partial<AppliedEffect>,
  deps: AppliedEffectFactoryDependencies = DEFAULT_APPLIED_EFFECT_FACTORY_DEPS,
): AppliedEffect => {
  const defaults: Partial<AppliedEffect> = {
    schema,
    ts: deps.timestamp(),
    position: 0.0,
  };

  return { ...defaults, ...input } as AppliedEffect;
};

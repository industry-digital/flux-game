import { createEffectUrn } from '~/lib/taxonomy';

export const EffectType = {
  DEAD: createEffectUrn('dead'),
  INCAPACITATED: createEffectUrn('incapacitated'),
  UNCONSCIOUS: createEffectUrn('unconscious'),
  STUNNED: createEffectUrn('stunned'),
  BLINDED: createEffectUrn('blinded'),
} as const;

export type EffectType = typeof EffectType[keyof typeof EffectType];

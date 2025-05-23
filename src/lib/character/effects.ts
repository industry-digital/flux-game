import { createEffectUrn } from '~/lib/taxonomy';

export const EffectType = {
  STUNNED: createEffectUrn('stunned'),
  BLINDED: createEffectUrn('blinded'),
} as const;

export type EffectType = typeof EffectType[keyof typeof EffectType];

import { createTaxonomyUrn } from '~/lib/taxonomy';
import { Vocabulary } from '~/types/domain';

export enum EffectType {
  DEAD = 'dead',
  INCAPACITATED = 'incapacitated',
  UNCONSCIOUS = 'unconscious',
  STUNNED = 'stunned',
  BLINDED = 'blinded',
}

export const createEffectURN = (effect: EffectType): string => createTaxonomyUrn(Vocabulary.EFFECT, effect);

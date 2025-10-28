import { Gender } from '~/types/entity/actor';

const HIS = 'his';
const HER = 'her';

/**
 * Get the appropriate possessive pronoun based on actor gender
 */
export const getPossessivePronoun = (gender: Gender): string => {
  return gender === Gender.MALE ? HIS : HER;
};

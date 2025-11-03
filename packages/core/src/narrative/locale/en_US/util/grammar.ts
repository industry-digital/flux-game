import { Gender } from '~/types/entity/actor';

const HIS = 'his';
const HER = 'her';

/**
 * Get the appropriate possessive pronoun based on actor gender
 */
export const getPossessivePronoun = (gender: Gender): string => {
  return gender === Gender.MALE ? HIS : HER;
};

/**
 * Convert a name to its possessive form
 */
export const toPossessive = (name: string): string => {
  const lastChar = name.charAt(name.length - 1);
  if (lastChar === 's') {
    return `${name}'`;
  }
  return `${name}'s`;
};

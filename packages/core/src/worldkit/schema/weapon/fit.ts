import { AnatomyURN } from '~/types/taxonomy';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';

export const ONE_HANDED_FIT: Record<AnatomyURN, 1> = {
  [HumanAnatomy.RIGHT_HAND]: 1,
};

export const TWO_HANDED_FIT: Record<AnatomyURN, 1> = {
  [HumanAnatomy.RIGHT_HAND]: 1,
  [HumanAnatomy.LEFT_HAND]: 1,
};

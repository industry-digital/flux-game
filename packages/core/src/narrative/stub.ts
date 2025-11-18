import { WorldEvent } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';
import { EMPTY_NARRATIVE, NOT_IMPLEMENTED_NARRATIVE } from '~/narrative/constants';

export const NOT_IMPLEMENTED: TemplateFunction<WorldEvent> = () => {
  return NOT_IMPLEMENTED_NARRATIVE;
};

/**
 * Template for events that should not generate any narrative output
 * Use this for administrative/system events that players shouldn't see
 */
export const NOT_NEEDED: TemplateFunction<WorldEvent> = () => EMPTY_NARRATIVE;

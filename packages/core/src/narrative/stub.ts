import { WorldEvent } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';

export const NOT_IMPLEMENTED: TemplateFunction<WorldEvent> = (...args: any) => {
  return 'TEMPLATE_NOT_IMPLEMENTED';
};

const EMPTY_STRING = '';
/**
 * Template for events that should not generate any narrative output
 * Use this for administrative/system events that players shouldn't see
 */
export const NOT_NEEDED: TemplateFunction<WorldEvent> = (...args: any) => EMPTY_STRING;

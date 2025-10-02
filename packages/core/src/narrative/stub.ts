import { WorldEvent } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';

export const NOT_IMPLEMENTED: TemplateFunction<WorldEvent> = (...args: any) => {
  return 'TEMPLATE_NOT_IMPLEMENTED';
};

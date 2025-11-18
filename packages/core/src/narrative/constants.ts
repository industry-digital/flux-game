import { Narrative } from '~/types/narrative';

export const EMPTY_NARRATIVE: Readonly<Narrative> = Object.freeze({
  self: '',
  observer: ''
});

export const NOT_IMPLEMENTED_NARRATIVE: Readonly<Narrative> = Object.freeze({
  self: 'TEMPLATE_NOT_IMPLEMENTED',
  observer: 'TEMPLATE_NOT_IMPLEMENTED'
});

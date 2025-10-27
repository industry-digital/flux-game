import { EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ActorURN, PlaceURN } from '~/types/taxonomy';

export enum Perspective {
  SELF = 'self',
  TARGET = 'target',
  OBSERVER = 'observer',
}

/**
 * Narrative sequences
 */
type NarrativeSequenceItem = { text: string, delay: number };
export type NarrativeSequence = NarrativeSequenceItem[];

export type TemplateOutput = string | NarrativeSequence;

export type NarrativeRecipient = ActorURN | PlaceURN;

export type TemplateFunction<
  TWorldEvent extends WorldEvent,
  TRecipient extends NarrativeRecipient = NarrativeRecipient,
  TOutput extends TemplateOutput = string,
> = (
  context: TransformerContext,
  event: TWorldEvent,
  recipient: TRecipient,
  ...args: any[]
) => TOutput;

/**
 * Complete language template interface
 *
 * Every language module must implement this exact interface to ensure
 * complete narrative coverage across all supported game events.
 */
export type LanguageTemplates = {
  [K in EventType]: TemplateFunction<Extract<WorldEvent, { type: K }>, any>;
};

export type LanguageTemplatesResolver = () => LanguageTemplates;

import { EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';

export enum Perspective {
  SELF = 'self',
  OBSERVER = 'observer',
}

/**
 * Simple narrative item
 */
export type PrivateNarrative = { [Perspective.SELF]: string };
export type PublicNarrative = { [Perspective.OBSERVER]: string };
export type SharedNarrative = PrivateNarrative & PublicNarrative;
export type NarrativeItem = PrivateNarrative | PublicNarrative | SharedNarrative;

/**
 * Narrative sequences
 */
type NarrativeSequenceItemBase = NarrativeItem & { delay: number };
type NarrativeSequenceItem = NarrativeSequenceItemBase & NarrativeItem;
export type NarrativeSequence = NarrativeSequenceItem[];

export type TemplateOutput = NarrativeItem | NarrativeSequence;

export type TemplateFunction<
  TWorldEvent extends WorldEvent,
  TOutput extends TemplateOutput,
> = (
  context: TransformerContext,
  event: TWorldEvent,
  as: ActorURN,
) => TOutput;

/**
 * Complete language template interface
 *
 * Every language module must implement this exact interface to ensure
 * complete narrative coverage across all supported game events.
 */
export type LanguageTemplates = Record<EventType, TemplateFunction<WorldEvent, TemplateOutput>>;

export type LanguageTemplatesResolver = () => LanguageTemplates;

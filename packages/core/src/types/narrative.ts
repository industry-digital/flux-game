import { TransformerContext } from '~/types/handler';
import { Actor } from '~/types/entity/actor';
import { WorldEvent } from '~/types/event';

export enum Perspective {
  SELF = 'self',
  OBSERVER = 'observer',
}

export enum NarrativeType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

type NarrativeItem = PrivateNarrative | PublicNarrative | SharedNarrative;
type NarrativeSequenceItemBase = NarrativeItem & { delay: number };
type NarrativeSequenceItem = NarrativeSequenceItemBase & NarrativeItem;

export type NarrativeSequence = NarrativeSequenceItem[];

export type PrivateNarrative = {
  [Perspective.SELF]: string;
};

export type PublicNarrative = {
  [Perspective.OBSERVER]: string;
};

export type SharedNarrative = {
  [Perspective.SELF]: string;
  [Perspective.OBSERVER]: string;
};

/**
 * A narrative is a description of an event.
 * It can be a single item or an array of items.
 * The items are displayed in order.
 * The delay is the time in milliseconds to wait before displaying the next item.
 * @deprecated Use one of the above types.
 */
export type Narrative = NarrativeItem | NarrativeItem[];

/**
 * Common narrative renderer function signature
 */
export type NarrativeRenderer<TWorldEvent extends WorldEvent> = (
  context: TransformerContext,
  payload: TWorldEvent['payload'],
  actor: Actor,
  targetActor?: Actor
) => Narrative;

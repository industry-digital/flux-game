import { TransformerContext } from '~/types/handler';
import { Actor } from '~/types/entity/actor';
import { WorldEvent } from '~/types/event';

export enum Perspective {
  SELF = 'self',
  OBSERVER = 'observer',
}

export type NarrativeItem = {
  [Perspective.SELF]?: string;
  [Perspective.OBSERVER]?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  delay?: number;
};

/**
 * A narrative is a description of an event.
 * It can be a single item or an array of items.
 * The items are displayed in order.
 * The delay is the time in milliseconds to wait before displaying the next item.
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

import { TransformerContext } from '~/types/handler';
import { Actor } from '~/types/entity/actor';
import { WorldEvent } from '~/types/event';

export enum Perspective {
  SELF = 'self',
  OBSERVER = 'observer',
}

/**
 * A narrative is a description of an event, from the actor's point of view,
 * from an observer's point of view.
 */
export type Narrative = {
  /**
   * What happened, from the actor's point of view
   */
  self?: string;

  /**
   * What happened, from an observer's point of view
   */
  observer?: string;
};

/**
 * Common narrative renderer function signature
 */
export type NarrativeRenderer<TWorldEvent extends WorldEvent> = (
  context: TransformerContext,
  payload: TWorldEvent['payload'],
  actor: Actor,
  targetActor?: Actor
) => Narrative;

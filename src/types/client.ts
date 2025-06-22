import { WorldEvent } from '~/types/event';

export type WorldEventMessageDictionary = {
  /**
   * What happened, from the actor's point of view
   */
  actor: string;

  /**
   * What happened from an observer's point of view
   */
  observer: string;
};

export type EnrichedWorldEvent =
  & WorldEvent
  & {
    messages: WorldEventMessageDictionary;
  };

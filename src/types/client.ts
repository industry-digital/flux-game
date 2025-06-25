import { WorldEvent } from '~/types/event';

export type WorldEventNarrativeDictionary = {
  /**
   * What happened, from the actor's point of view
   */
  self: string;

  /**
   * What happened from an observer's point of view
   */
  observer: string;
};

export type EnrichedWorldEvent =
  & WorldEvent
  & {
    narrative: WorldEventNarrativeDictionary;
  };

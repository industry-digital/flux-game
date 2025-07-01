import { WorldEvent } from '~/types/event';
import { PlaceSummary } from '~/worldkit/view';

export enum FactType {
  /**
   * The actor's current location in the world
   */
  ACTOR_LOCATION = 'actor:location',

  /**
   * A full or partial view of an Entity that exists in the world
   */
  VIEW = 'view',

  /**
   * A world event
   */
  EVENT = 'event',

  /**
   * Facts about concerns outside of the simulation, such as maintenance notifications, service status, etc.
   */
  SYSTEM = 'system',
}

export type AbstractFact<
  Type extends FactType,
  Subject = any,
  Text = string,
> = {
  type: Type;
  subject: Subject;
  text: Text;
};

export type WorldEventMessageDictionary = {
  observer: string;
  actor?: string;
};

// Union of all possible facts
export type Fact =
  | AbstractFact<FactType.ACTOR_LOCATION, PlaceSummary>
  | AbstractFact<FactType.EVENT, WorldEvent, WorldEventMessageDictionary>
  | AbstractFact<FactType.VIEW>
  | AbstractFact<FactType.SYSTEM>;

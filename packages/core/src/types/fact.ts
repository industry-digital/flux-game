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

export type AbstractFactInput<
  Type extends FactType,
  Subject = any,
  Text = string,
> = {
  id?: string;
  trace: string;
  type: Type;
  subject: Subject;
  text: Text;
};

export type AbstractFact<
  Type extends FactType,
  Subject = any,
  Text = string,
> = Omit<AbstractFactInput<Type, Subject, Text>, 'id'> & {
  id: string;
};

/**
 * @deprecated Use [Narrative](./narrative.ts) instead
 */
export type WorldEventMessageDictionary = {
  observer: string;
  actor?: string;
};

export type ActorLocationFactInput = AbstractFactInput<FactType.ACTOR_LOCATION, PlaceSummary>;
export type ActorLocationFact = AbstractFact<FactType.ACTOR_LOCATION, PlaceSummary>;

export type WorldEventFactInput = AbstractFactInput<FactType.EVENT, WorldEvent, WorldEventMessageDictionary>;
export type WorldEventFact = AbstractFact<FactType.EVENT, WorldEvent, WorldEventMessageDictionary>;

export type ViewFactInput = AbstractFactInput<FactType.VIEW>;
export type ViewFact = AbstractFact<FactType.VIEW>;

export type SystemFactInput = AbstractFactInput<FactType.SYSTEM>;
export type SystemFact = AbstractFact<FactType.SYSTEM>;

export type FactInput =
  | WorldEventFactInput
  | ViewFactInput
  | ActorLocationFactInput
  | SystemFactInput;

// Union of all possible facts
export type Fact =
  | WorldEventFact
  | ViewFact
  | ActorLocationFact
  | SystemFact;

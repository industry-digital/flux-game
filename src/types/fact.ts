export enum FactType {
  /**
   * The actor's current location in the world
   */
  LOCATION = 'location',

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
  Text = string,
  Subject = any,
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
  | AbstractFact<FactType.LOCATION>
  | AbstractFact<FactType.EVENT, WorldEventMessageDictionary>
  | AbstractFact<FactType.VIEW>
  | AbstractFact<FactType.SYSTEM>;

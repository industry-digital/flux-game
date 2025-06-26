export enum KindOfFact {
  /**
   * A view of something that exists in the world
   */
  VIEW = 'view',

  /**
   * A world event
   */
  EVENT = 'event',

  /**
   * Facts about the simulation infrastructure, such as maintenance notifications.
   */
  SYSTEM = 'system',
}

export type PerspectiveBasedText = {
  actor: string;
  observer: string;
};

export type AbstractFact<Kind extends KindOfFact, Subject> = {
  kind: Kind;
  subject: Subject;
  text: string | PerspectiveBasedText;
};

export type Fact<Subject = any> =
  | AbstractFact<KindOfFact.VIEW, Subject>
  | AbstractFact<KindOfFact.EVENT, Subject>
  | AbstractFact<KindOfFact.SYSTEM, Subject>;

export enum FactType {
  /**
   * A full or partial view of an Entity that exists in the world
   */
  VIEW = 'view',

  /**
   * A world event
   */
  EVENT = 'event',

  /**
   * Facts about concerns outside of the simulation, such as maintenance notifications.
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

// Union of all possible facts
export type Fact =
  | AbstractFact<FactType.EVENT, { actor: string; observer?: string }>
  | AbstractFact<FactType.VIEW>
  | AbstractFact<FactType.SYSTEM>;

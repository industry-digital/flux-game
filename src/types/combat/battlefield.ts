import { ActorURN } from '~/types/taxonomy';

export type BattlefieldSchema = {
  /**
   * The distance, in meters, between the two opposing actors at the start of combat.
   */
  gap: number;

  /**
   * The size of the margin on each side of the gap, in meters.
   */
  margin: number;
};

export type Combatant = {
  actorId: ActorURN;
  position: number;

  /**
   * The direction the actor is facing.
   * 1 means the actor is facing the right, -1 means the actor is facing the left.
   */
  heading: 1 | -1;

  /**
   * Instantaneous
   */
  speed: number;
};

export type Battlefield = {
  schema: BattlefieldSchema;
  positions: (ActorURN | undefined)[];
};

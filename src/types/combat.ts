import { Command } from '~/types/intent';
import { Requirements } from '~/types/requirement';
import { RollResult } from '~/types/dice';
import { ActorURN } from '~/types/taxonomy';

export enum TargetType {
  NONE = 'none',
  SELF = 'self',
  SINGLE = 'single',
  ANATOMY = 'single:anatomy',
  MULTI = 'single:multi',
  AREA = 'area',
  PLACE = 'place',
}

export type TargetingSpecification = {
  /**
   * The type of target
   */
  type: TargetType;

  /**
   * Distance in meters; `0` means touch
   */
  range?: number;

  /**
   * Requires line of sight?
   */
  requirements: Requirements;

  /**
   * Maximum number of targets
   */
  max?: number;
};

export type CombatAction = {
  command: Command;

  /**
   * The time cost paid by the actor for the command, in milliseconds
   */
  duration: number;
};

export type Combatant = {
  /**
   * The actor that is participating in the combat session
   */
  actorId: ActorURN;

  /**
   * The initiative roll of the combatant at the start of combat, if the actor was
   * present in the combat session at the start of combat.
   */
  initiative: RollResult;

  /**
   * The team that the combatant belongs to, if any
   */
  team?: string;
};

export type CombatantState = {
  /**
   * The number of milliseconds left in the combatant's turn
   */
  timeLeft: number;
};

export type CombatSession = {
  round: number;
  actors: Combatant[];
  /**
   * The currently active combatant
   */
  actor: Combatant & CombatantState;
};

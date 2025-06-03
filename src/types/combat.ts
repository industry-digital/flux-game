import { Command, Requirements, RollResult } from '~/types';
import { CharacterURN } from '~/types/taxonomy';

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
  team: string;
  character: CharacterURN;
  /**
   * The initiative roll of the combatant at the start of combat, if the actor was
   * present in the combat session at the start of combat.
   */
  initiative: RollResult;
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

import { AbstractSession, SessionStrategy } from '~/types/session';
import { ActorURN, PlaceURN, SkillURN } from '~/types/taxonomy';
import { CommandType, ActorCommand } from '~/types/intent';
import { RollResultWithoutModifiers } from '~/types/dice';
import { CurvePosition } from '~/types/easing';
import { ModifiableBoundedAttribute } from '~/types/entity/attribute';
import { Actor } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { DamageSummary } from '~/types/damage';

export type CombatMemoization = {
  /** Distance calculation cache for performance optimization */
  distanceCache: Map<string, number>;
  /** Target selection cache for repeated queries */
  targetCache: Map<string, any[]>;
  /** Weapon assessment cache for repeated evaluations */
  weaponCache: Map<string, any>;
}

export enum CoverEffectiveness {
  NONE = 0,
  PARTIAL = 0.5,
  FULL = 1,
}

export enum KindsOfCover {
  TREE,
  ROCK,
  BUILDING,
  VEHICLE,
}

export type CoverSkillChecks = Partial<Record<SkillURN, number>>;

export type ProvidesCover = {
  kind: KindsOfCover;
  effectiveness: CoverEffectiveness;
  checks: CoverSkillChecks;
};

export type Battlefield = {
  /**
   * Total battlefield length in meters (default: 300m)
   * Layout: [Margin 100m] [Combat Zone 100m] [Margin 100m]
   */
  length: number;

  /**
   * The size of the margin on each side of the combat zone (default: 100m each)
   * Left margin: 0-100m, Combat zone: 100-200m, Right margin: 200-300m
   */
  margin: number;

  cover: [],
};

/**
 * @deprecated
 */
export type BattlefieldPositionSummary = BattlefieldPosition & {
  velocity?: number;
};

export type ActionCost = Partial<FullyQualifiedActionCost>;

export type FullyQualifiedActionCost = {
  /**
   * The Action Point cost of an action.
   * A combatant's AP pool represents the actor's time budget for their turn, in seconds (game time).
   */
  ap: number;
  /**
   * The energy cost of an action, in Joules.
   */
  energy: number;
};

/**
 * A Command enhanced with combat execution metadata
 * This unifies the combat system with the broader command architecture
 */
export type CombatCommand<
  T extends CommandType = CommandType,
  A extends Record<string, any> = Record<string, any>
> = ActorCommand<T, A> & {
  /**
   * Combat execution results (added after command execution)
   */
  roll?: RollResultWithoutModifiers;

  /**
   * The cost paid by the actor for performing the action
   */
  cost?: ActionCost;
};

/**
 * An Actor's turn in a single round of combat
 */
export type CombatTurn = {
  /**
   * The sequence number of the round, starting with `1`
   */
  round: number;

  /**
   * The sequence number of the turn, starting with `1`
   */
  number: number;

  /**
   * The Actor performing the actions in the turn
   */
  actor: ActorURN;

  /**
   * The commands executed by the Actor in the turn
   */
  actions: CombatCommand[];
};

export type CombatTurns = {
  /**
   * The current turn
   */
  current: CombatTurn;

  /**
   * Turns already completed
   */
  completed: CombatTurn[];
};

export type CombatRound = {
  /**
   * The sequence number of the round, starting with `1`
   */
  number: number;

  /**
   * The turns in the round
   */
  turns: CombatTurns;
};

export type CombatRounds = {
  /**
   * The current round
   */
  current: CombatRound;

  /**
   * The completed rounds
   */
  completed: CombatRound[];
};

export type CombatSessionData = {
  /**
   * The Place where combat is taking place
   */
  location: PlaceURN;

  /**
   * The combatants participating in the combat session
   */
  combatants: Map<ActorURN, Combatant>;

  /**
   * The initiative order of the combatants
   */
  initiative: Map<ActorURN, RollResultWithoutModifiers>;

  /**
   * The linear battlefield
   */
  battlefield: Battlefield;

  currentTurn: CombatTurn;
  completedTurns: CombatTurn[];

  /**
   * Initiative sorting optimization - tracks if initiative is already sorted
   */
  initiativeSorted?: boolean;

  /**
   * Initiative sorting optimization - hash of combatant IDs to detect changes
   */
  lastCombatantHash?: string;
};

export type CombatSession = AbstractSession<SessionStrategy.COMBAT, CombatSessionData>;

export enum Team {
  ALPHA = 'alpha',
  BRAVO = 'bravo',
  CHARLIE = 'charlie',
}

export enum CombatFacing {
  RIGHT = 1,
  LEFT = -1,
}

/**
 * Position and movement state on the 300-meter linear battlefield
 */
export type BattlefieldPosition = {
  /**
   * Position in meters along the linear battlefield
   * Index `0` = position `1` at the left boundary
   * Index `299` = position `300` at the right boundary
   * Initial combat positions: Actor 1 at position 100, Actor 2 at position 200
   */
  coordinate: number;

  /**
   * Direction the actor is facing for combat purposes
   * Independent of movement direction
   */
  facing: CombatFacing;

  /**
   * Instantaneous speed in meters per second. Independent of `facing`.
   * Together with `facing`, this represents the actor's instantaneous velocity.
   */
  speed: number;
};

export type CombatantSummary = {
  /**
   * The actor performing the action
   */
  actorId: ActorURN;

  /**
   * The team of the combatant
   */
  team: string | Team;

  /**
   * Whether the combatant initiated combat
   */
  didInitiateCombat?: true;

  /**
   * The position of the combatant on the battlefield
   */
  position: BattlefieldPosition;

  /**
   * The combatant's AP ceiling and instantaneous value, with modifiers
   */
  ap: ModifiableBoundedAttribute;
};

/**
 * Extended combatant interface with initiative order
 */
export type FullyQualifiedCombatant = Omit<Combatant, 'initiative'> & {
  initiative: RollResultWithoutModifiers;
}

/**
 * A combatant is an Actor who is participating in a combat session.
 * This data structure represents the actor's *instantaneous* state within the combat session.
 * It is a snapshot of the actor's state that is continuously changing as the combat session progresses.
 */
export type Combatant = CombatantSummary & {

  /**
   * Actor's initiative roll. which determines *when* the actor may act within a combat round.
   */
  initiative?: RollResultWithoutModifiers;

  /**
   * The total mass of the actor, in grams
   */
  mass: number;

  /**
   * The combatant's AP ceiling and current value, with modifiers
   */
  ap: ModifiableBoundedAttribute;

  /**
   * The combatant's capacitor, with its current value and position on the capacitor recovery curve
   */
  energy: ModifiableBoundedAttribute & CurvePosition;

  /**
   * A well-balanced actor is more effective at combat maneuvers than a poorly-balanced actor.
   * This is a normalized value between 0 and 1, where 1 means perfect balance and 0 means completely off balance.
   */
  balance: ModifiableBoundedAttribute;

  /**
   * The combatant's position and movement on the linear battlefield
   * Contains coordinate (0-300m), velocity, and facing direction
   */
  position: BattlefieldPosition;

  /**
   * The actor's current target
   */
  target: ActorURN | null;
};

export type ResolvedTarget = {
  actorId: ActorURN;
  distance: number;
};

/**
 * @deprecated - REMOVED. Use CombatCommandPlan instead.
 */

/**
 * A sequence of combat commands to be executed
 */
export type CombatCommandPlan = CombatCommand[];

export enum AttackOutcome {
  HIT = 'hit',
  MISS = 'miss',
  HIT_CRITICAL = 'hit:critical',
  MISS_CRITICAL = 'miss:critical',
}

export enum AttackType {
  STRIKE = 'strike',
  CLEAVE = 'cleave',
}

export enum DamageType {
  PHYSICAL = 'physical',
  ENERGY = 'energy',
}

// Not to be confused with CombatFacing
export enum MovementDirection {
  FORWARD = 1,    // Move in facing direction (ADVANCE)
  BACKWARD = -1 // Move opposite to facing (RETREAT)
}

export type DamageModelInterface = {
  calculateDamage: (actor: Actor, weapon: WeaponSchema, ) => DamageSummary;
};

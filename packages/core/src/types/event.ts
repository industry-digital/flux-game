import { Weather } from '~/types/entity/weather';
import { ResourceNodes } from '~/types/entity/resource';
import { ActorURN, ItemURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import {
  ActionCost,
  AttackOutcome,
  AttackType,
  BattlefieldPosition,
  CombatantSummary,
  MovementDirection,
} from '~/types/combat';
import { RollResult } from '~/types/dice';
import { SessionStatus } from '~/types/session';
import { ShellDiff, ShellMutation } from '~/types/workbench';
import { CurrencyTransaction } from '~/types/currency';
import { WellKnownActor } from '~/types/actor';

export type EventPayload = Record<string, any>;

export type AbstractWorldEventInput<
  T extends EventType,
  P extends EventPayload = {},
  A extends ActorURN | WellKnownActor = ActorURN | WellKnownActor,
> = {
  /**
   * The unique identifier for this event.
   */
  id?: string;

  /**
   * Identfies Intent or Command that triggered this event.
   */
  trace: string;

  /**
   * The moment the event occurred, expressed as milliseconds since the Unix epoch
   */
  ts?: number;

  /**
   * The type of the event.
   */
  type: T;

  /**
   * Where did it happen?
   */
  location: PlaceURN;

  /**
   * The actor that triggered the event.
   */
  actor: A;

  /**
   * The payload of the event.
   */
  payload: P;

  /**
   * Normalized value between 0 and 1 indicating the significance of the event.
   *
   * 0 means the event is almost not worth mentioning.
   * 1 means the event is absolutely mind-blowing. a.k.a, "epic", "earth-shattering", "life-changing", etc.
   */
  significance?: number;
};

export type ErrorExplanation = {
  reason: string;
  message?: string;
};

/**
 * All possible things that can happen in the game universe.
 */
export enum EventType {
  ACTOR_DID_ARRIVE = 'actor:arrived',
  ACTOR_DID_DEMATERIALIZE = 'actor:dematerialized',
  ACTOR_DID_DEPART = 'actor:departed',
  ACTOR_DID_DIE = 'actor:died',
  ACTOR_DID_EXAMINE_SHELL = 'actor:shell:examined',
  ACTOR_DID_GAIN_CURRENCY = 'actor:currency:credited',
  ACTOR_DID_LOOK = 'actor:looked',
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_MOVE = 'actor:moved',
  ACTOR_DID_QUERY_HELPFILE = 'actor:helpfile:queried',
  ACTOR_DID_RECOVER_ENERGY = 'actor:energy:recovered',
  ACTOR_DID_SPEND_CURRENCY = 'actor:currency:debited',
  ACTOR_DID_SWAP_SHELL = 'actor:shell:swapped',
  ACTOR_WAS_CREATED = 'actor:created',
  COMBATANT_DID_ACQUIRE_TARGET = 'combat:actor:target:acquired',
  COMBATANT_DID_ATTACK = 'combat:actor:attack',
  COMBATANT_DID_COVER = 'combat:actor:covered',
  COMBATANT_DID_DEFEND = 'combat:actor:defended',
  COMBATANT_DID_DIE = 'combat:actor:died',
  COMBATANT_DID_ACQUIRE_RANGE = 'combat:actor:range:acquired',
  COMBATANT_DID_MOVE = 'combat:actor:moved',
  COMBATANT_DID_RECOVER_AP = 'combat:actor:ap:recovered',
  COMBATANT_DID_RELOAD = 'combat:actor:reloaded',
  COMBATANT_DID_REST = 'combat:actor:rested',
  COMBATANT_WAS_ATTACKED = 'combat:actor:attack:received',
  COMBAT_ROUND_DID_END = 'combat:round:ended',
  COMBAT_ROUND_DID_START = 'combat:round:started',
  COMBAT_SESSION_DID_END = 'combat:session:ended',
  COMBAT_SESSION_DID_START = 'combat:session:started',
  COMBAT_SESSION_STATUS_DID_CHANGE = 'combat:session:status:changed',
  COMBAT_TURN_DID_END = 'combat:turn:ended',
  COMBAT_TURN_DID_START = 'combat:turn:started',
  PLACE_WAS_CREATED = 'place:created',
  RESOURCES_DID_CHANGE = 'place:resources:changed',
  WEATHER_DID_CHANGE = 'place:weather:changed',
  WORKBENCH_SESSION_DID_END = 'workbench:session:ended',
  WORKBENCH_SESSION_DID_START = 'workbench:session:started',
  WORKBENCH_SHELL_MUTATIONS_COMMITTED = 'workbench:mutations:committed',
  WORKBENCH_SHELL_MUTATIONS_DIFFED = 'workbench:mutations:diffed',
  WORKBENCH_SHELL_MUTATIONS_UNDONE = 'workbench:mutations:undone',
  WORKBENCH_SHELL_MUTATION_STAGED = 'workbench:mutation:staged',
}

export type EventBase = {
  id: string;
  ts: number;
  trace: string;
};

export type ActorWasCreated = EventBase & ActorWasCreatedInput;
export type ActorWasCreatedInput = AbstractWorldEventInput<
  EventType.ACTOR_WAS_CREATED,
  {},
  WellKnownActor.SYSTEM
>;

export type PlaceWasCreated = EventBase & PlaceWasCreatedInput;
export type PlaceWasCreatedInput = AbstractWorldEventInput<
  EventType.PLACE_WAS_CREATED,
  {},
  WellKnownActor.SYSTEM
>;

export type ActorDidMaterialize = EventBase & ActorDidMaterializeInput;
export type ActorDidMaterializeInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_MATERIALIZE
>;

export type ActorDidDematerialize = EventBase & ActorDidDematerializeInput;
export type ActorDidDematerializeInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_DEMATERIALIZE
>;

export type ActorDidMove = EventBase & ActorDidMoveInput;
export type ActorDidMoveInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_MOVE,
  { destination: PlaceURN }
>;

export type ActorDidDepart = EventBase & ActorDidDepartInput;
export type ActorDidDepartInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_DEPART,
  { destination: PlaceURN }
>;

export type ActorDidArrive = EventBase & ActorDidArriveInput;
export type ActorDidArriveInput = AbstractWorldEventInput<EventType.ACTOR_DID_ARRIVE, { origin: PlaceURN }>;

export type ActorDidLook = EventBase & ActorDidLookInput;
export type ActorDidLookInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_LOOK,
  { target: ActorURN | PlaceURN | ItemURN }
>;

export type WeatherDidChange = EventBase & WeatherDidChangeInput;
export type WeatherDidChangeInput = AbstractWorldEventInput<
  EventType.WEATHER_DID_CHANGE,
  {
    from: Weather | null,
    to: Weather,
  }>;

export type ResourcesDidChange = EventBase & ResourcesDidChangeInput;
export type ResourcesDidChangeInput = AbstractWorldEventInput<
  EventType.RESOURCES_DID_CHANGE,
  {
    from: ResourceNodes;
    to: ResourceNodes;
  }>;

export type CombatSessionStatusDidChange = EventBase & CombatSessionStatusDidChangeInput;
export type CombatSessionStatusDidChangeInput = AbstractWorldEventInput<
  EventType.COMBAT_SESSION_STATUS_DID_CHANGE,
  {
    sessionId: SessionURN;
    previousStatus: SessionStatus;
    currentStatus: SessionStatus;
  },
  WellKnownActor.SYSTEM
>;

export type CombatSessionStarted = EventBase & CombatSessionStartedInput;
export type CombatSessionStartedInput = AbstractWorldEventInput<
  EventType.COMBAT_SESSION_DID_START,
  {
    sessionId: SessionURN;
    initiative: [ActorURN, RollResult][];
    combatants: [ActorURN, CombatantSummary][];
  },
  WellKnownActor.SYSTEM
>;

export type CombatSessionEnded = EventBase & CombatSessionEndedInput;
export type CombatSessionEndedInput = AbstractWorldEventInput<
  EventType.COMBAT_SESSION_DID_END,
  {
    sessionId: SessionURN;
    winningTeam: string | null;
    finalRound: number;
    finalTurn: number;
  },
  WellKnownActor.SYSTEM
>;

export type CombatantDidAcquireTarget = EventBase & CombatantDidAcquireTargetInput;
export type CombatantDidAcquireTargetInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_ACQUIRE_TARGET,
  {
    sessionId: SessionURN;
    target: ActorURN;
  }
>;

export type CombatantDidDefend = EventBase & CombatantDidDefendInput;
export type CombatantDidDefendInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_DEFEND,
  {
    cost: ActionCost;
  }
>;

export type CombatantDidMove = EventBase & CombatantDidMoveInput;
export type CombatantDidMoveInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_MOVE,
  {
    cost: ActionCost;
    from: BattlefieldPosition;
    to: BattlefieldPosition;
    distance: number;
    direction: MovementDirection;
  }
>;

export type CombatantDidAttack = EventBase & CombatantDidAttackInput;
export type CombatantDidAttackInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_ATTACK,
  {
    target: ActorURN;
    attackType: AttackType;
    cost: ActionCost;
    roll: RollResult;
    attackRating: number;
  }
>;

export type CombatantWasAttacked = EventBase & CombatantWasAttackedInput;
export type CombatantWasAttackedInput = AbstractWorldEventInput<
  EventType.COMBATANT_WAS_ATTACKED,
  {
    source: ActorURN;
    type: AttackType;
    outcome: AttackOutcome;
    attackRating: number;
    evasionRating: number;
    damage: number;
  }
>;

export type CombatTurnDidStart = EventBase & CombatTurnDidStartInput;
export type CombatTurnDidStartInput = AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_START,
  {
    sessionId: SessionURN;
    round: number;
    turn: number;
    turnActor: ActorURN;
  },
  WellKnownActor.SYSTEM
>;

type CombatantResourceChange = { before: number; after: number; change: number };

export type CombatTurnDidEnd = EventBase & CombatTurnDidEndInput;
export type CombatTurnDidEndInput = AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_END,
  {
    sessionId: SessionURN;
    round: number;
    turn: number;
    turnActor: ActorURN;
    energy: CombatantResourceChange;
  },
  WellKnownActor.SYSTEM
>;

export type CombatRoundDidStart = EventBase & CombatRoundDidStartInput;
export type CombatRoundDidStartInput = AbstractWorldEventInput<
  EventType.COMBAT_ROUND_DID_START,
  {
    sessionId: SessionURN;
    round: number;
  },
  WellKnownActor.SYSTEM
>;

export type CombatRoundDidEnd = EventBase & CombatRoundDidEndInput;
export type CombatRoundDidEndInput = AbstractWorldEventInput<
  EventType.COMBAT_ROUND_DID_END,
  {
    round: number;
  },
  WellKnownActor.SYSTEM
>;

export type CombatantDidDie = EventBase & CombatantDidDieInput;
export type CombatantDidDieInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_DIE,
  {
    killer: ActorURN;
  }
>;

export type CombatantDidRecoverAp = EventBase & CombatantDidRecoverApInput;
export type CombatantDidRecoverApInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_RECOVER_AP,
  {
    before: number;
    after: number;
    recovered: number;
  }
>;

export type CombatantDidAcquireRange = EventBase & CombatantDidAcquireRangeInput;
export type CombatantDidAcquireRangeInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_ACQUIRE_RANGE,
  {
    target: ActorURN;
    range: number;
    direction: MovementDirection;
  }
>;

export type WorkbenchSessionDidStart = EventBase & WorkbenchSessionDidStartInput;
export type WorkbenchSessionDidStartInput = AbstractWorldEventInput<
  EventType.WORKBENCH_SESSION_DID_START,
  {
    sessionId: SessionURN;
  }
>;

export type WorkbenchSessionDidEnd = EventBase & WorkbenchSessionDidEndInput;
export type WorkbenchSessionDidEndInput = AbstractWorldEventInput<
  EventType.WORKBENCH_SESSION_DID_END,
  {
    sessionId: SessionURN;
  }
>;

export type ActorDidStageShellMutation = EventBase & ActorDidStageShellMutationInput;
export type ActorDidStageShellMutationInput = AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATION_STAGED,
  {
    shellId: string;
    mutation: ShellMutation;
  }
>;

export type ActorDidDiffShellMutations = EventBase & ActorDidDiffShellMutationsInput;
export type ActorDidDiffShellMutationsInput = AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED,
  ShellDiff
>;

export type ActorDidUndoShellMutations = EventBase & ActorDidUndoShellMutationsInput;
export type ActorDidUndoShellMutationsInput = AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE,
  {
    sessionId: SessionURN;
  }
>;

export type ActorDidCommitShellMutations = EventBase & ActorDidCommitShellMutationsInput;
export type ActorDidCommitShellMutationsInput = AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED,
  {
    sessionId: SessionURN;
    cost: number;
    mutations: ShellMutation[];
  }
>;

export type ActorDidSwapShell = EventBase & ActorDidSwapShellInput;
export type ActorDidSwapShellInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_SWAP_SHELL,
  {
    sessionId: SessionURN;
    fromShellId: string;
    toShellId: string;
  }
>;

export type ActorDidOpenHelpFile = EventBase & ActorDidOpenHelpFileInput;
export type ActorDidOpenHelpFileInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_QUERY_HELPFILE,
  {
    sessionId?: SessionURN;
    helpFile: string;
  }
>;

export type ActorDidSpendCurrency = EventBase & ActorDidSpendCurrencyInput;
export type ActorDidSpendCurrencyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_SPEND_CURRENCY,
  CurrencyTransaction
>;

export type ActorDidGainCurrency = EventBase & ActorDidGainCurrencyInput;
export type ActorDidGainCurrencyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_GAIN_CURRENCY,
  CurrencyTransaction
>;

/**
 * Union of all valid event inputs
 */
export type WorldEventInput =
  | PlaceWasCreatedInput
  | ActorWasCreatedInput
  | ActorDidMaterializeInput
  | ActorDidDematerializeInput
  | ActorDidMoveInput
  | ActorDidArriveInput
  | ActorDidDepartInput
  | ActorDidLookInput
  | ResourcesDidChangeInput
  | WeatherDidChangeInput
  | CombatSessionStatusDidChangeInput
  | CombatSessionStartedInput
  | CombatSessionEndedInput
  | CombatantDidAcquireTargetInput
  | CombatantDidDefendInput
  | CombatantDidMoveInput
  | CombatantDidAttackInput
  | CombatantWasAttackedInput
  | CombatRoundDidStartInput
  | CombatRoundDidEndInput
  | CombatTurnDidStartInput
  | CombatTurnDidEndInput
  | CombatantDidDieInput
  | CombatantDidRecoverApInput
  | CombatantDidAcquireRangeInput
  | WorkbenchSessionDidStartInput
  | WorkbenchSessionDidEndInput
  | ActorDidStageShellMutationInput
  | ActorDidDiffShellMutationsInput
  | ActorDidUndoShellMutationsInput
  | ActorDidCommitShellMutationsInput
  | ActorDidSwapShellInput
  | ActorDidOpenHelpFileInput
  | ActorDidSpendCurrencyInput
  | ActorDidGainCurrencyInput;

/**
 * Union of all valid events
 */
export type WorldEvent = Omit<WorldEventInput, 'id' | 'ts' | 'trace'> & {
  /**
   * The unique identifier for this event.
   */
  id: string;
  /**
   * The moment the event occurred, expressed as milliseconds since the Unix epoch
   */
  ts: number;

  /**
   * Identfies Intent or Command from which the event originates
   */
  trace: string;
};

type WorldEventEnvelopeBase = {
  id: string;
  ts: number;
  events: WorldEvent[];
};

export enum EnvelopeRecipientType {
  ACTOR = 'actor',
  PLACE = 'place',
}

/**
 * A packet containing events to be delivered to an Actor
 */
export type ActorBoundEnvelope = WorldEventEnvelopeBase & {
  to: EnvelopeRecipientType.ACTOR;
  actorId: ActorURN;
};

/**
 * A packet containing events to be delivered to a Place
 */
export type PlaceBoundEnvelope = WorldEventEnvelopeBase & {
  to: EnvelopeRecipientType.PLACE;
  placeId: PlaceURN;
};

export type EnrichedWorldEvent = WorldEvent & {
  narrative: any;
};

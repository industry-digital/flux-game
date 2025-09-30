import { Weather } from '~/types/schema/weather';
import { ResourceNodes } from '~/types/entity/resource';
import { ActorURN, ItemURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { ActionCost, BattlefieldPositionSummary, CombatantSummary } from '~/types/combat';
import { RollResult } from '~/types/dice';
import { Narrative } from '~/types/narrative';
import { SessionStatus } from '~/types/session';

export type EventPayload = Record<string, any>;

export type AbstractWorldEventInput<T extends EventType, P extends EventPayload> = {
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
   * The actor that triggered the event, if any.
   */
  actor?: ActorURN;

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

  narrative?: Narrative;
};

export type ErrorExplanation = {
  reason: string;
  message?: string;
};

export enum EventType {
  PLACE_WAS_CREATED = 'place:created',
  ACTOR_WAS_CREATED = 'actor:created',
  ACTOR_DID_DIE = 'actor:died',
  ACTOR_DID_MOVE = 'actor:moved',
  ACTOR_DID_ARRIVE = 'actor:arrived',
  ACTOR_DID_DEPART = 'actor:departed',
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_DEMATERIALIZE = 'actor:dematerialized',
  ACTOR_DID_LOOK_AT_SELF = 'actor:looked:self',
  ACTOR_DID_LOOK_AT_SELF_ITEM = 'actor:looked:self:item',
  ACTOR_DID_LOOK_AT_ACTOR = 'actor:looked:actor',
  ACTOR_DID_LOOK_AT_PLACE = 'actor:looked:place',
  ACTOR_DID_LOOK_AT_PLACE_ITEM = 'actor:looked:place:item',
  ACTOR_DID_RECOVER_ENERGY = 'actor:energy:recovered',
  COMBAT_SESSION_DID_START = 'combat:session:started',
  COMBATANT_DID_ACQUIRE_TARGET = 'combat:actor:target:acquired',
  COMBATANT_DID_ATTACK = 'combat:actor:attacked',
  COMBATANT_DID_DEFEND = 'combat:actor:defended',
  COMBATANT_DID_MOVE = 'combat:actor:moved',
  COMBATANT_DID_RELOAD = 'combat:actor:reloaded',
  COMBATANT_DID_RECOVER_AP = 'combat:actor:ap:recovered',
  COMBATANT_DID_REST = 'combat:actor:rested',
  COMBATANT_DID_COVER = 'combat:actor:covered',
  COMBATANT_DID_DIE = 'combat:actor:died',
  COMBAT_ROUND_DID_START = 'combat:round:started',
  COMBAT_ROUND_DID_END = 'combat:round:ended',
  COMBAT_SESSION_STATUS_DID_CHANGE = 'combat:session:status:changed',
  COMBAT_TURN_DID_START = 'combat:turn:started',
  COMBAT_SESSION_DID_END = 'combat:session:ended',

  COMBAT_TURN_DID_END = 'combat:turn:ended',
  RESOURCES_DID_CHANGE = 'place:resources:changed',
  WEATHER_DID_CHANGE = 'place:weather:changed',

  // Workbench events
  WORKBENCH_SESSION_DID_START = 'workbench:session:started',
  SHELL_MUTATION_STAGED = 'workbench:mutation:staged',
  SHELL_MUTATIONS_DIFFED = 'workbench:mutations:diffed',
  SHELL_MUTATIONS_UNSTAGED = 'workbench:mutations:unstaged',
  SHELL_MUTATIONS_COMMITTED = 'workbench:commit',
  WORKBENCH_SESSION_DID_END = 'workbench:session:ended',
}

export type RequiresActor = {
  actor: ActorURN;
};

export type EventBase = {
  id: string;
  ts: number;
  trace: string;
};

export type ActorWasCreated = EventBase & ActorWasCreatedInput;
export type ActorWasCreatedInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_WAS_CREATED, {}>;

export type PlaceWasCreated = EventBase & PlaceWasCreatedInput;
export type PlaceWasCreatedInput = AbstractWorldEventInput<EventType.PLACE_WAS_CREATED, {}>;

export type ActorDidMaterialize = EventBase & ActorDidMaterializeInput;
export type ActorDidMaterializeInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_MATERIALIZE, {}>;

export type ActorDidDematerialize = EventBase & ActorDidDematerializeInput;
export type ActorDidDematerializeInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_DEMATERIALIZE, {}>;

export type ActorDidMove = RequiresActor & EventBase & ActorDidMoveInput;
export type ActorDidMoveInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_MOVE,{ destination: PlaceURN }>;

export type ActorDidDepart = EventBase & AbstractWorldEventInput<EventType.ACTOR_DID_DEPART, {}>;
export type ActorDidDepartInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_DEPART, { destination: PlaceURN }>;

export type ActorDidArrive = EventBase & ActorDidArriveInput;
export type ActorDidArriveInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_ARRIVE, { origin: PlaceURN }>;

export type ActorDidLookAtActor = EventBase & ActorDidLookAtActorInput;
export type ActorDidLookAtActorInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_LOOK_AT_ACTOR, { target: ActorURN }>;

export type ActorDidLookAtPlace = EventBase & ActorDidLookAtPlaceInput;
export type ActorDidLookAtPlaceInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_LOOK_AT_PLACE, { target: PlaceURN }>;

export type ActorDidLookAtPlaceItem = EventBase & ActorDidLookAtPlaceItemInput;
export type ActorDidLookAtPlaceItemInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_LOOK_AT_PLACE_ITEM, { target: ItemURN }>;

export type ActorDidLookAtSelfItem = EventBase & ActorDidLookAtSelfItemInput;
export type ActorDidLookAtSelfItemInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_LOOK_AT_SELF_ITEM, {}>;

export type ActorDidDie = EventBase & ActorDidDieInput;
export type ActorDidDieInput = RequiresActor & AbstractWorldEventInput<EventType.ACTOR_DID_DIE, {
  cause: string;
}>;

export type ActorDidRecoverEnergy = EventBase & ActorDidRecoverEnergyInput;
export type ActorDidRecoverEnergyInput = AbstractWorldEventInput<EventType.ACTOR_DID_RECOVER_ENERGY, {
  before: number;
  after: number;
  recovered: number;
}>;


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
    previousStatus: SessionStatus;
    currentStatus: SessionStatus;
  }>;

export type CombatSessionStarted = EventBase & CombatSessionStartedInput;
export type CombatSessionStartedInput = AbstractWorldEventInput<
  EventType.COMBAT_SESSION_DID_START,
  {
    session: SessionURN;
    initiative: [ActorURN, RollResult][];
    combatants: [ActorURN, CombatantSummary][];
  }>;

export type CombatSessionEnded = EventBase & CombatSessionEndedInput;
export type CombatSessionEndedInput = AbstractWorldEventInput<
  EventType.COMBAT_SESSION_DID_END,
  {
    session: SessionURN;
    winningTeam: string | null;
    finalRound: number;
    finalTurn: number;
  }>;

export type CombatantDidAcquireTarget = EventBase & CombatantDidAcquireTargetInput;
export type CombatantDidAcquireTargetInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_ACQUIRE_TARGET,
  {
    target: ActorURN;
  }>;

export type CombatantDidDefend = EventBase & CombatantDidDefendInput;
export type CombatantDidDefendInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_DEFEND,
  {
    actor: ActorURN;
    cost: ActionCost;
  }>;

export type CombatantDidMove = EventBase & CombatantDidMoveInput;
export type CombatantDidMoveInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_MOVE,
  {
    cost: ActionCost;
    from: BattlefieldPositionSummary;
    to: BattlefieldPositionSummary;
  }>;

export type AttackOutcome = 'hit' | 'miss' | 'hit:critical' | 'miss:critical';

export type CombatantDidAttack = EventBase & CombatantDidAttackInput;
export type CombatantDidAttackInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_ATTACK,
  {
    actor: ActorURN;
    target: ActorURN;
    cost: ActionCost;
    roll: RollResult;
    outcome: AttackOutcome;
    attackRating: number;
    evasionRating: number;
  }>;

export type CombatTurnDidStart = EventBase & CombatTurnDidStartInput;
export type CombatTurnDidStartInput = AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_START,
  {
    round: number;
    turn: number;
    actor: ActorURN;
  }>;

export type EnergySummary = `before=${number} after=${number} recovered=${number}`;
export type ApSummary = `before=${number} after=${number} recovered=${number}`;

export type CombatTurnDidEnd = EventBase & CombatTurnDidEndInput;
export type CombatTurnDidEndInput = AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_END,
  {
    round: number;
    turn: number;
    actor: ActorURN;
    ap: ApSummary;
    energy: EnergySummary;
  }>;

export type CombatantDidEndTurn = EventBase & CombatantDidEndTurnInput;
export type CombatantDidEndTurnInput = AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_END,
  {
    round: number;
    turn: number;
    actor: ActorURN;
  }>;

export type CombatRoundDidStart = EventBase & CombatRoundDidStartInput;
export type CombatRoundDidStartInput = AbstractWorldEventInput<
  EventType.COMBAT_ROUND_DID_START,
  {
    round: number;
  }>;

export type CombatRoundDidEnd = EventBase & CombatRoundDidEndInput;
export type CombatRoundDidEndInput = AbstractWorldEventInput<
  EventType.COMBAT_ROUND_DID_END,
  {
    round: number;
  }>;

export type CombatantDidDie = EventBase & CombatantDidDieInput;
export type CombatantDidDieInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_DIE,
  {
    actor: ActorURN;
  }>;

export type CombatantDidRecoverAp = EventBase & CombatantDidRecoverApInput;
export type CombatantDidRecoverApInput = AbstractWorldEventInput<
  EventType.COMBATANT_DID_RECOVER_AP,
  {
    actor: ActorURN;
    before: number;
    after: number;
    recovered: number;
  }>;

export type WorkbenchSessionDidStart = EventBase & WorkbenchSessionDidStartInput;
export type WorkbenchSessionDidStartInput = RequiresActor & AbstractWorldEventInput<
  EventType.WORKBENCH_SESSION_DID_START,
  {
    session: SessionURN;
  }>;

export type WorkbenchSessionDidEnd = EventBase & WorkbenchSessionDidEndInput;
export type WorkbenchSessionDidEndInput = RequiresActor & AbstractWorldEventInput<
  EventType.WORKBENCH_SESSION_DID_END,
  {
    session: SessionURN;
  }>;


/**
 * Union of  all valid event inputs
 */
export type WorldEventInput =
  | PlaceWasCreatedInput
  | ActorWasCreatedInput
  | ActorDidDieInput
  | ActorDidMaterializeInput
  | ActorDidDematerializeInput
  | ActorDidMoveInput
  | ActorDidArriveInput
  | ActorDidDepartInput
  | ActorDidLookAtActorInput
  | ActorDidLookAtPlaceInput
  | ActorDidLookAtPlaceItemInput
  | ActorDidLookAtSelfItemInput
  | ActorDidRecoverEnergyInput
  | ResourcesDidChangeInput
  | WeatherDidChangeInput
  | CombatSessionStatusDidChangeInput
  | CombatSessionStartedInput
  | CombatSessionEndedInput
  | CombatantDidAcquireTargetInput
  | CombatantDidDefendInput
  | CombatantDidMoveInput
  | CombatantDidAttackInput
  | CombatantDidEndTurnInput
  | CombatRoundDidStartInput
  | CombatRoundDidEndInput
  | CombatTurnDidStartInput
  | CombatTurnDidEndInput
  | CombatantDidDieInput
  | CombatantDidRecoverApInput
  | WorkbenchSessionDidStartInput
  | WorkbenchSessionDidEndInput;


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

/**
 * A packet containing events to be delivered to an Actor
 */
export type ActorBoundEnvelope = WorldEventEnvelopeBase & {
  to: 'actor';
  actorId: ActorURN;
};

/**
 * A packet containing events to be delivered to a Place
 */
export type PlaceBoundEnvelope = WorldEventEnvelopeBase & {
  to: 'place';
  placeId: PlaceURN;
};

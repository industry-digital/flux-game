import { Weather } from '~/types/entity/weather';
import { ResourceNodes } from '~/types/entity/resource';
import { ActorURN, AmmoSchemaURN, GroupURN, ItemURN, PartyURN, PlaceURN, SessionURN, WeaponSchemaURN } from '~/types/taxonomy';
import {
  ActionCost,
  AttackOutcome,
  AttackType,
  BattlefieldPosition,
  CombatantSummary,
  MovementDirection,
} from '~/types/combat';
import { RollResultWithoutModifiers } from '~/types/dice';
import { SessionStatus } from '~/types/entity/session';
import { ShellDiff, ShellMutation } from '~/types/workbench';
import { Shell } from '~/types/entity/shell';
import { ComponentSchemaURN } from '~/types/taxonomy';
import { WellKnownActor } from '~/types/actor';
import { ShellStats } from '~/types/entity/actor';
import { CurrencyTransaction } from '~/types/currency';
import { PartyLeaveReason } from '~/types/party';
import { Party } from '~/types/entity/group';

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
   * The actor that triggered the event.
   */
  actor: A;

  /**
   * Where did it happen?
   */
  location: PlaceURN;

  /**
   * Session-related events will always advertise a session URN
   */
  session?: SessionURN;

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
  ACTOR_DID_LOOK = 'actor:looked',
  ACTOR_DID_MATERIALIZE = 'actor:materialized',
  ACTOR_DID_MOVE = 'actor:moved',
  ACTOR_DID_OPEN_HELPFILE = 'actor:helpfile:opened',
  ACTOR_DID_RECOVER_ENERGY = 'actor:energy:recovered',
  ACTOR_DID_SWAP_SHELL = 'actor:shell:swapped',
  ACTOR_WAS_CREATED = 'actor:created',
  ACTOR_DID_ACQUIRE_TARGET = 'actor:target:acquired',
  ACTOR_DID_ATTACK = 'actor:attack:performed',
  ACTOR_DID_TAKE_COVER = 'actor:cover:taken',
  ACTOR_DID_DEFEND = 'actor:did:defend',
  ACTOR_DID_ASSESS_RANGE = 'actor:range:acquired',
  ACTOR_DID_MOVE_IN_COMBAT = 'actor:combat:moved',
  ACTOR_WAS_ATTACKED = 'actor:attack:received',
  ACTOR_DID_ASSESS_SHELL_STATUS = 'actor:shell:status:assessed',
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
  ACTOR_DID_STAGE_SHELL_MUTATION = 'actor:shell:mutation:staged',
  ACTOR_DID_LIST_SHELLS = 'actor:shells:listed',
  ACTOR_DID_INSPECT_SHELL_STATUS = 'actor:shell:status:inspected',
  ACTOR_DID_REVIEW_SHELL_STATS = 'actor:shell:stats:reviewed',
  ACTOR_DID_LIST_SHELL_COMPONENTS = 'actor:shell:components:listed',
  ACTOR_DID_EXAMINE_COMPONENT = 'actor:component:examined',
  ACTOR_DID_MOUNT_COMPONENT = 'actor:component:mounted',
  ACTOR_DID_UNMOUNT_COMPONENT = 'actor:component:unmounted',
  ACTOR_DID_LIST_INVENTORY_COMPONENTS = 'actor:inventory:components:listed',
  ACTOR_DID_LIST_INVENTORY_MATERIALS = 'actor:inventory:materials:listed',
  ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION = 'actor:currency:transaction:completed',
  ACTOR_DID_RENAME_SHELL = 'actor:shell:renamed',
  ACTOR_DID_GAIN_AMMO = 'actor:inventory:ammo:gained',
  ACTOR_DID_LOSE_AMMO = 'actor:inventory:ammo:lost',
  ACTOR_DID_LOAD_WEAPON = 'actor:weapon:loaded',
  ACTOR_DID_UNLOAD_WEAPON = 'actor:weapon:unloaded',
  ACTOR_DID_EQUIP_WEAPON = 'actor:weapon:equipped',
  ACTOR_DID_UNEQUIP_WEAPON = 'actor:weapon:unequipped',
  ACTOR_DID_CREATE_PARTY = 'actor:party:created',
  ACTOR_DID_DISBAND_PARTY = 'actor:party:disbanded',
  ACTOR_DID_ISSUE_PARTY_INVITATION = 'actor:party:invite:issued',
  ACTOR_DID_RECEIVE_PARTY_INVITATION = 'actor:party:invite:received',
  ACTOR_DID_ACCEPT_PARTY_INVITATION = 'actor:party:invite:accepted',
  ACTOR_DID_REJECT_PARTY_INVITATION = 'actor:party:invite:rejected',
  ACTOR_DID_JOIN_PARTY = 'actor:party:joined',
  ACTOR_DID_LEAVE_PARTY = 'actor:party:left',
  ACTOR_DID_INSPECT_PARTY = 'actor:party:members:listed',
  ACTOR_DID_LIST_PARTY_INVITATIONS = 'actor:party:invitations:listed',
  ACTOR_DID_SAY = 'actor:said',
}

export type EventBase = {
  id: string;
  ts: number;
  trace: string;
};

type SessionRelated = {
  session: SessionURN;
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

type ActorMovementEventPayload = {
  origin: PlaceURN;
  destination: PlaceURN;
};

export type ActorDidMove = EventBase & ActorDidMoveInput;
export type ActorDidMoveInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_MOVE,
  ActorMovementEventPayload
>;

export type ActorDidDepart = EventBase & ActorDidDepartInput;
export type ActorDidDepartInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_DEPART,
  ActorMovementEventPayload
>;

export type ActorDidArrive = EventBase & ActorDidArriveInput;
export type ActorDidArriveInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_ARRIVE,
  ActorMovementEventPayload
>;

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
export type CombatSessionStatusDidChangeInput = SessionRelated & AbstractWorldEventInput<
  EventType.COMBAT_SESSION_STATUS_DID_CHANGE,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    previousStatus: SessionStatus;
    currentStatus: SessionStatus;
  },
  WellKnownActor.SYSTEM
>;

export type CombatSessionStarted = EventBase & CombatSessionStartedInput;
export type CombatSessionStartedInput = SessionRelated & AbstractWorldEventInput<
  EventType.COMBAT_SESSION_DID_START,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    initiative: [ActorURN, RollResultWithoutModifiers][];
    combatants: [ActorURN, CombatantSummary][];
    namesByTeam: Record<string, string[]>;
  },
  WellKnownActor.SYSTEM
>;

export type CombatSessionEnded = EventBase & CombatSessionEndedInput;
export type CombatSessionEndedInput = SessionRelated & AbstractWorldEventInput<
  EventType.COMBAT_SESSION_DID_END,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    winningTeam: string | null;
    finalRound: number;
    finalTurn: number;
  },
  WellKnownActor.SYSTEM
>;

export type ActorDidAcquireTarget = EventBase & ActorDidAcquireTargetInput;
export type ActorDidAcquireTargetInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_ACQUIRE_TARGET,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    target: ActorURN;
  }
>;

export type ActorDidDefend = EventBase & ActorDidDefendInput;
export type ActorDidDefendInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_DEFEND,
  {
    cost: ActionCost;
  }
>;

export type ActorDidMoveInCombat = EventBase & ActorDidMoveInCombatInput;
export type ActorDidMoveInCombatInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_MOVE_IN_COMBAT,
  {
    cost: ActionCost;
    from: BattlefieldPosition;
    to: BattlefieldPosition;
    distance: number;
    direction: MovementDirection;
  }
>;

type ActorDidAttackPayloadBase = {
  cost: ActionCost;
  roll: RollResultWithoutModifiers;
  attackRating: number;
};

export type ActorDidCleave = EventBase & ActorDidCleaveInput
type ActorDidCleaveInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_ATTACK,
  ActorDidAttackPayloadBase & { attackType: AttackType.CLEAVE; targets: ActorURN[]; }
>;

export type ActorDidStrike = EventBase & ActorDidStrikeInput;
type ActorDidStrikeInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_ATTACK,
  ActorDidAttackPayloadBase & { attackType: AttackType.STRIKE; target: ActorURN; }
>;

export type ActorDidAttackInput = ActorDidCleaveInput | ActorDidStrikeInput;
export type ActorDidAttack = ActorDidCleave | ActorDidStrike;

export type ActorWasAttacked = EventBase & ActorWasAttackedInput;
export type ActorWasAttackedInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_WAS_ATTACKED,
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
export type CombatTurnDidStartInput = SessionRelated & AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_START,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    round: number;
    turn: number;
    turnActor: ActorURN;
  },
  WellKnownActor.SYSTEM
>;

type CombatantResourceChange = { before: number; after: number; change: number };

export type CombatTurnDidEnd = EventBase & CombatTurnDidEndInput;
export type CombatTurnDidEndInput = SessionRelated & AbstractWorldEventInput<
  EventType.COMBAT_TURN_DID_END,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    round: number;
    turn: number;
    turnActor: ActorURN;
    energy: CombatantResourceChange;
  },
  WellKnownActor.SYSTEM
>;

export type ActorDidDie = EventBase & ActorDidDieInput;
export type ActorDidDieInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_DIE,
  {
    killer: ActorURN;
  }
>;

export type ActorDidAssessRange = EventBase & ActorDidAssessRangeInput;
export type ActorDidAssessRangeInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_ASSESS_RANGE,
  {
    target: ActorURN;
    range: number;
    direction: MovementDirection;
  }
>;

export type WorkbenchSessionDidStart = EventBase & WorkbenchSessionDidStartInput;
export type WorkbenchSessionDidStartInput = SessionRelated & AbstractWorldEventInput<
  EventType.WORKBENCH_SESSION_DID_START,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
  }
>;

export type WorkbenchSessionDidEnd = EventBase & WorkbenchSessionDidEndInput;
export type WorkbenchSessionDidEndInput = SessionRelated & AbstractWorldEventInput<
  EventType.WORKBENCH_SESSION_DID_END,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
  }
>;

export type ActorDidStageShellMutation = EventBase & ActorDidStageShellMutationInput;
export type ActorDidStageShellMutationInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_STAGE_SHELL_MUTATION,
  {
    shellId: string;
    mutation: ShellMutation;
  }
>;

export type ActorDidDiffShellMutations = EventBase & ActorDidDiffShellMutationsInput;
export type ActorDidDiffShellMutationsInput = SessionRelated & AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED,
  ShellDiff
>;

export type ActorDidUndoShellMutations = EventBase & ActorDidUndoShellMutationsInput;
export type ActorDidUndoShellMutationsInput = SessionRelated & AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
  }
>;

export type ActorDidCommitShellMutations = EventBase & ActorDidCommitShellMutationsInput;
export type ActorDidCommitShellMutationsInput = SessionRelated & AbstractWorldEventInput<
  EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    cost: number;
    mutations: ShellMutation[];
  }
>;

export type ActorDidSwapShell = EventBase & ActorDidSwapShellInput;
export type ActorDidSwapShellInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_SWAP_SHELL,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    fromShellId: string;
    toShellId: string;
  }
>;

export type ActorDidOpenHelpFile = EventBase & ActorDidOpenHelpFileInput;
export type ActorDidOpenHelpFileInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_OPEN_HELPFILE,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    helpFile: string;
  }
>;

export type ActorDidAssessShellStatus = EventBase & ActorDidAssessShellStatusInput;
export type ActorDidAssessShellStatusInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_ASSESS_SHELL_STATUS,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    shellId: string;
  }
>;

// New workbench events
export type ActorDidListShells = EventBase & ActorDidListShellsInput;
export type ActorDidListShellsInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_LIST_SHELLS
>;

export type ActorDidInspectShellStatus = EventBase & ActorDidInspectShellStatusInput;
export type ActorDidInspectShellStatusInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_INSPECT_SHELL_STATUS,
  {
    shellId: string;
    shell: Shell;
  }
>;

export type ActorDidReviewShellStats = EventBase & ActorDidReviewShellStatsInput;
export type ActorDidReviewShellStatsInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_REVIEW_SHELL_STATS,
  {
    shellId: string;
    currentStats: ShellStats;
    pendingMutations: ShellMutation[];
    previewStats?: ShellStats;
  }
>;

export type ActorDidRenameShell = EventBase & ActorDidRenameShellInput;
export type ActorDidRenameShellInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_RENAME_SHELL,
  {
    /**
     * @deprecated
     */
    sessionId?: SessionURN;
    shellId: string;
    oldName: string;
    newName: string;
  }
>;

export type ActorDidListShellComponents = EventBase & ActorDidListShellComponentsInput;
export type ActorDidListShellComponentsInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_LIST_SHELL_COMPONENTS,
  {
    shellId: string;
    components: Record<string, any>; // TODO: Replace `any` with a discrete type
  }
>;

export type ActorDidExamineComponent = EventBase & ActorDidExamineComponentInput;
export type ActorDidExamineComponentInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_EXAMINE_COMPONENT,
  {
    componentId: ItemURN;
    schema: ComponentSchemaURN;
  }
>;

export type ActorDidMountComponent = EventBase & ActorDidMountComponentInput;
export type ActorDidMountComponentInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_MOUNT_COMPONENT,
  {
    shellId: string;
    componentId: ItemURN;
  }
>;

export type ActorDidUnmountComponent = EventBase & ActorDidUnmountComponentInput;
export type ActorDidUnmountComponentInput = SessionRelated & AbstractWorldEventInput<
  EventType.ACTOR_DID_UNMOUNT_COMPONENT,
  {
    shellId: string;
    componentId: ItemURN;
  }
>;

export type ActorDidListInventoryComponents = EventBase & ActorDidListInventoryComponentsInput;
export type ActorDidListInventoryComponentsInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_LIST_INVENTORY_COMPONENTS,
  {
    components: Record<string, any>; // TODO: Replace `any` with a discrete type
    totalMass: number;
  }
>;

export type ActorDidListInventoryMaterials = EventBase & ActorDidListInventoryMaterialsInput;
export type ActorDidListInventoryMaterialsInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_LIST_INVENTORY_MATERIALS,
  {
    materials: Record<string, any>; // TODO: Replace `any` with a discrete type
    totalMass: number;
  }
>;

export type ActorDidCompleteCurrencyTransaction = EventBase & ActorDidCompleteCurrencyTransactionInput;
export type ActorDidCompleteCurrencyTransactionInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION,
  {
    transaction: CurrencyTransaction;
  }
>;

export type ActorDidGainAmmo = EventBase & ActorDidGainAmmoInput;
export type ActorDidGainAmmoInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_GAIN_AMMO,
  {
    itemId: ItemURN;
    schema: AmmoSchemaURN;
    quantity: number;
    source: 'unloaded' | 'found' | 'purchased';
  }
>;

export type ActorDidLoseAmmo = EventBase & ActorDidLoseAmmoInput;
export type ActorDidLoseAmmoInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_LOSE_AMMO,
  {
    itemId: ItemURN;
    schema: AmmoSchemaURN;
    quantity: number;
  }
>;

export type ActorDidEquipWeapon = EventBase & ActorDidEquipWeaponInput;
export type ActorDidEquipWeaponInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_EQUIP_WEAPON,
  {
    itemId: ItemURN;
    schema: WeaponSchemaURN;
    /**
     * If the command was executed in combat, the cost of the action will be included in the payload.
     */
    cost?: ActionCost;
  }
>;

export type ActorDidUnequipWeapon = EventBase & ActorDidUnequipWeaponInput;
export type ActorDidUnequipWeaponInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_UNEQUIP_WEAPON,
  {
    itemId: ItemURN;
    schema: WeaponSchemaURN;
    /**
     * If the command was executed in combat, the cost of the action will be included in the payload.
     */
    cost?: ActionCost;
  }
>;

export type ActorDidCreateParty = EventBase & ActorDidCreatePartyInput;
export type ActorDidCreatePartyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_CREATE_PARTY,
  {
    partyId: PartyURN;
  }
>;

export type ActorDidDisbandParty = EventBase & ActorDidDisbandPartyInput;
export type ActorDidDisbandPartyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_DISBAND_PARTY,
  {
    partyId: PartyURN;
    formerMembers: Party['members'];
    cancelledInvitations: Party['invitations'];
  }
>;

export type PartyInvitationEventPayload = {
  partyId: PartyURN;
  inviteeId: ActorURN;
  inviterId: ActorURN;
};

export type ActorDidIssuePartyInvitation = EventBase & ActorDidIssuePartyInvitationInput;
export type ActorDidIssuePartyInvitationInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_ISSUE_PARTY_INVITATION,
  PartyInvitationEventPayload
>;

export type ActorDidReceivePartyInvitation = EventBase & ActorDidReceivePartyInvitationInput;
export type ActorDidReceivePartyInvitationInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION,
  PartyInvitationEventPayload
>;

export type ActorDidAcceptPartyInvitation = EventBase & ActorDidAcceptPartyInvitationInput;
export type ActorDidAcceptPartyInvitationInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_ACCEPT_PARTY_INVITATION,
  PartyInvitationEventPayload
>;

export type ActorDidRejectPartyInvitation = EventBase & ActorDidRejectPartyInvitationInput;
export type ActorDidRejectPartyInvitationInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_REJECT_PARTY_INVITATION,
  PartyInvitationEventPayload
>;

export type ActorDidJoinParty = EventBase & ActorDidJoinPartyInput;
export type ActorDidJoinPartyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_JOIN_PARTY,
  {
    partyId: PartyURN;
  }
>;

export type ActorDidLeaveParty = EventBase & ActorDidLeavePartyInput;
export type ActorDidLeavePartyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_LEAVE_PARTY,
  {
    partyId: PartyURN;
    reason: PartyLeaveReason;
    newOwner?: ActorURN; // if ownership transferred
  }
>;

export type ActorDidInspectParty = EventBase & ActorDidInspectPartyInput;
export type ActorDidInspectPartyInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_INSPECT_PARTY,
  {
    partyId: Party['id'];
    owner: Party['owner'];
    members: Party['members'];
    // Only visible to the party owner
    invitations?: Party['invitations'];
  }
>;

export type ActorDidSay = EventBase & ActorDidSayInput;
export type ActorDidSayInput = AbstractWorldEventInput<
  EventType.ACTOR_DID_SAY,
  {
    to: ActorURN | PlaceURN | GroupURN;
    spokenText: string;
  }
>;

/**
 * Union of all valid event inputs
 */
export type WorldEventInput =
  | ActorDidAcquireTargetInput
  | ActorDidArriveInput
  | ActorDidAssessRangeInput
  | ActorDidAttackInput
  | ActorDidCommitShellMutationsInput
  | ActorDidCompleteCurrencyTransactionInput
  | ActorDidDefendInput
  | ActorDidDematerializeInput
  | ActorDidDepartInput
  | ActorDidDieInput
  | ActorDidDiffShellMutationsInput
  | ActorDidEquipWeaponInput
  | ActorDidExamineComponentInput
  | ActorDidGainAmmoInput
  | ActorDidInspectShellStatusInput
  | ActorDidListInventoryComponentsInput
  | ActorDidListInventoryMaterialsInput
  | ActorDidListShellComponentsInput
  | ActorDidListShellsInput
  | ActorDidLookInput
  | ActorDidLoseAmmoInput
  | ActorDidMaterializeInput
  | ActorDidMountComponentInput
  | ActorDidMoveInCombatInput
  | ActorDidMoveInput
  | ActorDidOpenHelpFileInput
  | ActorDidReviewShellStatsInput
  | ActorDidStageShellMutationInput
  | ActorDidSwapShellInput
  | ActorDidUndoShellMutationsInput
  | ActorDidUnequipWeaponInput
  | ActorDidUnmountComponentInput
  | ActorWasAttackedInput
  | ActorWasCreatedInput
  | CombatSessionEndedInput
  | CombatSessionStartedInput
  | CombatSessionStatusDidChangeInput
  | CombatTurnDidEndInput
  | CombatTurnDidStartInput
  | PlaceWasCreatedInput
  | ResourcesDidChangeInput
  | WeatherDidChangeInput
  | WorkbenchSessionDidEndInput
  | WorkbenchSessionDidStartInput
  | ActorDidCreatePartyInput
  | ActorDidDisbandPartyInput
  | ActorDidIssuePartyInvitationInput
  | ActorDidReceivePartyInvitationInput
  | ActorDidAcceptPartyInvitationInput
  | ActorDidRejectPartyInvitationInput
  | ActorDidJoinPartyInput
  | ActorDidLeavePartyInput
  | ActorDidInspectPartyInput
  | ActorDidRenameShellInput
  | ActorDidAssessShellStatusInput
  | ActorDidSay
  ;

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

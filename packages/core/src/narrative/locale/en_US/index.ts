import { EventType } from '~/types/event';
import { LanguageTemplates } from '~/types/narrative';
import { NOT_IMPLEMENTED } from '~/narrative/stub';

// Import all template functions
import {
  narrateActorDidAttack,
  narrateActorDidDefend,
  narrateActorDidMoveInCombat,
  narrateActorDidAcquireTarget,
  narrateActorDidDie,
  narrateCombatTurnDidEnd,
  narrateCombatTurnDidStart,
  narrateCombatSessionStarted,
  narrateCombatSessionEnded,
  narrateCombatSessionStatusDidChange,
  narrateActorWasAttacked,
  // Note: Actor death and energy recovery are handled by combat events
  narrateActorDidAssessRange,
} from './combat';

import {
  narrateActorWasCreated,
  narrateActorDidMaterialize,
  narrateActorDidDematerialize,
  narrateActorDidMove,
  narrateActorDidArrive,
  narrateActorDidDepart,
  narrateActorDidOpenHelpFile,
  narrateActorDidLook,
  narrateActorDidSay,
} from './actor';

import {
  renderPlaceCreatedNarrative,
  renderWeatherChangeNarrative,
  renderResourcesChangeNarrative,
} from './world';

import {
  narrateWorkbenchSessionDidStart,
  narrateWorkbenchSessionDidEnd,
  narrateActorDidStageShellMutation,
  narrateActorDidDiffShellMutations,
  narrateActorDidUndoShellMutations,
  narrateActorDidCommitShellMutations,
  narrateActorDidMountComponent,
  narrateActorDidUnmountComponent,
  narrateActorDidListShells,
  narrateActorDidInspectShellStatus,
  narrateActorDidReviewShellStats,
  narrateActorDidListShellComponents,
  narrateActorDidExamineComponent,
  narrateActorDidSwapShell,
  narrateActorDidAssessShellStatus,
} from './workbench';

import {
  narrateActorDidCompleteCurrencyTransaction,
} from './currency';

import {
  narrateActorDidGainInventoryAmmo,
  narrateActorDidLoseInventoryAmmo,
} from './inventory/ammo';

import {
  narrateActorDidCreateParty,
  narrateActorDidDisbandParty,
  narrateActorDidIssuePartyInvitation,
  narrateActorDidReceivePartyInvitation,
  narrateActorDidAcceptPartyInvitation,
  narrateActorDidRejectPartyInvitation,
  narrateActorDidJoinParty,
  narrateActorDidLeaveParty,
  narrateActorDidInspectParty,
  narratePartyDidExpire,
  narratePartyInvitationDidFail
} from './party';

export const en_US: LanguageTemplates = {
  // Actor Events
  [EventType.ACTOR_WAS_CREATED]: narrateActorWasCreated,
  [EventType.ACTOR_DID_MATERIALIZE]: narrateActorDidMaterialize,
  [EventType.ACTOR_DID_DEMATERIALIZE]: narrateActorDidDematerialize,
  [EventType.ACTOR_DID_MOVE]: narrateActorDidMove,
  [EventType.ACTOR_DID_ARRIVE]: narrateActorDidArrive,
  [EventType.ACTOR_DID_DEPART]: narrateActorDidDepart,
  [EventType.ACTOR_DID_RECOVER_ENERGY]: NOT_IMPLEMENTED, // This event type doesn't exist
  [EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION]: narrateActorDidCompleteCurrencyTransaction,
  [EventType.ACTOR_DID_SWAP_SHELL]: narrateActorDidSwapShell,
  [EventType.ACTOR_DID_OPEN_HELPFILE]: narrateActorDidOpenHelpFile,
  [EventType.ACTOR_DID_EQUIP_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_UNEQUIP_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_ASSESS_SHELL_STATUS]: narrateActorDidAssessShellStatus,
  [EventType.ACTOR_DID_SAY]: narrateActorDidSay,

  // Look Events
  [EventType.ACTOR_DID_LOOK]: narrateActorDidLook,
  [EventType.ACTOR_DID_EXAMINE_SHELL]: NOT_IMPLEMENTED,

  // Combat Events
  [EventType.ACTOR_DID_ATTACK]: narrateActorDidAttack,
  [EventType.ACTOR_WAS_ATTACKED]: narrateActorWasAttacked,
  [EventType.ACTOR_DID_DEFEND]: narrateActorDidDefend,
  [EventType.ACTOR_DID_MOVE_IN_COMBAT]: narrateActorDidMoveInCombat,
  [EventType.ACTOR_DID_ACQUIRE_TARGET]: narrateActorDidAcquireTarget,
  [EventType.ACTOR_DID_DIE]: narrateActorDidDie,
  [EventType.ACTOR_DID_ASSESS_RANGE]: narrateActorDidAssessRange,
  [EventType.COMBAT_TURN_DID_START]: narrateCombatTurnDidStart,
  [EventType.COMBAT_TURN_DID_END]: narrateCombatTurnDidEnd,
  [EventType.COMBAT_SESSION_DID_START]: narrateCombatSessionStarted,
  [EventType.COMBAT_SESSION_DID_END]: narrateCombatSessionEnded,
  [EventType.COMBAT_SESSION_STATUS_DID_CHANGE]: narrateCombatSessionStatusDidChange,

  // Combat Events - Not Yet Implemented
  [EventType.ACTOR_DID_TAKE_COVER]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LOAD_WEAPON]: NOT_IMPLEMENTED,

  // World Events
  [EventType.PLACE_WAS_CREATED]: renderPlaceCreatedNarrative, // Returns empty string for admin events
  [EventType.WEATHER_DID_CHANGE]: renderWeatherChangeNarrative, // Conditional based on location
  [EventType.RESOURCES_DID_CHANGE]: renderResourcesChangeNarrative,

  // Workbench Events
  [EventType.WORKBENCH_SESSION_DID_START]: narrateWorkbenchSessionDidStart,
  [EventType.WORKBENCH_SESSION_DID_END]: narrateWorkbenchSessionDidEnd,
  [EventType.ACTOR_DID_STAGE_SHELL_MUTATION]: narrateActorDidStageShellMutation,
  [EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED]: narrateActorDidDiffShellMutations,
  [EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE]: narrateActorDidUndoShellMutations,
  [EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED]: narrateActorDidCommitShellMutations,
  [EventType.ACTOR_DID_RENAME_SHELL]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_MOUNT_COMPONENT]: narrateActorDidMountComponent,
  [EventType.ACTOR_DID_UNMOUNT_COMPONENT]: narrateActorDidUnmountComponent,
  [EventType.ACTOR_DID_LIST_SHELLS]: narrateActorDidListShells,
  [EventType.ACTOR_DID_INSPECT_SHELL_STATUS]: narrateActorDidInspectShellStatus,
  [EventType.ACTOR_DID_REVIEW_SHELL_STATS]: narrateActorDidReviewShellStats,
  [EventType.ACTOR_DID_LIST_SHELL_COMPONENTS]: narrateActorDidListShellComponents,
  [EventType.ACTOR_DID_EXAMINE_COMPONENT]: narrateActorDidExamineComponent,
  [EventType.ACTOR_DID_LIST_INVENTORY_COMPONENTS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LIST_INVENTORY_MATERIALS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_GAIN_AMMO]: narrateActorDidGainInventoryAmmo,
  [EventType.ACTOR_DID_LOSE_AMMO]: narrateActorDidLoseInventoryAmmo,
  [EventType.ACTOR_DID_UNLOAD_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_CREATE_PARTY]: narrateActorDidCreateParty,
  [EventType.ACTOR_DID_DISBAND_PARTY]: narrateActorDidDisbandParty,
  [EventType.ACTOR_DID_ISSUE_PARTY_INVITATION]: narrateActorDidIssuePartyInvitation,
  [EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION]: narrateActorDidReceivePartyInvitation,
  [EventType.ACTOR_DID_ACCEPT_PARTY_INVITATION]: narrateActorDidAcceptPartyInvitation,
  [EventType.ACTOR_DID_REJECT_PARTY_INVITATION]: narrateActorDidRejectPartyInvitation,
  [EventType.ACTOR_DID_JOIN_PARTY]: narrateActorDidJoinParty,
  [EventType.ACTOR_DID_LEAVE_PARTY]: narrateActorDidLeaveParty,
  [EventType.ACTOR_DID_INSPECT_PARTY]: narrateActorDidInspectParty,
  [EventType.ACTOR_DID_LIST_PARTY_INVITATIONS]: narrateActorDidInspectParty,
  [EventType.PARTY_DID_EXPIRE]: narratePartyDidExpire,
  [EventType.PARTY_INVITATION_DID_FAIL]: narratePartyInvitationDidFail,
};

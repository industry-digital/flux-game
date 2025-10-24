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
  narrateCombatRoundDidStart,
  narrateCombatRoundDidEnd,
  narrateCombatSessionStarted,
  narrateCombatSessionEnded,
  narrateCombatSessionStatusDidChange,
  renderWasAttackedNarrative,
  // Note: Actor death and energy recovery are handled by combat events
  narrateActorDidAssessRange,
} from './combat';

import {
  renderActorCreatedNarrative,
  renderActorMaterializeNarrative,
  renderActorDematerializeNarrative,
  renderActorMoveNarrative,
  renderActorArriveNarrative,
  renderActorDepartNarrative,
  renderSwapShellNarrative,
  renderHelpFileNarrative,
  narrateActorDidLook,
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
} from './workbench';

import {
  narrateActorDidCompleteCurrencyTransaction,
} from './currency';

export const en_US: LanguageTemplates = {
  // Actor Events
  [EventType.ACTOR_WAS_CREATED]: renderActorCreatedNarrative,
  [EventType.ACTOR_DID_MATERIALIZE]: renderActorMaterializeNarrative,
  [EventType.ACTOR_DID_DEMATERIALIZE]: renderActorDematerializeNarrative,
  [EventType.ACTOR_DID_MOVE]: renderActorMoveNarrative,
  [EventType.ACTOR_DID_ARRIVE]: renderActorArriveNarrative,
  [EventType.ACTOR_DID_DEPART]: renderActorDepartNarrative,
  [EventType.ACTOR_DID_RECOVER_ENERGY]: NOT_IMPLEMENTED, // This event type doesn't exist
  [EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION]: narrateActorDidCompleteCurrencyTransaction,
  [EventType.ACTOR_DID_SWAP_SHELL]: renderSwapShellNarrative,
  [EventType.ACTOR_DID_OPEN_HELPFILE]: renderHelpFileNarrative,
  [EventType.ACTOR_DID_EQUIP_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_UNEQUIP_WEAPON]: NOT_IMPLEMENTED,

  // Look Events
  [EventType.ACTOR_DID_LOOK]: narrateActorDidLook,
  [EventType.ACTOR_DID_EXAMINE_SHELL]: NOT_IMPLEMENTED,

  // Combat Events
  [EventType.ACTOR_DID_ATTACK]: narrateActorDidAttack,
  [EventType.ACTOR_WAS_ATTACKED]: renderWasAttackedNarrative,
  [EventType.ACTOR_DID_DEFEND]: narrateActorDidDefend,
  [EventType.ACTOR_DID_MOVE_IN_COMBAT]: narrateActorDidMoveInCombat,
  [EventType.ACTOR_DID_ACQUIRE_TARGET]: narrateActorDidAcquireTarget,
  [EventType.ACTOR_DID_DIE]: narrateActorDidDie,
  [EventType.ACTOR_DID_ASSESS_RANGE]: narrateActorDidAssessRange,
  [EventType.COMBAT_TURN_DID_START]: narrateCombatTurnDidStart,
  [EventType.COMBAT_TURN_DID_END]: narrateCombatTurnDidEnd,
  [EventType.COMBAT_ROUND_DID_START]: narrateCombatRoundDidStart,
  [EventType.COMBAT_ROUND_DID_END]: narrateCombatRoundDidEnd,
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
  [EventType.WORKBENCH_SHELL_MUTATION_STAGED]: narrateActorDidStageShellMutation,
  [EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED]: narrateActorDidDiffShellMutations,
  [EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE]: narrateActorDidUndoShellMutations,
  [EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED]: narrateActorDidCommitShellMutations,
  [EventType.ACTOR_DID_MOUNT_COMPONENT]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_UNMOUNT_COMPONENT]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LIST_SHELLS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_INSPECT_SHELL_STATUS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_REVIEW_SHELL_STATS]: NOT_IMPLEMENTED,  [EventType.ACTOR_DID_LIST_SHELL_COMPONENTS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_EXAMINE_COMPONENT]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LIST_INVENTORY_COMPONENTS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LIST_INVENTORY_MATERIALS]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_GAIN_INVENTORY_AMMO]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LOSE_INVENTORY_AMMO]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_UNLOAD_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_FIRE_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_CREATE_PARTY]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_DISBAND_PARTY]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_ISSUE_PARTY_INVITATION]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_ACCEPT_PARTY_INVITATION]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_REJECT_PARTY_INVITATION]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_JOIN_PARTY]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LEAVE_PARTY]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_INSPECT_PARTY]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LIST_PARTY_INVITATIONS]: NOT_IMPLEMENTED,
};

import { EventType } from '~/types/event';
import { LanguageTemplates } from '~/types/narrative';
import { NOT_IMPLEMENTED } from '~/narrative/stub';

// Import all template functions
import {
  renderAttackNarrative,
  renderDefendNarrative,
  renderMoveNarrative,
  renderTargetNarrative,
  renderDeathNarrative,
  renderTurnEndNarrative,
  renderTurnStartNarrative,
  renderRoundStartNarrative,
  renderRoundEndNarrative,
  renderCombatSessionStartNarrative,
  renderCombatSessionEndNarrative,
  renderCombatStatusChangeNarrative,
  renderWasAttackedNarrative,
  // Note: Actor death and energy recovery are handled by combat events
  renderAcquireRangeNarrative,
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
  renderWorkbenchSessionStartNarrative,
  renderWorkbenchSessionEndNarrative,
  renderStageMutationNarrative,
  renderDiffMutationsNarrative,
  renderUndoMutationsNarrative,
  renderCommitMutationsNarrative,
} from './workbench';

import {
  renderCurrencyTransactionNarrative,
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
  [EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION]: renderCurrencyTransactionNarrative,
  [EventType.ACTOR_DID_SWAP_SHELL]: renderSwapShellNarrative,
  [EventType.ACTOR_DID_OPEN_HELPFILE]: renderHelpFileNarrative,
  [EventType.ACTOR_DID_EQUIP_WEAPON]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_UNEQUIP_WEAPON]: NOT_IMPLEMENTED,

  // Look Events
  [EventType.ACTOR_DID_LOOK]: narrateActorDidLook,
  [EventType.ACTOR_DID_EXAMINE_SHELL]: NOT_IMPLEMENTED,

  // Combat Events
  [EventType.ACTOR_DID_ATTACK]: renderAttackNarrative,
  [EventType.ACTOR_WAS_ATTACKED]: renderWasAttackedNarrative,
  [EventType.ACTOR_DID_DEFEND]: renderDefendNarrative,
  [EventType.ACTOR_DID_MOVE_IN_COMBAT]: renderMoveNarrative,
  [EventType.ACTOR_DID_ACQUIRE_TARGET]: renderTargetNarrative,
  [EventType.ACTOR_DID_DIE]: renderDeathNarrative,
  [EventType.ACTOR_DID_ASSESS_RANGE]: renderAcquireRangeNarrative,
  [EventType.COMBAT_TURN_DID_START]: renderTurnStartNarrative,
  [EventType.COMBAT_TURN_DID_END]: renderTurnEndNarrative,
  [EventType.COMBAT_ROUND_DID_START]: renderRoundStartNarrative,
  [EventType.COMBAT_ROUND_DID_END]: renderRoundEndNarrative,
  [EventType.COMBAT_SESSION_DID_START]: renderCombatSessionStartNarrative,
  [EventType.COMBAT_SESSION_DID_END]: renderCombatSessionEndNarrative,
  [EventType.COMBAT_SESSION_STATUS_DID_CHANGE]: renderCombatStatusChangeNarrative,

  // Combat Events - Not Yet Implemented
  [EventType.ACTOR_DID_TAKE_COVER]: NOT_IMPLEMENTED,
  [EventType.ACTOR_DID_LOAD_WEAPON]: NOT_IMPLEMENTED,

  // World Events
  [EventType.PLACE_WAS_CREATED]: renderPlaceCreatedNarrative, // Returns empty string for admin events
  [EventType.WEATHER_DID_CHANGE]: renderWeatherChangeNarrative, // Conditional based on location
  [EventType.RESOURCES_DID_CHANGE]: renderResourcesChangeNarrative,

  // Workbench Events
  [EventType.WORKBENCH_SESSION_DID_START]: renderWorkbenchSessionStartNarrative,
  [EventType.WORKBENCH_SESSION_DID_END]: renderWorkbenchSessionEndNarrative,
  [EventType.WORKBENCH_SHELL_MUTATION_STAGED]: renderStageMutationNarrative,
  [EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED]: renderDiffMutationsNarrative,
  [EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE]: renderUndoMutationsNarrative,
  [EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED]: renderCommitMutationsNarrative,
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
  [EventType.ACTOR_DID_LIST_PARTY_MEMBERS]: NOT_IMPLEMENTED,
};

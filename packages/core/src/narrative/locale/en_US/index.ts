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
  renderApRecoveryNarrative,
  renderWasAttackedNarrative,
  renderAcquireRangeNarrative,
  // Note: Actor death and energy recovery are handled by combat events
} from '~/narrative/locale/en_US/combat';

import {
  renderActorCreatedNarrative,
  renderActorMaterializeNarrative,
  renderActorDematerializeNarrative,
  renderActorMoveNarrative,
  renderActorArriveNarrative,
  renderActorDepartNarrative,
  renderSwapShellNarrative,
  renderHelpFileNarrative,
  renderSpendCurrencyNarrative,
  renderGainCurrencyNarrative,
  narrateActorDidLook,
} from '~/narrative/locale/en_US/actor';

import {
  renderPlaceCreatedNarrative,
  renderWeatherChangeNarrative,
  renderResourcesChangeNarrative,
} from '~/narrative/locale/en_US/world';

import {
  renderWorkbenchSessionStartNarrative,
  renderWorkbenchSessionEndNarrative,
  renderStageMutationNarrative,
  renderDiffMutationsNarrative,
  renderUndoMutationsNarrative,
  renderCommitMutationsNarrative,
} from '~/narrative/locale/en_US/workbench';

export const en_US: LanguageTemplates = {
  // Actor Events
  [EventType.ACTOR_WAS_CREATED]: renderActorCreatedNarrative,
  [EventType.ACTOR_DID_MATERIALIZE]: renderActorMaterializeNarrative,
  [EventType.ACTOR_DID_DEMATERIALIZE]: renderActorDematerializeNarrative,
  [EventType.ACTOR_DID_MOVE]: renderActorMoveNarrative,
  [EventType.ACTOR_DID_ARRIVE]: renderActorArriveNarrative,
  [EventType.ACTOR_DID_DEPART]: renderActorDepartNarrative,
  [EventType.ACTOR_DID_DIE]: NOT_IMPLEMENTED, // This event type doesn't exist - handled by COMBATANT_DID_DIE
  [EventType.ACTOR_DID_RECOVER_ENERGY]: NOT_IMPLEMENTED, // This event type doesn't exist
  [EventType.ACTOR_DID_GAIN_CURRENCY]: renderGainCurrencyNarrative,
  [EventType.ACTOR_DID_SPEND_CURRENCY]: renderSpendCurrencyNarrative,
  [EventType.ACTOR_DID_SWAP_SHELL]: renderSwapShellNarrative,
  [EventType.ACTOR_DID_QUERY_HELPFILE]: renderHelpFileNarrative,

  // Look Events
  [EventType.ACTOR_DID_LOOK]: narrateActorDidLook,
  [EventType.ACTOR_DID_EXAMINE_SHELL]: NOT_IMPLEMENTED,

  // Combat Events
  [EventType.COMBATANT_DID_ATTACK]: renderAttackNarrative,
  [EventType.COMBATANT_WAS_ATTACKED]: renderWasAttackedNarrative,
  [EventType.COMBATANT_DID_DEFEND]: renderDefendNarrative,
  [EventType.COMBATANT_DID_MOVE]: renderMoveNarrative,
  [EventType.COMBATANT_DID_ACQUIRE_TARGET]: renderTargetNarrative,
  [EventType.COMBATANT_DID_DIE]: renderDeathNarrative,
  [EventType.COMBATANT_DID_RECOVER_AP]: renderApRecoveryNarrative,
  [EventType.COMBATANT_DID_ACQUIRE_RANGE]: renderAcquireRangeNarrative,
  [EventType.COMBAT_TURN_DID_START]: renderTurnStartNarrative,
  [EventType.COMBAT_TURN_DID_END]: renderTurnEndNarrative,
  [EventType.COMBAT_ROUND_DID_START]: renderRoundStartNarrative,
  [EventType.COMBAT_ROUND_DID_END]: renderRoundEndNarrative,
  [EventType.COMBAT_SESSION_DID_START]: renderCombatSessionStartNarrative,
  [EventType.COMBAT_SESSION_DID_END]: renderCombatSessionEndNarrative,
  [EventType.COMBAT_SESSION_STATUS_DID_CHANGE]: renderCombatStatusChangeNarrative,

  // Combat Events - Not Yet Implemented
  [EventType.COMBATANT_DID_COVER]: NOT_IMPLEMENTED,
  [EventType.COMBATANT_DID_RELOAD]: NOT_IMPLEMENTED,
  [EventType.COMBATANT_DID_REST]: NOT_IMPLEMENTED,

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
};

import {
  CombatantDidAttack,
  CombatantDidDefend,
  CombatantDidMove,
  CombatantDidAcquireTarget,
  CombatantDidDie,
  CombatTurnDidEnd,
  CombatTurnDidStart,
  CombatRoundDidStart,
  CombatRoundDidEnd,
  CombatSessionStarted,
  CombatSessionEnded,
  CombatSessionStatusDidChange,
  CombatantDidRecoverAp,
} from '~/types/event';
import { SessionStatus } from '~/types/session';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';

export const renderAttackNarrative: TemplateFunction<CombatantDidAttack, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.payload.actor];
  const target = world.actors[event.payload.target];
  const weapon = equipmentApi.getEquippedWeaponSchemaOrFail(actor);
  const { damage } = event.payload;

  if (actorId === event.payload.actor) {
    // actorId is the attacker
    return damage > 0
      ? `You strike ${target.name} with your ${weapon.name} for ${damage} damage.`
      : `You miss ${target.name} with your ${weapon.name}.`
  }

  if (actorId === event.payload.target) {
    // actorId is the target
    return damage > 0
      ? `${actor.name} strikes you with their ${weapon.name} for ${damage} damage.`
      : `${actor.name} misses you with their ${weapon.name}.`
  }

  // actorId is an observer
  return damage > 0
    ? `${actor.name} strikes ${target.name} with their ${weapon.name} for ${damage} damage.`
    : `${actor.name} misses ${target.name} with their ${weapon.name}.`
};

export const renderDefendNarrative: TemplateFunction<CombatantDidDefend, ActorURN> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];

  if (actorId === event.payload.actor) {
    return `You take a defensive stance.`
  }

  return `${actor.name} takes a defensive stance.`
};

export const renderMoveNarrative: TemplateFunction<CombatantDidMove> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];
  const distance = Math.abs(event.payload.to.coordinate - event.payload.from.coordinate);
  const direction = event.payload.to.coordinate > event.payload.from.coordinate ? 'forward' : 'backward';

  if (actorId === event.payload.actor) {
    // actorId is the actor
    return `You move ${direction} ${distance}m.`
  }

  // actorId is an observer
  return `${actor.name} moves ${direction} ${distance}m.`
};

export const renderTargetNarrative: TemplateFunction<CombatantDidAcquireTarget> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];
  const target = world.actors[event.payload.target];

  if (actorId === event.payload.actor) {
    // actorId is the actor
    return `You target ${target.name}.`
  }

  // actorId is an observer
  return `${actor.name} targets ${target.name}.`
};

export const renderDeathNarrative: TemplateFunction<CombatantDidDie> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];

  if (actorId === event.payload.actor) {
    // actorId is the actor
    return 'You have died!';
  }

  // actorId is an observer
  return `${actor.name} has been killed!`;
};

export const renderTurnEndNarrative: TemplateFunction<CombatTurnDidEnd> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];
  const energyRecovered = event.payload.energy.change;

  if (actorId === event.payload.actor) {
    return `Your turn has ended.\nYou have recovered ${energyRecovered} energy.`;
  }

  return `${actor.name}'s turn ends.`;
};

export const renderTurnStartNarrative: TemplateFunction<CombatTurnDidStart, ActorURN> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];

  if (actorId === event.payload.actor) {
    return 'Your turn begins.';
  }

  return `${actor.name}'s turn begins.`;
};

export const renderRoundStartNarrative: TemplateFunction<CombatRoundDidStart> = (context, event, recipientId) => {
  const round = event.payload.round;
  return `Round ${round} begins!`;
};

export const renderRoundEndNarrative: TemplateFunction<CombatRoundDidEnd> = (context, event, recipientId) => {
  const round = event.payload.round;
  return `Round ${round} ends.`;
};

export const renderCombatSessionStartNarrative: TemplateFunction<CombatSessionStarted> = (context, event, recipientId) => {
  const { world } = context;
  const combatantNames = event.payload.combatants.map(([actorId]) => world.actors[actorId]?.name).filter(Boolean);

  if (combatantNames.length <= 2) {
    return `Combat begins between ${combatantNames.join(' and ')}!`;
  }

  return `A fierce battle erupts involving ${combatantNames.length} combatants!`;
};

export const renderCombatSessionEndNarrative: TemplateFunction<CombatSessionEnded> = (context, event, recipientId) => {
  const { winningTeam, finalRound } = event.payload;

  if (winningTeam) {
    return `Combat ends after ${finalRound} rounds. Team ${winningTeam} is victorious!`;
  }

  return `Combat ends after ${finalRound} rounds with no clear victor.`;
};

export const renderCombatStatusChangeNarrative: TemplateFunction<CombatSessionStatusDidChange> = (context, event, recipientId) => {
  const { currentStatus } = event.payload;

  switch (currentStatus) {
    case SessionStatus.RUNNING:
      return 'Combat is now active!';
    case SessionStatus.PAUSED:
      return 'Combat has been paused.';
    case SessionStatus.TERMINATED:
      return 'Combat has ended.';
    default:
      return `Combat status changed to ${currentStatus}.`;
  }
};

export const renderApRecoveryNarrative: TemplateFunction<CombatantDidRecoverAp, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actor];
  const recovered = event.payload.recovered;

  if (recipientId === event.payload.actor) {
    return `You recover ${recovered} action points.`;
  }

  return `${actor.name} recovers ${recovered} action points.`;
};

// Note: ActorDidDie and ActorDidRecoverEnergy are handled in actor.ts
// These were moved to avoid duplication since they're actor events, not combat-specific

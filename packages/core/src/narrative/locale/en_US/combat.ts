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
  CombatantWasAttacked,
} from '~/types/event';
import { SessionStatus } from '~/types/session';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';

export const renderAttackNarrative: TemplateFunction<CombatantDidAttack, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];
  const target = world.actors[event.payload.target];

  // Handle missing actors gracefully
  if (!actor || !target) {
    return '';
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(actor);
  const { attackType } = event.payload;
  const weaponName = weapon?.name || 'weapon';

  // This event is from the attacker's perspective - focus on the action
  if (actorId === event.actor) {
    // actorId is the attacker
    return attackType === 'cleave'
      ? `You unleash a sweeping ${weaponName} attack!`
      : `You attack ${target.name} with your ${weaponName}.`;
  }

  if (actorId === event.payload.target) {
    // actorId is the target - they should see the damage event instead
    // This narrative is redundant for the target
    return '';
  }

  // actorId is an observer
  return attackType === 'cleave'
    ? `${actor.name} unleashes a sweeping ${weaponName} attack!`
    : `${actor.name} attacks ${target.name} with their ${weaponName}.`;
};

export const renderWasAttackedNarrative: TemplateFunction<CombatantWasAttacked, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const attacker = world.actors[event.payload.source];
  const target = world.actors[event.actor];
  const { damage, outcome } = event.payload;

  // Handle missing actors gracefully
  if (!attacker || !target) {
    return '';
  }

  // This event is from the target's perspective
  if (actorId === event.actor) {
    // actorId is the target being attacked
    const weapon = equipmentApi.getEquippedWeaponSchema(attacker);
    const weaponName = weapon?.name || 'weapon';
    return damage > 0
      ? `${attacker.name} strikes you with their ${weaponName} for ${damage} damage.`
      : `${attacker.name} misses you with their ${weaponName}.`;
  }

  if (actorId === event.payload.source) {
    // actorId is the attacker - they should see the attack event instead
    // This narrative is redundant for the attacker
    return '';
  }

  // actorId is an observer
  const weapon = equipmentApi.getEquippedWeaponSchema(attacker);
  const weaponName = weapon?.name || 'weapon';
  return damage > 0
    ? `${attacker.name}'s ${weaponName} deals ${damage} damage to ${target.name}.`
    : `${attacker.name}'s ${weaponName} misses ${target.name}.`;
};

export const renderDefendNarrative: TemplateFunction<CombatantDidDefend, ActorURN> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  if (actorId === event.actor) {
    return `You take a defensive stance.`
  }

  return `${actor.name} takes a defensive stance.`
};

export const renderMoveNarrative: TemplateFunction<CombatantDidMove> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const distance = Math.abs(event.payload.to.coordinate - event.payload.from.coordinate);
  const direction = event.payload.to.coordinate > event.payload.from.coordinate ? 'forward' : 'backward';

  if (actorId === event.actor) {
    // actorId is the actor
    return `You move ${direction} ${distance}m.`
  }

  // actorId is an observer
  return `${actor.name} moves ${direction} ${distance}m.`
};

export const renderTargetNarrative: TemplateFunction<CombatantDidAcquireTarget> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const target = world.actors[event.payload.target];

  if (actorId === event.actor) {
    // actorId is the actor
    return `You target ${target.name}.`
  }

  // actorId is an observer
  return `${actor.name} targets ${target.name}.`
};

export const renderDeathNarrative: TemplateFunction<CombatantDidDie> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  if (actorId === event.actor) {
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
    return `Combat ends after ${finalRound} rounds. Team ${winningTeam.toUpperCase()} is victorious!`;
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
  const actor = world.actors[event.actor];
  const recovered = event.payload.recovered;

  if (recipientId === event.actor) {
    return `You recover ${recovered} action points.`;
  }

  return `${actor.name} recovers ${recovered} action points.`;
};

// Note: ActorDidDie and ActorDidRecoverEnergy are handled in actor.ts
// These were moved to avoid duplication since they're actor events, not combat-specific

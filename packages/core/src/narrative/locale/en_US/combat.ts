import {
  CombatantDidAttack,
  CombatantDidDefend,
  CombatantDidMove,
  CombatantDidAcquireTarget,
  CombatantDidDie,
  CombatTurnDidEnd,
  CombatTurnDidStart,
} from '~/types/event';
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

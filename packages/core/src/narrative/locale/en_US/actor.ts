import {
  ActorWasCreated,
  ActorDidMaterialize,
  ActorDidDematerialize,
  ActorDidMove,
  ActorDidArrive,
  ActorDidDepart,
  ActorDidSwapShell,
  ActorDidOpenHelpFile,
  ActorDidLook
} from '~/types/event';

import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';

export const renderActorCreatedNarrative: TemplateFunction<ActorWasCreated, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return `You have entered the world.`;
  }

  return `${actor.name} has entered the world.`;
};

export const renderActorMaterializeNarrative: TemplateFunction<ActorDidMaterialize, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return `You materialize into existence.`;
  }

  return `${actor.name} materializes into existence.`;
};

export const renderActorDematerializeNarrative: TemplateFunction<ActorDidDematerialize, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return `You fade from existence.`;
  }

  return `${actor.name} fades from existence.`;
};

export const renderActorMoveNarrative: TemplateFunction<ActorDidMove, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const destination = world.places[event.payload.destination];

  if (recipientId === event.actor) {
    return `You move to ${destination?.name || 'an unknown location'}.`;
  }

  return `${actor.name} moves to ${destination?.name || 'an unknown location'}.`;
};

export const renderActorArriveNarrative: TemplateFunction<ActorDidArrive, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const origin = world.places[event.payload.origin];

  if (recipientId === event.actor) {
    return `You arrive from ${origin.name}.`;
  }

  return `${actor.name} arrives from ${origin.name}.`;
};

export const renderActorDepartNarrative: TemplateFunction<ActorDidDepart, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const destination = world.places[event.payload.destination];

  if (recipientId === event.actor) {
    return `You depart for ${destination?.name || 'an unknown destination'}.`;
  }

  return `${actor.name} departs for ${destination?.name || 'an unknown destination'}.`;
};

export const narrateActorDidLook: TemplateFunction<ActorDidLook, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  return `narrateActorDidLook`;
};

export const renderSwapShellNarrative: TemplateFunction<ActorDidSwapShell, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  if (recipientId === event.actor) {
    return `You swap to a different shell configuration.`;
  }

  return `${actor.name} reconfigures their shell.`;
};

export const renderHelpFileNarrative: TemplateFunction<ActorDidOpenHelpFile, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const helpFile = event.payload.helpFile;

  if (recipientId === event.actor) {
    return `You consult the help file: ${helpFile}`;
  }

  return `${actor.name} consults a help file.`;
};

export const renderSpendCurrencyNarrative: TemplateFunction<any, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { amount, currency } = event.payload;

  if (recipientId === event.actor) {
    return `You spend ${amount} ${currency}.`;
  }

  return `${actor.name} makes a transaction.`;
};

export const renderGainCurrencyNarrative: TemplateFunction<any, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { amount, currency } = event.payload;

  if (recipientId === event.actor) {
    return `You receive ${amount} ${currency}.`;
  }

  return `${actor.name} receives payment.`;
};

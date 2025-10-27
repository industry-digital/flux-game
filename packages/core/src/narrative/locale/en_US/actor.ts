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

export const narrateActorWasCreated: TemplateFunction<ActorWasCreated, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId !== event.actor) {
    return `${actor.name} arrived.`;
  }

  return '';
};

export const narrateActorDidMaterialize: TemplateFunction<ActorDidMaterialize, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return `You materialize into existence.`;
  }

  return `${actor.name} materializes into existence.`;
};

export const narrateActorDidDematerialize: TemplateFunction<ActorDidDematerialize, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return `You fade from existence.`;
  }

  return `${actor.name} fades from existence.`;
};

export const narrateActorDidMove: TemplateFunction<ActorDidMove, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const destination = world.places[event.payload.destination];

  if (recipientId === event.actor) {
    return `You move to ${destination?.name || 'an unknown location'}.`;
  }

  return `${actor.name} moves to ${destination?.name || 'an unknown location'}.`;
};

export const narrateActorDidArrive: TemplateFunction<ActorDidArrive, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const origin = world.places[event.payload.origin];

  if (recipientId === event.actor) {
    return `You arrive from ${origin.name}.`;
  }

  return `${actor.name} arrives from ${origin.name}.`;
};

export const narrateActorDidDepart: TemplateFunction<ActorDidDepart, ActorURN> = (context, event, recipientId) => {
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

export const narrateActorDidSwapShell: TemplateFunction<ActorDidSwapShell, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  if (recipientId === event.actor) {
    return `You swap to a different shell configuration.`;
  }

  return `${actor.name} reconfigures their shell.`;
};

export const narrateActorDidOpenHelpFile: TemplateFunction<ActorDidOpenHelpFile, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const helpFile = event.payload.helpFile;

  if (recipientId === event.actor) {
    return `You consult the help file: ${helpFile}`;
  }

  return `${actor.name} consults a help file.`;
};

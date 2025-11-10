import { isPlaceUrn } from '~/lib/taxonomy';
import { getHelpFileTranslation } from '~/narrative/locale/en_US/helpfile';
import { getPlaceTranslation } from '~/narrative/locale/en_US/place-translations';
import { getPunctuationMark, getSpeechVerb } from '~/narrative/locale/en_US/util/grammar';
import {
  ActorWasCreated,
  ActorDidMaterialize,
  ActorDidDematerialize,
  ActorDidMove,
  ActorDidArrive,
  ActorDidDepart,
  ActorDidOpenHelpFile,
  ActorDidLook,
  ActorDidSay,
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

  return `${actor.name} just left.`;
};

export const narrateActorDidMove: TemplateFunction<ActorDidMove, ActorURN> = (context, event, recipientId) => {
  const destination = getPlaceTranslation(context, event.payload.destination);

  if (recipientId === event.actor) {
    return `You move to ${destination}.`;
  }

  const actor = context.world.actors[event.actor!];
  return `${actor.name} moves to ${destination}.`;
};

export const narrateActorDidArrive: TemplateFunction<ActorDidArrive, ActorURN> = (context, event, recipientId) => {
  const origin = getPlaceTranslation(context, event.payload.origin);
  if (recipientId === event.actor) {
    return `You arrive from ${origin}.`;
  }

  const actor = context.world.actors[event.actor!];
  return `${actor.name} arrives from ${origin}.`;
};

/**
 * TODO: narrate direction of departure
 */
export const narrateActorDidDepart: TemplateFunction<ActorDidDepart, ActorURN> = (context, event, recipientId) => {
  const destination = getPlaceTranslation(context, event.payload.destination);
  if (recipientId === event.actor) {
    return `You depart for ${destination}.`;
  }

  const actor = context.world.actors[event.actor!];
  return `${actor.name} departs for ${destination}.`;
};

export const narrateActorDidLook: TemplateFunction<ActorDidLook, ActorURN> = (context, event, recipientId) => {
  const actor = context.world.actors[event.actor!];

  if (recipientId !== event.actor) {
    if (isPlaceUrn(event.payload.target)) {
      return `${actor.name} looks around.`;
    }
  }

  if (event.payload.target === recipientId) {
    if (event.actor === recipientId) {
      return `MISSING_NARRATIVE_FOR_SELF_LOOK`;
    }
    return `${actor.name} appears to be looking at you.`;
  }

  return '';
};

export const narrateActorDidOpenHelpFile: TemplateFunction<ActorDidOpenHelpFile, ActorURN> = (context, event, recipientId) => {
  return getHelpFileTranslation(context, event.payload.helpFile);
};

export const narrateActorDidSay: TemplateFunction<ActorDidSay> = (context, event, recipientId) => {
  const { spokenText } = event.payload;
  const punctuationMark = getPunctuationMark(spokenText);
  const speechVerb = getSpeechVerb(punctuationMark);

  if (recipientId === event.actor!) {
    return `You ${speechVerb}, "${spokenText}"`;
  }

  const actor = context.world.actors[event.actor!];
  return `${actor.name} ${speechVerb} "${spokenText}"`;
};

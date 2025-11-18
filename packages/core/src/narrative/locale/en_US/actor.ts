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

export const narrateActorWasCreated: TemplateFunction<ActorWasCreated> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  return {
    self: '',  // Silent for self (admin event)
    observer: `${actor.name} arrived.`
  };
};

export const narrateActorDidMaterialize: TemplateFunction<ActorDidMaterialize> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  return {
    self: `You materialize into existence.`,
    observer: `${actor.name} materializes into existence.`
  };
};

export const narrateActorDidDematerialize: TemplateFunction<ActorDidDematerialize> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  return {
    self: `You fade from existence.`,
    observer: `${actor.name} just left.`
  };
};

export const narrateActorDidMove: TemplateFunction<ActorDidMove> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const destination = getPlaceTranslation(context, event.payload.destination);

  return {
    self: `You move to ${destination}.`,
    observer: `${actor.name} moves to ${destination}.`
  };
};

export const narrateActorDidArrive: TemplateFunction<ActorDidArrive> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const origin = getPlaceTranslation(context, event.payload.origin);

  return {
    self: `You arrive from ${origin}.`,
    observer: `${actor.name} arrives from ${origin}.`
  };
};

/**
 * TODO: narrate direction of departure
 */
export const narrateActorDidDepart: TemplateFunction<ActorDidDepart> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const destination = getPlaceTranslation(context, event.payload.destination);

  return {
    self: `You depart for ${destination}.`,
    observer: `${actor.name} departs for ${destination}.`
  };
};

export const narrateActorDidLook: TemplateFunction<ActorDidLook> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  // Looking at a place
    if (isPlaceUrn(event.payload.target)) {
    return {
      self: `You look around.`,
      observer: `${actor.name} looks around.`
    };
  }

  // Looking at self
  if (event.payload.target === event.actor) {
    return {
      self: `You look at yourself.`,
      observer: `${actor.name} appears to be looking at themselves.`
    };
  }

  // Looking at another actor - silent for everyone
  // (The target will see this via their own UI/notification system if needed)
  return {
    self: '',
    observer: ''
  };
};

export const narrateActorDidOpenHelpFile: TemplateFunction<ActorDidOpenHelpFile> = (context, event) => {
  const helpText = getHelpFileTranslation(context, event.payload.helpFile);

  return {
    self: helpText,
    observer: ''  // Silent for observers (personal action)
  };
};

export const narrateActorDidSay: TemplateFunction<ActorDidSay> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { spokenText } = event.payload;
  const punctuationMark = getPunctuationMark(spokenText);
  const speechVerb = getSpeechVerb(punctuationMark);

  return {
    self: `You ${speechVerb}, "${spokenText}"`,
    observer: `${actor.name} ${speechVerb} "${spokenText}"`
  };
};

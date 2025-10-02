import {
  ActorWasCreated,
  ActorDidMaterialize,
  ActorDidDematerialize,
  ActorDidMove,
  ActorDidArrive,
  ActorDidDepart,
  ActorDidLookAtActor,
  ActorDidLookAtPlace,
  ActorDidLookAtPlaceItem,
  ActorDidLookAtSelfItem,
  ActorDidSwapShell,
  ActorDidOpenHelpFile
} from '~/types/event';

// Note: ACTOR_DID_DIE and ACTOR_DID_RECOVER_ENERGY events don't exist in the EventType enum
// They are handled by COMBATANT_DID_DIE and other combat events
// ACTOR_DID_EXAMINE_SHELL is handled by the existing ACTOR_DID_LOOK_AT_SELF event
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

export const renderLookAtActorNarrative: TemplateFunction<ActorDidLookAtActor, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const target = world.actors[event.payload.target];

  const lookingAtSelf = event.actor === event.payload.target;

  if (recipientId === event.actor) {
    // The actor is the recipient - show what they see
    if (lookingAtSelf) {
      return `You are ${actor.name}.`;
    }
    return `You look at ${target.name}.`;
  }

  if (recipientId === event.payload.target && !lookingAtSelf) {
    // The target is the recipient (and it's not self-examination)
    return `${actor.name} looks at you intently.`;
  }

  // Observer perspective (or target in self-examination case)
  if (lookingAtSelf) {
    return '';
  }

  return `${actor.name} looks at ${target.name}.`;
};

const PREALLOCATED_OCCUPANT_NAMES: string[] = [];
const PREALLOCATED_ITEM_NAMES: string[] = [];

export const renderLookAtPlaceNarrative: TemplateFunction<ActorDidLookAtPlace, ActorURN> = (
  context,
  event,
  recipientId,

  /**
   * @internal
   */
  occupantNames: string[] = PREALLOCATED_OCCUPANT_NAMES,
  /**
   * @internal
   */
  itemNames: string[] = PREALLOCATED_ITEM_NAMES,

) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const place = world.places[event.payload.target];

  if (recipientId === event.actor) {
    occupantNames.length = 0;
    itemNames.length = 0;

    // Build comprehensive place description
    let description = `${place.name}\n\n${place.description.base}`;

    for (const entityId in place.entities) {
      if (entityId.startsWith('flux:actor:') && entityId !== event.actor) {
        const actor = world.actors[entityId as any];
        if (actor) {
          occupantNames.push(actor.name);
        }
      } else if (entityId.startsWith('flux:item:')) {
        const item = world.items[entityId as any];
        if (item) {
          itemNames.push(item.name);
        }
      }
    }

    // Add occupants description
    if (occupantNames.length === 1) {
      description += `\n\n${occupantNames[0]} is here.`;
    } else if (occupantNames.length > 1) {
      const lastOccupant = occupantNames.pop()!;
      description += `\n\n${occupantNames.join(', ')} and ${lastOccupant} are here.`;
    }

    // Add items description
    if (itemNames.length > 0) {
      description += `\n\nYou see: ${itemNames.join(', ')}.`;
    }

    return description;
  }

  return `${actor.name} looks around.`;
};

export const renderLookAtPlaceItemNarrative: TemplateFunction<ActorDidLookAtPlaceItem, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const item = world.items[event.payload.target];

  if (recipientId === event.actor) {
    const description = (item as any)?.description?.base || 'You see nothing special about it.';
    return `You examine ${item.name}.\n\n${description}`;
  }

  return `${actor.name} examines ${item.name}.`;
};

export const renderLookAtSelfItemNarrative: TemplateFunction<ActorDidLookAtSelfItem, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const item = world.items[event.payload.target];

  if (recipientId === event.actor) {
    const description = (item as any)?.description?.base || 'You see nothing special about it.';
    return `You examine your ${item.name}.\n\n${description}`;
  }

  return `${actor.name} examines their ${item.name}.`;
};

export const renderSwapShellNarrative: TemplateFunction<ActorDidSwapShell, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.payload.actorId];

  if (recipientId === event.payload.actorId) {
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

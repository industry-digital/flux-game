import {
  ActorDidCreateParty,
  ActorDidDisbandParty,
  ActorDidIssuePartyInvitation,
  ActorDidReceivePartyInvitation,
  ActorDidAcceptPartyInvitation,
  ActorDidRejectPartyInvitation,
  ActorDidJoinParty,
  ActorDidLeaveParty,
  ActorDidInspectParty
} from '~/types/event';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';
import { PartyLeaveReason } from '~/types/party';

/**
 * Renders narrative for party creation events
 */
export const narrateActorDidCreateParty: TemplateFunction<ActorDidCreateParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You create a new party.';
  }

  return `${actor.name} creates a new party.`;
};

/**
 * Renders narrative for party disbanding events
 */
export const narrateActorDidDisbandParty: TemplateFunction<ActorDidDisbandParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You disband the party.';
  }

  return `${actor.name} disbands the party.`;
};

/**
 * Renders narrative for party invitation issuing events
 */
export const narrateActorDidIssuePartyInvitation: TemplateFunction<ActorDidIssuePartyInvitation, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const invitee = world.actors[event.payload.inviteeId];

  if (!actor || !invitee) {
    return '';
  }

  if (recipientId === event.actor) {
    return `You invite ${invitee.name} to join your party.`;
  }

  if (recipientId === event.payload.inviteeId) {
    return `${actor.name} invites you to join their party.`;
  }

  return `${actor.name} invites ${invitee.name} to join the party.`;
};

/**
 * Renders narrative for party invitation receiving events
 */
export const narrateActorDidReceivePartyInvitation: TemplateFunction<ActorDidReceivePartyInvitation, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const inviter = world.actors[event.payload.inviterId];

  if (!actor || !inviter) {
    return '';
  }

  if (recipientId === event.actor) {
    return `You receive a party invitation from ${inviter.name}.`;
  }

  if (recipientId === event.payload.inviterId) {
    return `${actor.name} receives your party invitation.`;
  }

  return `${actor.name} receives a party invitation from ${inviter.name}.`;
};

/**
 * Renders narrative for party invitation acceptance events
 */
export const narrateActorDidAcceptPartyInvitation: TemplateFunction<ActorDidAcceptPartyInvitation, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const inviter = world.actors[event.payload.inviterId];

  if (!actor || !inviter) {
    return '';
  }

  if (recipientId === event.actor) {
    return `You accept ${inviter.name}'s party invitation.`;
  }

  if (recipientId === event.payload.inviterId) {
    return `${actor.name} accepts your party invitation.`;
  }

  return `${actor.name} accepts ${inviter.name}'s party invitation.`;
};

/**
 * Renders narrative for party invitation rejection events
 */
export const narrateActorDidRejectPartyInvitation: TemplateFunction<ActorDidRejectPartyInvitation, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const inviter = world.actors[event.payload.inviterId];

  if (!actor || !inviter) {
    return '';
  }

  if (recipientId === event.actor) {
    return `You reject ${inviter.name}'s party invitation.`;
  }

  if (recipientId === event.payload.inviterId) {
    return `${actor.name} rejects your party invitation.`;
  }

  return `${actor.name} rejects ${inviter.name}'s party invitation.`;
};

/**
 * Renders narrative for party joining events
 */
export const narrateActorDidJoinParty: TemplateFunction<ActorDidJoinParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You join the party.';
  }

  return `${actor.name} joins the party.`;
};

/**
 * Renders narrative for party leaving events
 */
export const narrateActorDidLeaveParty: TemplateFunction<ActorDidLeaveParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { reason, newOwner } = event.payload;

  if (!actor) {
    return '';
  }

  const getReasonText = (isFirstPerson: boolean) => {
    switch (reason) {
      case PartyLeaveReason.KICKED:
        return isFirstPerson ? 'You are kicked from the party.' : `${actor.name} is kicked from the party.`;
      case PartyLeaveReason.DISBANDED:
        return isFirstPerson ? 'You are removed as the party disbands.' : `${actor.name} is removed as the party disbands.`;
      case PartyLeaveReason.VOLUNTARY:
      default:
        return isFirstPerson ? 'You leave the party.' : `${actor.name} leaves the party.`;
    }
  };

  let narrative = getReasonText(recipientId === event.actor);

  // Add ownership transfer information if applicable
  if (newOwner && recipientId !== event.actor) {
    const newOwnerActor = world.actors[newOwner];
    if (newOwnerActor) {
      narrative += ` ${newOwnerActor.name} becomes the new party leader.`;
    }
  }

  return narrative;
};

/**
 * Renders narrative for party inspection events
 */
export const narrateActorDidInspectParty: TemplateFunction<ActorDidInspectParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { members, owner } = event.payload;
  const party = world.groups[event.payload.partyId];

  if (!actor || !party) {
    return '';
  }

  if (recipientId === event.actor) {
    const memberCount = party.size;
    const ownerActor = owner ? world.actors[owner] : null;
    const ownerName = ownerActor?.name || 'Unknown';

    if (memberCount === 1) {
      return `Party: ${ownerName} (leader, 1 member)`;
    }

    return `Party: ${ownerName} (leader, ${memberCount} members)`;
  }

  return `${actor.name} inspects the party.`;
};

/**
 * Renders narrative for party invitation listing events
 */
export const narrateActorDidListPartyInvitations: TemplateFunction<ActorDidInspectParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You review your party invitations.';
  }

  return `${actor.name} reviews their party invitations.`;
};

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
import { getPossessivePronoun, toPossessive } from '~/narrative/locale/en_US/util/grammar';
import { Party } from '~/types/entity/group';
import { TransformerContext } from '~/types/handler';
import { STAR } from '~/narrative/glyphs';
import { describeAge } from '~/narrative/locale/en_US/util/time';
import { toSlug } from '~/lib/slug';

const describePartyMembers = (
  context: TransformerContext,
  party: Party,
  recipientId: ActorURN,
  lines: string[] = [], // Consumers may opt into zero-allocation by reusing the same array
): string => {
  lines.length = 0;

  for (let memberId in party.members) {
    const member = context.world.actors[memberId as ActorURN];
    if (!member) {
      continue;
    }

    const glyph = member.id === party.owner ? STAR : ' ';
    lines.push(`${glyph} ${member.name}` + (member.id === recipientId ? ' (you)' : ''));
  }

  return lines.join('\n');
};

const describePartyInvitations = (
  context: TransformerContext,
  party: Party,
  recipientId: ActorURN,
  lines: string[] = [], // Consumers may opt into zero-allocation by reusing the same array
): string => {
  lines.length = 0;

  for (let inviteeId in party.invitations) {
    const invitee = context.world.actors[inviteeId as ActorURN];
    if (!invitee) {
      continue;
    }
    const invitedAt = party.invitations[inviteeId as ActorURN];
    const paddedInvitee = invitee.name.padEnd(16);
    lines.push(`${paddedInvitee} ${describeAge(invitedAt)}`);
  }

  if (lines.length === 0) {
    return 'No pending invitations.';
  }

  return lines.join('\n');
};

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
    return 'You form a new party.';
  }

  // No observer narrative
  return '';
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
    return 'You have disbanded the party.';
  }

  return `${actor.name} has disbanded the party.`;
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
    return `You have invited ${invitee.name} to join your party.`;
  }

  // No observer narrative
  return '';
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
    return `${inviter.name} has invited you to join ${getPossessivePronoun(inviter.gender)} party.\n`
      + `To accept: \`party accept ${toSlug(inviter.name)}\`\n`
      + `To reject: \`party reject ${toSlug(inviter.name)}\``;
  }

  // No observer narrative
  return '';
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
    return `You have accepted ${inviter.name}'s party invitation.\n`;
  }

  if (recipientId === inviter.id) {
    return `${actor.name} has accepted your party invitation.\n`;
  }

  // No observer narrative
  return '';
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

  if (recipientId === actor.id) {
    return `You have rejected ${inviter.name}'s party invitation.`;
  }

  if (recipientId === inviter.id) {
    return `${actor.name} has rejected your party invitation.`;
  }

  // No observer narrative
  return '';
};

/**
 * Renders narrative for party joining events
 */
export const narrateActorDidJoinParty: TemplateFunction<ActorDidJoinParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const party = world.groups[event.payload.partyId]!;
  const inviter = world.actors[party.owner!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return `You have joined ${toPossessive(inviter.name)} party.\n`
      + `To list party members: \`party status\`\n`
      + `To leave the party: \`party leave\``;
  }

  // Everyone else sees a generic narrative
  return `${actor.name} has joined the party.`;
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
        return isFirstPerson ? 'You were removed from the party.' : `${actor.name} was removed from the party.`;
      case PartyLeaveReason.DISBANDED:
        return 'You are no longer in a party.';
      case PartyLeaveReason.VOLUNTARY:
      default:
        return isFirstPerson ? 'You have left the party.' : `${actor.name} has left the party.`;
    }
  };

  let narrative = getReasonText(recipientId === event.actor);

  // Add ownership transfer information if applicable
  if (newOwner && recipientId !== event.actor) {
    const newOwnerActor = world.actors[newOwner];
    if (newOwnerActor) {
      narrative += `\n${newOwnerActor.name} is the new party leader.`;
    }
  }

  return narrative;
};

/**
 * Renders narrative for party inspection events
 */
export const narrateActorDidInspectParty: TemplateFunction<ActorDidInspectParty, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const party = world.groups[event.payload.partyId] as Party;

  if (!party) {
    return '';
  }

  return describePartyMembers(context, party, recipientId)
    + (recipientId === party.owner ? `\nInvitations:\n${describePartyInvitations(context, party, recipientId)}` : '');
};

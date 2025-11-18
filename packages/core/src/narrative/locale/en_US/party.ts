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
import { EMPTY_NARRATIVE } from '~/narrative/constants';

const describePartyMembers = (
  context: TransformerContext,
  party: Party,
  lines: string[] = [], // Consumers may opt into zero-allocation by reusing the same array
): string => {
  lines.length = 0;

  for (let memberId in party.members) {
    const member = context.world.actors[memberId as ActorURN];
    if (!member) {
      continue;
    }

    const glyph = member.id === party.owner ? STAR : ' ';
    lines.push(`${glyph} ${member.name}`);
  }

  return lines.join('\n');
};

const describePartyInvitations = (
  context: TransformerContext,
  party: Party,
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
export const narrateActorDidCreateParty: TemplateFunction<ActorDidCreateParty> = (context, event) => {
  return {
    self: 'You form a new party.',
    observer: ''  // Personal action, no observer narrative
  };
};

/**
 * Renders narrative for party disbanding events
 */
export const narrateActorDidDisbandParty: TemplateFunction<ActorDidDisbandParty> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  return {
    self: 'You have disbanded the party.',
    observer: `${actor.name} has disbanded the party.`
  };
};

/**
 * Renders narrative for party invitation issuing events
 */
export const narrateActorDidIssuePartyInvitation: TemplateFunction<ActorDidIssuePartyInvitation> = (context, event) => {
  const { world } = context;
  const invitee = world.actors[event.payload.inviteeId];

  if (!invitee) {
    return EMPTY_NARRATIVE;
  }

  return {
    self: `You have invited ${invitee.name} to join your party.`,
    observer: ''  // Personal action, no observer narrative
  };
};

/**
 * Renders narrative for party invitation receiving events
 */
export const narrateActorDidReceivePartyInvitation: TemplateFunction<ActorDidReceivePartyInvitation> = (context, event) => {
  const { world } = context;
  const inviter = world.actors[event.payload.inviterId];

  if (!inviter) {
    return { self: '', observer: '' };
  }

  return {
    self: `${inviter.name} has invited you to join ${getPossessivePronoun(inviter.gender)} party.\n`
      + `To accept: \`party accept ${toSlug(inviter.name)}\`\n`
      + `To reject: \`party reject ${toSlug(inviter.name)}\``,
    observer: ''  // Personal notification, no observer narrative
  };
};

/**
 * Renders narrative for party invitation acceptance events
 */
export const narrateActorDidAcceptPartyInvitation: TemplateFunction<ActorDidAcceptPartyInvitation> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const inviter = world.actors[event.payload.inviterId];

  if (!actor || !inviter) {
    return { self: '', observer: '' };
  }

  return {
    self: `You have accepted ${inviter.name}'s party invitation.\n`,
    observer: ''  // No observer narrative for personal party actions
  };
};

/**
 * Renders narrative for party invitation rejection events
 */
export const narrateActorDidRejectPartyInvitation: TemplateFunction<ActorDidRejectPartyInvitation> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const inviter = world.actors[event.payload.inviterId];

  if (!actor || !inviter) {
    return { self: '', observer: '' };
  }

  return {
    self: `You have rejected ${inviter.name}'s party invitation.`,
    observer: ''  // No observer narrative for personal party actions
  };
};

/**
 * Renders narrative for party joining events
 */
export const narrateActorDidJoinParty: TemplateFunction<ActorDidJoinParty> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const party = world.groups[event.payload.partyId]!;
  const owner = world.actors[party.owner!];

  if (!actor || !owner) {
    return { self: '', observer: '' };
  }

  return {
    self: `You have joined ${toPossessive(owner.name)} party.\n`
      + `To list party members: \`party status\`\n`
      + `To leave the party: \`party leave\``,
    observer: `${actor.name} has joined the party.`
  };
};

/**
 * Renders narrative for party leaving events
 */
export const narrateActorDidLeaveParty: TemplateFunction<ActorDidLeaveParty> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { reason, newOwner } = event.payload;

  if (!actor) {
    return { self: '', observer: '' };
  }

  let selfText: string;
  let observerText: string;

    switch (reason) {
      case PartyLeaveReason.KICKED:
      selfText = 'You were removed from the party.';
      observerText = `${actor.name} was removed from the party.`;
      break;
      case PartyLeaveReason.DISBANDED:
      selfText = 'You are no longer in a party.';
      observerText = 'You are no longer in a party.';  // Same for everyone
      break;
      case PartyLeaveReason.VOLUNTARY:
      default:
      selfText = 'You have left the party.';
      observerText = `${actor.name} has left the party.`;
    }

  // Add ownership transfer information if applicable
  if (newOwner) {
    const newOwnerActor = world.actors[newOwner];
    if (newOwnerActor) {
      observerText += `\n${newOwnerActor.name} is the new party leader.`;
    }
  }

  return {
    self: selfText,
    observer: observerText
  };
};

/**
 * Renders narrative for party inspection events
 */
export const narrateActorDidInspectParty: TemplateFunction<ActorDidInspectParty> = (context, event) => {
  const { world } = context;
  const party = world.groups[event.payload.partyId] as Party;

  if (!party) {
    return { self: '', observer: '' };
  }

  const members = describePartyMembers(context, party);
  const invitations = describePartyInvitations(context, party);

  return {
    self: `${members}\nInvitations:\n${invitations}`,  // Owner sees invitations
    observer: members  // Non-owners see only members
  };
};

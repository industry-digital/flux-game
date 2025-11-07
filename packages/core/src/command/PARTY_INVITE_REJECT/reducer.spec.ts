import { describe, beforeEach, it, expect } from 'vitest';
import { rejectPartyInvitationReducer } from './reducer';
import { RejectPartyInvitationCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { Party } from '~/types/entity/group';
import { ActorDidRejectPartyInvitation, EventType } from '~/types/event';
import { extractFirstEventOfType } from '~/testing/event';

const NOW = DEFAULT_TIMESTAMP;

describe('PARTY_INVITE_REJECT Reducer', () => {
  let context: TransformerContext;
  let command: RejectPartyInvitationCommand;
  let party: Party;

  beforeEach(() => {
    context = createTransformerContext();

    // Direct property mutation to ensure PartyApi sees the same world reference
    context.world.actors[ALICE_ID] = createActor({
      id: ALICE_ID,
      name: 'Alice',
      location: DEFAULT_LOCATION,
    });

    context.world.actors[BOB_ID] = createActor({
      id: BOB_ID,
      name: 'Bob',
      location: DEFAULT_LOCATION,
    });

    context.world.places[DEFAULT_LOCATION] = createPlace({
      id: DEFAULT_LOCATION,
      name: 'Test Arena',
    });

    party = context.partyApi.createParty(ALICE_ID);

    command = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_INVITE_REJECT,
      actor: BOB_ID,
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
      },
    });
  });

  it('should reject invitation and emit event', () => {
    // First, invite Bob to the party
    context.partyApi.inviteToParty(party, BOB_ID);
    expect(context.partyApi.isInvited(party, BOB_ID)).toBe(true);

    const result = rejectPartyInvitationReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit rejection event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const rejectionEvent = extractFirstEventOfType<ActorDidRejectPartyInvitation>(events, EventType.ACTOR_DID_REJECT_PARTY_INVITATION)!;
    expect(rejectionEvent).toBeDefined();
    expect(rejectionEvent.actor).toBe(BOB_ID);
    expect(rejectionEvent.payload.partyId).toBe(party.id);
    expect(rejectionEvent.payload.inviteeId).toBe(BOB_ID);

    // Bob should no longer have a pending invitation
    const updatedParty = result.world.groups[party.id] as Party;
    expect(context.partyApi.isInvited(updatedParty, BOB_ID)).toBe(false);

    // Bob should not be a party member
    expect(context.partyApi.isPartyMember(updatedParty, BOB_ID)).toBe(false);
    expect(updatedParty.size).toBe(1);

    // Bob's actor should not have the party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBeUndefined();
  });

  it('should handle missing invitation gracefully', () => {
    // Don't invite Bob first - he has no pending invitation
    expect(context.partyApi.isInvited(party, BOB_ID)).toBe(false);

    const result = rejectPartyInvitationReducer(context, command);

    // Should have an error (no pending invitation)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Bob should still not be a party member
    const updatedParty = result.world.groups[party.id] as Party;
    expect(context.partyApi.isPartyMember(updatedParty, BOB_ID)).toBe(false);
    expect(updatedParty.size).toBe(1);

    // Bob's actor should not have the party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBeUndefined();
  });

  it('should handle nonexistent party owner gracefully', () => {
    const invalidCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_INVITE_REJECT,
      actor: BOB_ID,
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: 'flux:actor:nonexistent' as any,
      },
    });

    const result = rejectPartyInvitationReducer(context, invalidCommand);

    // Should have an error (invalid party owner)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Bob should not be a party member
    expect(context.partyApi.isPartyMember(party, BOB_ID)).toBe(false);

    // Bob's actor should not have the party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBeUndefined();
  });

  it('should handle party owner with no party gracefully', () => {
    // Create a new actor with no party
    const charlieId = 'flux:actor:charlie' as any;
    context.world.actors[charlieId] = createActor({
      id: charlieId,
      name: 'Charlie',
      location: DEFAULT_LOCATION,
    });

    const invalidCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_INVITE_REJECT,
      actor: BOB_ID,
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: charlieId,
      },
    });

    const result = rejectPartyInvitationReducer(context, invalidCommand);

    // Should have an error (party owner has no party)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Bob should not be a party member
    expect(context.partyApi.isPartyMember(party, BOB_ID)).toBe(false);

    // Bob's actor should not have the party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBeUndefined();
  });

  it('should handle already a member gracefully', () => {
    // First, invite Bob and accept the invitation (making him a member)
    context.partyApi.inviteToParty(party, BOB_ID);
    context.partyApi.acceptInvitation(party, BOB_ID);

    // Verify Bob is already a member
    expect(context.partyApi.isPartyMember(party, BOB_ID)).toBe(true);
    expect(context.partyApi.isInvited(party, BOB_ID)).toBe(false);

    const result = rejectPartyInvitationReducer(context, command);

    // Should have an error (no pending invitation to reject)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Bob should still be a party member
    const updatedParty = result.world.groups[party.id] as Party;
    expect(context.partyApi.isPartyMember(updatedParty, BOB_ID)).toBe(true);
    expect(updatedParty.size).toBe(2);

    // Bob's actor should still have the party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBe(party.id);
  });
});

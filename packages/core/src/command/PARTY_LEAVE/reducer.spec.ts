import { describe, beforeEach, it, expect } from 'vitest';
import { partyLeaveReducer } from './reducer';
import { PartyLeaveCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { Party } from '~/types/entity/group';
import { ActorDidDisbandParty, ActorDidLeaveParty, EventType } from '~/types/event';
import { extractFirstEventOfType } from '~/testing/event';
import { PartyLeaveReason } from '~/types/party';

const NOW = DEFAULT_TIMESTAMP;

describe('PARTY_LEAVE Reducer', () => {
  let context: TransformerContext;
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

    context.world.actors[CHARLIE_ID] = createActor({
      id: CHARLIE_ID,
      name: 'Charlie',
      location: DEFAULT_LOCATION,
    });

    context.world.places[DEFAULT_LOCATION] = createPlace({
      id: DEFAULT_LOCATION,
      name: 'Test Arena',
    });

    // Create party with Alice as owner and Bob as member
    party = context.partyApi.createParty(ALICE_ID);
    context.partyApi.addPartyMember(party, BOB_ID);
  });

  it('should handle non-owner member leaving party', () => {
    const command: PartyLeaveCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_LEAVE,
      actor: BOB_ID, // Bob is a member, not owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyLeaveReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit leave event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const leaveEvent = extractFirstEventOfType<ActorDidLeaveParty>(events, EventType.ACTOR_DID_LEAVE_PARTY)!;
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent.actor).toBe(BOB_ID);
    expect(leaveEvent.payload.partyId).toBe(party.id);
    expect(leaveEvent.payload.reason).toBe(PartyLeaveReason.VOLUNTARY);
    expect(leaveEvent.payload.newOwner).toBeUndefined(); // No ownership transfer

    // Party should still exist with Alice as owner
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty).toBeDefined();
    expect(updatedParty.owner).toBe(ALICE_ID);
    expect(updatedParty.size).toBe(1);
    expect(ALICE_ID in updatedParty.members).toBe(true);
    expect(BOB_ID in updatedParty.members).toBe(false);

    // Bob should no longer have party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBeUndefined();
  });

  it('should handle owner leaving party with ownership transfer', () => {
    const command: PartyLeaveCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_LEAVE,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyLeaveReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit leave event with ownership transfer
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const leaveEvent = extractFirstEventOfType<ActorDidLeaveParty>(events, EventType.ACTOR_DID_LEAVE_PARTY)!;
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent.actor).toBe(ALICE_ID);
    expect(leaveEvent.payload.partyId).toBe(party.id);
    expect(leaveEvent.payload.reason).toBe(PartyLeaveReason.VOLUNTARY);
    expect(leaveEvent.payload.newOwner).toBe(BOB_ID); // Ownership transferred to Bob

    // Party should still exist with Bob as new owner
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty).toBeDefined();
    expect(updatedParty.owner).toBe(BOB_ID);
    expect(updatedParty.size).toBe(1);
    expect(BOB_ID in updatedParty.members).toBe(true);
    expect(ALICE_ID in updatedParty.members).toBe(false);

    // Alice should no longer have party reference
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBeUndefined();

    // Bob should still have party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBe(party.id);
  });

  it('should handle last member leaving party (auto-disband)', () => {
    // Remove Bob first, leaving only Alice
    context.partyApi.removePartyMember(party, BOB_ID);
    expect(party.size).toBe(1);

    const command: PartyLeaveCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_LEAVE,
      actor: ALICE_ID, // Alice is the last member
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyLeaveReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit both leave event and disband event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(2);

    // Check leave event
    const leaveEvent = extractFirstEventOfType<ActorDidLeaveParty>(events, EventType.ACTOR_DID_LEAVE_PARTY)!;
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent.actor).toBe(ALICE_ID);
    expect(leaveEvent.payload.partyId).toBe(party.id);
    expect(leaveEvent.payload.reason).toBe(PartyLeaveReason.VOLUNTARY);
    expect(leaveEvent.payload.newOwner).toBeUndefined(); // No one to transfer to

    // Check disband event
    const disbandEvent = extractFirstEventOfType<ActorDidDisbandParty>(events, EventType.ACTOR_DID_DISBAND_PARTY)!;
    expect(disbandEvent).toBeDefined();
    expect(disbandEvent.actor).toBe(ALICE_ID);
    expect(disbandEvent.payload.partyId).toBe(party.id);
    expect(disbandEvent.payload.formerMembers).toBe(party.members); // Zero-copy reference
    expect(disbandEvent.payload.cancelledInvitations).toBe(party.invitations); // Zero-copy reference

    // Party should be disbanded (removed from world)
    const updatedParty = result.world.groups[party.id];
    expect(updatedParty).toBeUndefined();

    // Alice should no longer have party reference
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBeUndefined();
  });

  it('should handle three-member party with ownership transfer', () => {
    // Add Charlie to make it a 3-member party
    context.partyApi.addPartyMember(party, CHARLIE_ID);
    expect(party.size).toBe(3);

    const command: PartyLeaveCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_LEAVE,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyLeaveReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit leave event with ownership transfer
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const leaveEvent = extractFirstEventOfType<ActorDidLeaveParty>(events, EventType.ACTOR_DID_LEAVE_PARTY)!;
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent.payload.newOwner).toBeDefined();

    // New owner should be either Bob or Charlie (first non-owner found)
    const newOwner = leaveEvent.payload.newOwner!;
    expect([BOB_ID, CHARLIE_ID]).toContain(newOwner);

    // Party should still exist with 2 members
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty).toBeDefined();
    expect(updatedParty.owner).toBe(newOwner);
    expect(updatedParty.size).toBe(2);
    expect(ALICE_ID in updatedParty.members).toBe(false);
  });

  it('should handle actor not in party gracefully', () => {
    const command: PartyLeaveCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_LEAVE,
      actor: CHARLIE_ID, // Charlie is not in any party
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyLeaveReducer(context, command);

    // Should have an error (actor not in party)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Party should remain unchanged
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty.size).toBe(2);
    expect(updatedParty.owner).toBe(ALICE_ID);
  });

  it('should handle corrupted party reference gracefully', () => {
    // Manually corrupt Bob's party reference
    const bob = context.world.actors[BOB_ID];
    bob.party = 'flux:group:party:nonexistent' as any;

    const command: PartyLeaveCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_LEAVE,
      actor: BOB_ID,
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyLeaveReducer(context, command);

    // Should have an error (party not found)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Original party should remain unchanged
    const originalParty = result.world.groups[party.id] as Party;
    expect(originalParty.size).toBe(2);
    expect(originalParty.owner).toBe(ALICE_ID);
  });
});

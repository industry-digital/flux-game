import { describe, beforeEach, it, expect } from 'vitest';
import { partyKickReducer } from './reducer';
import { PartyKickCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { Party } from '~/types/entity/group';
import { ActorDidLeaveParty, EventType } from '~/types/event';
import { extractFirstEventOfType } from '~/testing/event';
import { PartyLeaveReason } from '~/types/party';

const NOW = DEFAULT_TIMESTAMP;
const CHARLIE_ID = 'flux:actor:charlie' as const;

describe('PARTY_KICK Reducer', () => {
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
    party = context.partyApi.createParty();
    context.partyApi.addPartyMember(party, ALICE_ID);
    context.partyApi.addPartyMember(party, BOB_ID);
  });

  it('should kick member when owner requests it', () => {
    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: BOB_ID,
      },
    });

    const result = partyKickReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit leave event with KICKED reason
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const leaveEvent = extractFirstEventOfType<ActorDidLeaveParty>(events, EventType.ACTOR_DID_LEAVE_PARTY)!;
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent.actor).toBe(BOB_ID); // Bob is the subject of the event
    expect(leaveEvent.payload.partyId).toBe(party.id);
    expect(leaveEvent.payload.reason).toBe(PartyLeaveReason.KICKED);
    expect(leaveEvent.payload.newOwner).toBeUndefined(); // No ownership transfer

    // Party should still exist with only Alice
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty).toBeDefined();
    expect(updatedParty.owner).toBe(ALICE_ID);
    expect(updatedParty.size).toBe(1);
    expect(ALICE_ID in updatedParty.members).toBe(true);
    expect(BOB_ID in updatedParty.members).toBe(false);

    // Bob should no longer have party reference
    const bob = result.world.actors[BOB_ID];
    expect(bob.party).toBeUndefined();

    // Alice should still have party reference
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBe(party.id);
  });

  it('should handle three-member party kick', () => {
    // Add Charlie to make it a 3-member party
    context.partyApi.addPartyMember(party, CHARLIE_ID);
    expect(party.size).toBe(3);

    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: BOB_ID,
      },
    });

    const result = partyKickReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit leave event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const leaveEvent = extractFirstEventOfType<ActorDidLeaveParty>(events, EventType.ACTOR_DID_LEAVE_PARTY)!;
    expect(leaveEvent.actor).toBe(BOB_ID);
    expect(leaveEvent.payload.reason).toBe(PartyLeaveReason.KICKED);

    // Party should still exist with Alice and Charlie
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty.size).toBe(2);
    expect(updatedParty.owner).toBe(ALICE_ID);
    expect(ALICE_ID in updatedParty.members).toBe(true);
    expect(CHARLIE_ID in updatedParty.members).toBe(true);
    expect(BOB_ID in updatedParty.members).toBe(false);
  });

  it('should reject kick request from non-owner', () => {
    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: BOB_ID, // Bob is a member, not owner
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: ALICE_ID, // Trying to kick Alice
      },
    });

    const result = partyKickReducer(context, command);

    // Should have an error (not the owner)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Party should remain unchanged
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty.size).toBe(2);
    expect(updatedParty.owner).toBe(ALICE_ID);
    expect(ALICE_ID in updatedParty.members).toBe(true);
    expect(BOB_ID in updatedParty.members).toBe(true);
  });

  it('should reject owner trying to kick themselves', () => {
    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: ALICE_ID, // Trying to kick themselves
      },
    });

    const result = partyKickReducer(context, command);

    // Should have an error (can't kick yourself)
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

  it('should handle invalid target gracefully', () => {
    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: 'flux:actor:nonexistent' as any,
      },
    });

    const result = partyKickReducer(context, command);

    // Should have an error (invalid target)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Party should remain unchanged
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty.size).toBe(2);
  });

  it('should handle target not in party gracefully', () => {
    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: CHARLIE_ID, // Charlie is not in the party
      },
    });

    const result = partyKickReducer(context, command);

    // Should have an error (target not in party)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Party should remain unchanged
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty.size).toBe(2);
    expect(ALICE_ID in updatedParty.members).toBe(true);
    expect(BOB_ID in updatedParty.members).toBe(true);
  });

  it('should handle actor not in party gracefully', () => {
    const command: PartyKickCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_KICK,
      actor: CHARLIE_ID, // Charlie is not in any party
      location: DEFAULT_LOCATION,
      args: {
        partyOwnerId: ALICE_ID,
        targetId: BOB_ID,
      },
    });

    const result = partyKickReducer(context, command);

    // Should have an error (actor not in party)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Party should remain unchanged
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty.size).toBe(2);
  });
});

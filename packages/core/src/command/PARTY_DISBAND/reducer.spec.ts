import { describe, beforeEach, it, expect } from 'vitest';
import { partyDisbandReducer } from './reducer';
import { PartyDisbandCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { Party } from '~/types/entity/group';
import { ActorDidDisbandParty, EventType } from '~/types/event';
import { extractFirstEventOfType } from '~/testing/event';

const NOW = DEFAULT_TIMESTAMP;
const CHARLIE_ID = 'flux:actor:charlie' as const;

describe('PARTY_DISBAND Reducer', () => {
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

    // Add some invitations
    context.partyApi.inviteToParty(party, CHARLIE_ID);
  });

  it('should disband party when owner requests it', () => {
    const command: PartyDisbandCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_DISBAND,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyDisbandReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit disband event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const disbandEvent = extractFirstEventOfType<ActorDidDisbandParty>(events, EventType.ACTOR_DID_DISBAND_PARTY)!;
    expect(disbandEvent).toBeDefined();
    expect(disbandEvent.actor).toBe(ALICE_ID);
    expect(disbandEvent.payload.partyId).toBe(party.id);

    // Zero-copy references to party data
    expect(disbandEvent.payload.formerMembers).toBe(party.members);
    expect(disbandEvent.payload.cancelledInvitations).toBe(party.invitations);

    // Verify the data content
    expect(ALICE_ID in disbandEvent.payload.formerMembers).toBe(true);
    expect(BOB_ID in disbandEvent.payload.formerMembers).toBe(true);
    expect(CHARLIE_ID in disbandEvent.payload.cancelledInvitations).toBe(true);

    // Party should be removed from world
    const updatedParty = result.world.groups[party.id];
    expect(updatedParty).toBeUndefined();

    // All members should have their party references cleared
    const alice = result.world.actors[ALICE_ID];
    const bob = result.world.actors[BOB_ID];
    expect(alice.party).toBeUndefined();
    expect(bob.party).toBeUndefined();
  });

  it('should handle single-member party disband', () => {
    // Remove Bob, leaving only Alice
    context.partyApi.removePartyMember(party, BOB_ID);
    expect(party.size).toBe(1);

    const command: PartyDisbandCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_DISBAND,
      actor: ALICE_ID, // Alice is the owner and only member
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyDisbandReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit disband event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const disbandEvent = extractFirstEventOfType<ActorDidDisbandParty>(events, EventType.ACTOR_DID_DISBAND_PARTY)!;
    expect(disbandEvent).toBeDefined();
    expect(disbandEvent.actor).toBe(ALICE_ID);

    // Party should be removed from world
    const updatedParty = result.world.groups[party.id];
    expect(updatedParty).toBeUndefined();

    // Alice should have her party reference cleared
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBeUndefined();
  });

  it('should reject disband request from non-owner', () => {
    const command: PartyDisbandCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_DISBAND,
      actor: BOB_ID, // Bob is a member, not owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyDisbandReducer(context, command);

    // Should have an error (not the owner)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);

    // Party should still exist
    const updatedParty = result.world.groups[party.id] as Party;
    expect(updatedParty).toBeDefined();
    expect(updatedParty.size).toBe(2);
    expect(updatedParty.owner).toBe(ALICE_ID);

    // Members should still have their party references
    const alice = result.world.actors[ALICE_ID];
    const bob = result.world.actors[BOB_ID];
    expect(alice.party).toBe(party.id);
    expect(bob.party).toBe(party.id);
  });

  it('should handle actor not in party gracefully', () => {
    const command: PartyDisbandCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_DISBAND,
      actor: CHARLIE_ID, // Charlie is not in any party
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyDisbandReducer(context, command);

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

    const command: PartyDisbandCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_DISBAND,
      actor: BOB_ID,
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyDisbandReducer(context, command);

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

  it('should handle party with invitations correctly', () => {
    // Verify we have invitations
    expect(context.partyApi.isInvited(party, CHARLIE_ID)).toBe(true);

    const command: PartyDisbandCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_DISBAND,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyDisbandReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit disband event with cancelled invitations
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const disbandEvent = extractFirstEventOfType<ActorDidDisbandParty>(events, EventType.ACTOR_DID_DISBAND_PARTY)!;
    expect(disbandEvent).toBeDefined();

    // Should include the cancelled invitation
    expect(CHARLIE_ID in disbandEvent.payload.cancelledInvitations).toBe(true);

    // Party should be removed from world
    const updatedParty = result.world.groups[party.id];
    expect(updatedParty).toBeUndefined();
  });
});

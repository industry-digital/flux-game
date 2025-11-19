import { describe, beforeEach, it, expect } from 'vitest';
import { partyInviteReducer } from './reducer';
import { PartyInviteCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { ActorDidCreateParty, ActorDidReceivePartyInvitation, EventType } from '~/types/event';
import { createActorCommand } from '~/lib/intent';
import { extractFirstEventOfType } from '~/testing/event';

const NOW = DEFAULT_TIMESTAMP;

describe('PARTY_INVITE Reducer', () => {
  let context: TransformerContext;
  let command: PartyInviteCommand;

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


    command = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_INVITE,
      actor: ALICE_ID,
      location: DEFAULT_LOCATION,
      args: {
        invitee: BOB_ID,
      },
    });
  });

  it('should create a party and send invitation when actor has no party', () => {
    const result = partyInviteReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit both party creation and invitation events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(2);

    // Verify party creation event
    const partyCreatedEvent = extractFirstEventOfType<ActorDidCreateParty>(events, EventType.ACTOR_DID_CREATE_PARTY)!;
    expect(partyCreatedEvent).toBeDefined();
    expect(partyCreatedEvent.actor).toBe(ALICE_ID); // Alice creates the party
    expect(partyCreatedEvent.trace).toBe(command.id);
    expect(partyCreatedEvent.location).toBe(DEFAULT_LOCATION);
    expect(partyCreatedEvent.payload.partyId).toBeDefined();

    // Verify invitation received event
    const invitationEvent = extractFirstEventOfType<ActorDidReceivePartyInvitation>(events, EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION)!;
    expect(invitationEvent).toBeDefined();
    expect(invitationEvent.actor).toBe(BOB_ID); // Bob receives the invitation
    expect(invitationEvent.payload.inviteeId).toBe(BOB_ID);

    // Both events should reference the same party
    expect(invitationEvent.payload.partyId).toBe(partyCreatedEvent.payload.partyId);

    // Alice should now have a party
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBeDefined();

    // The party should exist and have Alice as a member and owner
    const party = result.world.groups[alice.party!];
    expect(party).toBeDefined();
    expect(party.owner).toBe(ALICE_ID);
    expect(party.size).toBe(1);
    expect(party.members[ALICE_ID]).toBeDefined();

    // Bob should have a pending invitation
    expect(party.invitations[BOB_ID]).toBeDefined();

    // The party ID should match the event payloads
    expect(party.id).toBe(partyCreatedEvent.payload.partyId);
  });

  it('should send invitation when actor already has a party', () => {
    // Pre-create a party for Alice (Alice is automatically a member as owner)
    const party = context.partyApi.createParty(ALICE_ID);

    const result = partyInviteReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit only invitation event (no party creation since party already exists)
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);

    // Should NOT emit party creation event
    const partyCreatedEvents = events.filter(e => e.type === EventType.ACTOR_DID_CREATE_PARTY);
    expect(partyCreatedEvents).toHaveLength(0);

    // Should emit invitation received event
    const invitationEvent = extractFirstEventOfType<ActorDidReceivePartyInvitation>(events, EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION)!;
    expect(invitationEvent).toBeDefined();
    expect(invitationEvent.actor).toBe(BOB_ID); // Bob receives the invitation
    expect(invitationEvent.payload.inviteeId).toBe(BOB_ID);
    expect(invitationEvent.payload.partyId).toBe(party.id);

    // Bob should have a pending invitation
    expect(party.invitations[BOB_ID]).toBeDefined();
  });

  it('should handle invalid invitee gracefully', () => {
    const invalidCommand = {
      ...command,
      args: {
        invitee: 'flux:actor:nonexistent' as any,
      },
    };

    const result = partyInviteReducer(context, invalidCommand);

    // Should have an error
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should emit party creation event but not invitation event
    // (party is created before invitee validation)
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);

    // Should emit party creation event
    const partyCreatedEvent = extractFirstEventOfType<ActorDidCreateParty>(events, EventType.ACTOR_DID_CREATE_PARTY)!;
    expect(partyCreatedEvent).toBeDefined();
    expect(partyCreatedEvent.actor).toBe(ALICE_ID);

    // Should NOT emit invitation event
    const invitationEvents = events.filter(e => e.type === EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION);
    expect(invitationEvents).toHaveLength(0);

    // Alice should still have the created party
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBeDefined();

    // The party should exist but have no invitations
    const party = result.world.groups[alice.party!];
    expect(party).toBeDefined();
    expect(party.owner).toBe(ALICE_ID);
    expect(Object.keys(party.invitations)).toHaveLength(0);
  });

  it('should handle already invited actor gracefully', () => {
    // Pre-create party and send invitation (Alice is automatically a member as owner)
    const party = context.partyApi.createParty(ALICE_ID);
    context.partyApi.inviteToParty(party, BOB_ID);

    const result = partyInviteReducer(context, command);

    // Should not have any errors (invitation is idempotent)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit the invitation event (invitation timestamp is refreshed)
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION);
  });
});

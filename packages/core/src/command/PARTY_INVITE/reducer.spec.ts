import { describe, beforeEach, it, expect } from 'vitest';
import { partyInviteReducer } from './reducer';
import { PartyInviteCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { ActorDidReceivePartyInvitation, EventType } from '~/types/event';
import { createActorCommand } from '~/lib/intent';
import { extractFirstEventOfType } from '~/testing/event';

const NOW = DEFAULT_TIMESTAMP;
const ONE_MINUTE = 60 * 1_000;

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

    // Should emit invitation received event
    const events = result.getDeclaredEvents();
    const invitationEvent = extractFirstEventOfType<ActorDidReceivePartyInvitation>(events, EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION)!;
    expect(invitationEvent).toBeDefined();
    expect(invitationEvent.actor).toBe(BOB_ID); // Bob receives the invitation
    expect(invitationEvent.payload.inviteeId).toBe(BOB_ID);

    // Alice should now have a party
    const alice = result.world.actors[ALICE_ID];
    expect(alice.party).toBeDefined();

    // The party should exist and have Alice as a member
    const party = result.world.groups[alice.party!];
    expect(party).toBeDefined();
    expect(party.size).toBe(1);
    expect(party.members[ALICE_ID]).toBe(1);

    // Bob should have a pending invitation
    expect(party.invitations[BOB_ID]).toBeDefined();
  });

  it('should send invitation when actor already has a party', () => {
    // Pre-create a party for Alice
    const party = context.partyApi.createParty();
    context.partyApi.addPartyMember(party, ALICE_ID);

    const result = partyInviteReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit invitation received event
    const events = result.getDeclaredEvents();
    const invitationEvent = extractFirstEventOfType<ActorDidReceivePartyInvitation>(events, EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION)!;
    expect(invitationEvent).toBeDefined();
    expect(invitationEvent.actor).toBe(BOB_ID); // Bob receives the invitation
    expect(invitationEvent.payload.inviteeId).toBe(BOB_ID);

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

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);
  });

  it('should handle already invited actor gracefully', () => {
    // Pre-create party and send invitation
    const party = context.partyApi.createParty();
    context.partyApi.addPartyMember(party, ALICE_ID);
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

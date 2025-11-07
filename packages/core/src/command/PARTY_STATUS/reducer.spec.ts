import { describe, beforeEach, it, expect } from 'vitest';
import { partyInspectReducer } from './reducer';
import { PartyStatusCommand } from './types';
import { TransformerContext } from '~/types/handler';
import { createTransformerContext } from '~/worldkit/context';
import { createPlace } from '~/worldkit/entity/place';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TIMESTAMP } from '~/testing/constants';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { Party } from '~/types/entity/group';
import { ActorDidInspectParty, EventType } from '~/types/event';
import { extractFirstEventOfType } from '~/testing/event';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { Actor } from '~/types/entity/actor';
import { createDefaultActors } from '~/testing/actors';
import { Place } from '~/types/entity/place';
const NOW = DEFAULT_TIMESTAMP;
const CHARLIE_ID = 'flux:actor:charlie' as const;

describe('PARTY_INSPECT Reducer', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let place: Place;
  let party: Party;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;

  beforeEach(() => {
    context = createTransformerContext();
    place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob, charlie } = createDefaultActors());
    scenario = createWorldScenario(context as TransformerContext, {
      places: [place],
      actors: [alice, bob, charlie],
    });

    // Create party with Alice as owner and Bob as member
    party = context.partyApi.createParty(ALICE_ID);
    context.partyApi.addPartyMember(party, BOB_ID);
    context.partyApi.inviteToParty(party, CHARLIE_ID);
  });

  it('should inspect party as owner and include invitations', () => {
    const command: PartyStatusCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_STATUS,
      actor: ALICE_ID, // Alice is the owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyInspectReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit inspect event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const inspectEvent = extractFirstEventOfType<ActorDidInspectParty>(events, EventType.ACTOR_DID_INSPECT_PARTY)!;
    expect(inspectEvent).toBeDefined();
    expect(inspectEvent.actor).toBe(ALICE_ID);
    expect(inspectEvent.payload.partyId).toBe(party.id);
    expect(inspectEvent.payload.owner).toBe(ALICE_ID);

    // Zero-copy references
    expect(inspectEvent.payload.members).toBe(party.members);
    expect(inspectEvent.payload.invitations).toBe(party.invitations);

    // Should include invitations for owner
    expect(inspectEvent.payload.invitations).toBeDefined();
    expect(CHARLIE_ID in inspectEvent.payload.invitations!).toBe(true);
  });

  it('should inspect party as member and exclude invitations', () => {
    const command: PartyStatusCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_STATUS,
      actor: BOB_ID, // Bob is a member, not owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyInspectReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit inspect event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const inspectEvent = extractFirstEventOfType<ActorDidInspectParty>(events, EventType.ACTOR_DID_INSPECT_PARTY)!;
    expect(inspectEvent).toBeDefined();
    expect(inspectEvent.actor).toBe(BOB_ID);
    expect(inspectEvent.payload.partyId).toBe(party.id);
    expect(inspectEvent.payload.owner).toBe(ALICE_ID);

    // Zero-copy references
    expect(inspectEvent.payload.members).toBe(party.members);

    // Should NOT include invitations for non-owner
    expect(inspectEvent.payload.invitations).toBeUndefined();
  });

  it('should handle actor not in party gracefully', () => {
    const command: PartyStatusCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_STATUS,
      actor: CHARLIE_ID, // Charlie is not in any party
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyInspectReducer(context, command);

    // Should have an error (actor not in party)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);
  });

  it('should handle corrupted party reference gracefully', () => {
    // Manually corrupt Bob's party reference
    const bob = context.world.actors[BOB_ID];
    bob.party = 'flux:group:party:nonexistent' as any;

    const command: PartyStatusCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_STATUS,
      actor: BOB_ID,
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyInspectReducer(context, command);

    // Should have an error (party not found)
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(1);

    // Should not emit any events
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(0);
  });

  it('should handle single-member party correctly', () => {
    // Create a new party with only Charlie (who isn't in any party yet)
    const soloParty = context.partyApi.createParty(CHARLIE_ID);

    const command: PartyStatusCommand = createActorCommand({
      id: 'abcd1234',
      ts: NOW,
      type: CommandType.PARTY_STATUS,
      actor: CHARLIE_ID, // Charlie is now the solo party owner
      location: DEFAULT_LOCATION,
      args: {},
    });

    const result = partyInspectReducer(context, command);

    // Should not have errors
    const errors = result.getDeclaredErrors();
    expect(errors).toHaveLength(0);

    // Should emit inspect event
    const events = result.getDeclaredEvents();
    expect(events).toHaveLength(1);
    const inspectEvent = extractFirstEventOfType<ActorDidInspectParty>(events, EventType.ACTOR_DID_INSPECT_PARTY)!;
    expect(inspectEvent).toBeDefined();
    expect(inspectEvent.payload.owner).toBe(CHARLIE_ID);
    expect(Object.keys(inspectEvent.payload.members)).toHaveLength(1);
    expect(CHARLIE_ID in inspectEvent.payload.members).toBe(true);

    // Should include invitations for owner (even if empty)
    expect(inspectEvent.payload.invitations).toBeDefined();
  });
});

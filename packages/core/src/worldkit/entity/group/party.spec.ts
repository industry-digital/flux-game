import { describe, it, expect, beforeEach } from 'vitest';
import { createPartyApi, PartyApi, DEFAULT_MAX_PARTY_SIZE } from './party';
import { GroupApiContext } from './api/api';
import { ActorURN } from '~/types/taxonomy';
import { createTransformerContext } from '~/worldkit/context';
import { createTestActor } from '~/testing/world-testing';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { createDefaultActors } from '~/testing/actors';
import { Actor } from '~/types/entity/actor';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { Place } from '~/types/entity/place';
import { createPlace } from '~/worldkit/entity/place';
import { TransformerContext } from '~/types/handler';

describe('Party API', () => {
  let context: GroupApiContext;
  let scenario: WorldScenarioHook;
  let partyApi: PartyApi;
  let place: Place;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;

  beforeEach(() => {
    context = createTransformerContext();
    partyApi = createPartyApi(context);
    place = createPlace((p: Place) => ({ ...p, id: DEFAULT_LOCATION }));
    ({ alice, bob, charlie } = createDefaultActors());

    scenario = createWorldScenario(context as TransformerContext, {
      places: [place],
      actors: [alice, bob, charlie],
    });
  });

  describe('addPartyMember', () => {
    it('should assign party ID to actor.party field when adding member', () => {
      const party = partyApi.createParty(alice.id, (defaults) => defaults);

      // Verify actor is already in the party as owner (new behavior)
      expect(context.world.actors[alice.id].party).toBe(party.id);
      expect(party.size).toBe(1);

      // Add bob to the party
      partyApi.addPartyMember(party, bob.id);

      // Verify bob's party is now set to the party ID
      expect(context.world.actors[bob.id].party).toBe(party.id);
      expect(party.size).toBe(2); // Alice (owner) + Bob
    });

    it('should throw error when actor does not exist in world', () => {
      const party = partyApi.createParty(alice.id, (defaults) => defaults);
      const nonExistentActorId = 'flux:actor:nonexistent' as ActorURN;

      expect(() => {
        partyApi.addPartyMember(party, nonExistentActorId);
      }).toThrow(`Actor ${nonExistentActorId} not found`);
    });

    it('should do nothing when actor is already in the same party', () => {
      const party = partyApi.createParty(alice.id, (defaults) => defaults);

      // Add actor to party first time
      partyApi.addPartyMember(party, alice.id);
      expect(party.size).toBe(1);
      expect(context.world.actors[alice.id].party).toBe(party.id);

      // Adding same actor again should not change anything
      partyApi.addPartyMember(party, alice.id);
      expect(party.size).toBe(1);
      expect(context.world.actors[alice.id].party).toBe(party.id);
    });

    it('should throw error when actor is already in a different party', () => {
      const party1 = partyApi.createParty(alice.id, (defaults) => defaults);
      const party2 = partyApi.createParty(bob.id, (defaults) => defaults);

      // Add actor to first party
      partyApi.addPartyMember(party1, alice.id);
      expect(context.world.actors[alice.id].party).toBe(party1.id);

      // Trying to add to second party should throw
      expect(() => {
        partyApi.addPartyMember(party2, alice.id);
      }).toThrow(`Actor ${alice.id} is already in a different party (${party1.id})`);
    });

    it('should enforce DEFAULT_MAX_PARTY_SIZE for parties', () => {
      const party = partyApi.createParty(alice.id, (defaults) => defaults);

      // Add bob and charlie to reach the limit (alice is already owner, so 3 total)
      partyApi.addPartyMember(party, bob.id);
      partyApi.addPartyMember(party, charlie.id);

      expect(party.size).toBe(DEFAULT_MAX_PARTY_SIZE);

      // Adding one more should throw
      const overflowActorId = 'flux:actor:overflow' as ActorURN;
      const overflowActor = createTestActor({ id: overflowActorId });
      context.world.actors[overflowActorId] = overflowActor;

      expect(() => {
        partyApi.addPartyMember(party, overflowActorId);
      }).toThrow(`Party ${party.id} is at maximum capacity (${DEFAULT_MAX_PARTY_SIZE} members)`);
    });

    it('should respect custom party size policy', () => {
      const customPolicy = { maxSize: 5, invitationTimeout: 60000 };
      const customPartyApi = createPartyApi(context, customPolicy);
      const party = customPartyApi.createParty(alice.id, (defaults) => defaults);

      // Add bob and charlie first
      customPartyApi.addPartyMember(party, bob.id);
      customPartyApi.addPartyMember(party, charlie.id);

      // Add additional members up to the custom limit (alice + bob + charlie = 3, need 2 more)
      for (let i = 0; i < 2; i++) {
        const actorId = `flux:actor:test${i}` as ActorURN;
        const actor = createTestActor({ id: actorId });
        context.world.actors[actorId] = actor;
        customPartyApi.addPartyMember(party, actorId);
      }

      expect(party.size).toBe(customPolicy.maxSize);

      // Adding one more should throw with custom limit
      const overflowActorId = 'flux:actor:overflow' as ActorURN;
      const overflowActor = createTestActor({ id: overflowActorId });
      context.world.actors[overflowActorId] = overflowActor;

      expect(() => {
        customPartyApi.addPartyMember(party, overflowActorId);
      }).toThrow(`Party ${party.id} is at maximum capacity (${customPolicy.maxSize} members)`);
    });
  });

  describe('removePartyMember', () => {
    it('should clear actor.party field when removing member', () => {
      const party = partyApi.createParty(alice.id, (defaults) => defaults);

      // Add Alice first (becomes party owner), then Bob
      partyApi.addPartyMember(party, alice.id);
      partyApi.addPartyMember(party, bob.id);
      expect(context.world.actors[bob.id].party).toBe(party.id);
      expect(party.size).toBe(2);

      // Remove Bob (non-owner) from party
      partyApi.removePartyMember(party, bob.id);

      // Verify Bob's party is now cleared, but Alice remains
      expect(context.world.actors[bob.id].party).toBeUndefined();
      expect(context.world.actors[alice.id].party).toBe(party.id);
      expect(party.size).toBe(1);
    });

    it('should throw error when actor does not exist in world', () => {
      const party = partyApi.createParty(alice.id, (defaults) => defaults);
      const nonExistentActorId = 'flux:actor:nonexistent' as ActorURN;

      expect(() => {
        partyApi.removePartyMember(party, nonExistentActorId);
      }).toThrow(`Actor ${nonExistentActorId} not found`);
    });

    it('should throw error when actor is not in the specified party', () => {
      const party1 = partyApi.createParty(ALICE_ID, (defaults) => defaults);
      const party2 = partyApi.createParty(BOB_ID, (defaults) => defaults);

      // Add actor to party1
      partyApi.addPartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);

      // Try to remove from party2 (should throw)
      expect(() => {
        partyApi.removePartyMember(party2, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is not in party ${party2.id}`);

      // Actor should still be in party1
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);
    });

    it('should throw error when actor has no party', () => {
      const party = partyApi.createParty(ALICE_ID, (defaults) => defaults);

      // Try to remove Bob who is not in any party
      expect(() => {
        partyApi.removePartyMember(party, BOB_ID);
      }).toThrow(`Actor ${BOB_ID} is not in party ${party.id}`);
    });

    it('should handle multiple members correctly', () => {
      const party = partyApi.createParty(ALICE_ID, (defaults) => defaults);
      const charlieId = 'flux:actor:charlie' as ActorURN;

      // Create and add actors to world
      // Add all actors to party (Alice becomes owner)
      partyApi.addPartyMember(party, alice.id);
      partyApi.addPartyMember(party, bob.id);
      partyApi.addPartyMember(party, charlie.id);
      expect(party.size).toBe(3);
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);
      expect(context.world.actors[BOB_ID].party).toBe(party.id);
      expect(context.world.actors[charlieId].party).toBe(party.id);

      // Remove Bob (non-owner)
      partyApi.removePartyMember(party, BOB_ID);
      expect(party.size).toBe(2);
      expect(context.world.actors[BOB_ID].party).toBeUndefined();
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);
      expect(context.world.actors[charlieId].party).toBe(party.id);

      // Remove Charlie (non-owner)
      partyApi.removePartyMember(party, charlieId);
      expect(party.size).toBe(1);
      expect(context.world.actors[BOB_ID].party).toBeUndefined();
      expect(context.world.actors[charlieId].party).toBeUndefined();
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);
    });
  });

  describe('Party Membership Invariant: Actor may not be in more than one party', () => {
    it('should maintain invariant when moving between parties via removal and addition', () => {
      const party1 = partyApi.createParty(ALICE_ID, (defaults) => defaults); // Alice is owner/member
      const party2 = partyApi.createParty(BOB_ID, (defaults) => defaults);   // Bob is owner/member

      // Verify initial state - Alice is in party1, Bob is in party2
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);
      expect(context.world.actors[BOB_ID].party).toBe(party2.id);

      // Remove Alice from party1 (should clear her party)
      partyApi.removePartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBeUndefined();

      // Now Alice should be able to join party2
      partyApi.addPartyMember(party2, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party2.id);

      // Verify Alice is not in party1 anymore but is in party2
      expect(partyApi.isPartyMember(party1, ALICE_ID)).toBe(false);
      expect(partyApi.isPartyMember(party2, ALICE_ID)).toBe(true);
    });

    it('should prevent simultaneous membership even with direct actor.party manipulation', () => {
      const party1 = partyApi.createParty(ALICE_ID, (defaults) => defaults);
      const party2 = partyApi.createParty(BOB_ID, (defaults) => defaults);

      // Create actors and add to world
      // Add Alice to party1 properly through the API
      partyApi.addPartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);

      // Manually corrupt actor.party to point to a different party
      context.world.actors[ALICE_ID].party = party2.id;

      // Now trying to add Alice to party1 should fail since her party field says she's in party2
      expect(() => {
        partyApi.addPartyMember(party1, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is already in a different party (${party2.id})`);

      // And trying to add to party2 should succeed (no-op) since the API thinks she's already there
      // This demonstrates the API relies on the actor.party field for consistency
      partyApi.addPartyMember(party2, ALICE_ID); // Should not throw
      expect(context.world.actors[ALICE_ID].party).toBe(party2.id);
    });

    it('should maintain invariant across multiple party operations', () => {
      // Create parties with different owners - each owner is automatically a member
      const party1 = partyApi.createParty(ALICE_ID, (defaults) => defaults);  // Alice is owner/member
      const party2 = partyApi.createParty(BOB_ID, (defaults) => defaults);    // Bob is owner/member
      const party3 = partyApi.createParty(CHARLIE_ID, (defaults) => defaults); // Charlie is owner/member

      // Verify initial state - each actor is in their own party
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);
      expect(context.world.actors[BOB_ID].party).toBe(party2.id);
      expect(context.world.actors[CHARLIE_ID].party).toBe(party3.id);

      // Try to add Alice to other parties - should fail since she's already in party1
      expect(() => {
        partyApi.addPartyMember(party2, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is already in a different party (${party1.id})`);

      expect(() => {
        partyApi.addPartyMember(party3, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is already in a different party (${party1.id})`);

      // Verify Alice is still only in the first party
      expect(partyApi.isPartyMember(party1, ALICE_ID)).toBe(true);
      expect(partyApi.isPartyMember(party2, ALICE_ID)).toBe(false);
      expect(partyApi.isPartyMember(party3, ALICE_ID)).toBe(false);
    });

    it('should handle edge case of actor with corrupted party reference', () => {
      const party1 = partyApi.createParty(ALICE_ID, (defaults) => defaults);
      const party2 = partyApi.createParty(BOB_ID, (defaults) => defaults);

      // Simulate corrupted state: actor.party points to non-existent party
      const corruptedPartyId = 'flux:group:party:nonexistent' as any;
      context.world.actors[ALICE_ID].party = corruptedPartyId;

      // The API should prevent adding to any party since actor claims to be in a different party
      expect(() => {
        partyApi.addPartyMember(party1, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is already in a different party (${corruptedPartyId})`);

      // Same for party2
      expect(() => {
        partyApi.addPartyMember(party2, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is already in a different party (${corruptedPartyId})`);

      // To fix this, we'd need to clear the corrupted reference first
      context.world.actors[ALICE_ID].party = undefined;

      // Now Alice can join a party normally
      partyApi.addPartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);
    });
  });
});

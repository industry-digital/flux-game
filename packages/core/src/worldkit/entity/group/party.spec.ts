import { describe, it, expect, beforeEach } from 'vitest';
import { createPartyApi, PartyApi, DEFAULT_MAX_PARTY_SIZE } from './party';
import { GroupApiContext } from './api';
import { ActorURN } from '~/types/taxonomy';
import { createTransformerContext } from '~/worldkit/context';
import { createTestActor } from '~/testing/world-testing';
import { ALICE_ID, BOB_ID } from '~/testing/constants';

describe('Party API', () => {
  let context: GroupApiContext;
  let partyApi: PartyApi;

  beforeEach(() => {
    context = createTransformerContext();
    partyApi = createPartyApi(context);
  });

  describe('addPartyMember', () => {
    it('should assign party ID to actor.party field when adding member', () => {
      const party = partyApi.createParty((defaults) => defaults);

      // Create and add actor to world
      const alice = createTestActor({ id: ALICE_ID });
      context.world.actors[ALICE_ID] = alice;

      // Verify actor has no party initially
      expect(alice.party).toBeUndefined();

      // Add actor to party
      partyApi.addPartyMember(party, ALICE_ID);

      // Verify actor.party is now set to the party ID
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);
      expect(party.size).toBe(1);
    });

    it('should throw error when actor does not exist in world', () => {
      const party = partyApi.createParty((defaults) => defaults);
      const nonExistentActorId = 'flux:actor:nonexistent' as ActorURN;

      expect(() => {
        partyApi.addPartyMember(party, nonExistentActorId);
      }).toThrow(`Actor ${nonExistentActorId} not found`);
    });

    it('should do nothing when actor is already in the same party', () => {
      const party = partyApi.createParty((defaults) => defaults);

      // Create and add actor to world
      const alice = createTestActor({ id: ALICE_ID });
      context.world.actors[ALICE_ID] = alice;

      // Add actor to party first time
      partyApi.addPartyMember(party, ALICE_ID);
      expect(party.size).toBe(1);
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);

      // Adding same actor again should not change anything
      partyApi.addPartyMember(party, ALICE_ID);
      expect(party.size).toBe(1);
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);
    });

    it('should throw error when actor is already in a different party', () => {
      const party1 = partyApi.createParty((defaults) => defaults);
      const party2 = partyApi.createParty((defaults) => defaults);

      // Create and add actor to world
      const alice = createTestActor({ id: ALICE_ID });
      context.world.actors[ALICE_ID] = alice;

      // Add actor to first party
      partyApi.addPartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);

      // Trying to add to second party should throw
      expect(() => {
        partyApi.addPartyMember(party2, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is already in a different party (${party1.id})`);
    });

    it('should enforce DEFAULT_MAX_PARTY_SIZE for parties', () => {
      const party = partyApi.createParty((defaults) => defaults);

      // Add members up to the limit
      for (let i = 0; i < DEFAULT_MAX_PARTY_SIZE; i++) {
        const actorId = `flux:actor:test${i}` as ActorURN;
        const actor = createTestActor({ id: actorId });
        context.world.actors[actorId] = actor;
        partyApi.addPartyMember(party, actorId);
      }

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
      const customPolicy = { maxSize: 5 };
      const customPartyApi = createPartyApi(context, customPolicy);
      const party = customPartyApi.createParty((defaults) => defaults);

      // Add members up to the custom limit
      for (let i = 0; i < customPolicy.maxSize; i++) {
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
      const party = partyApi.createParty((defaults) => defaults);

      // Create and add actors to world
      const alice = createTestActor({ id: ALICE_ID });
      const bob = createTestActor({ id: BOB_ID });
      context.world.actors[ALICE_ID] = alice;
      context.world.actors[BOB_ID] = bob;

      // Add Alice first (becomes party owner), then Bob
      partyApi.addPartyMember(party, ALICE_ID);
      partyApi.addPartyMember(party, BOB_ID);
      expect(context.world.actors[BOB_ID].party).toBe(party.id);
      expect(party.size).toBe(2);

      // Remove Bob (non-owner) from party
      partyApi.removePartyMember(party, BOB_ID);

      // Verify Bob's party is now cleared, but Alice remains
      expect(context.world.actors[BOB_ID].party).toBeUndefined();
      expect(context.world.actors[ALICE_ID].party).toBe(party.id);
      expect(party.size).toBe(1);
    });

    it('should throw error when actor does not exist in world', () => {
      const party = partyApi.createParty((defaults) => defaults);
      const nonExistentActorId = 'flux:actor:nonexistent' as ActorURN;

      expect(() => {
        partyApi.removePartyMember(party, nonExistentActorId);
      }).toThrow(`Actor ${nonExistentActorId} not found`);
    });

    it('should throw error when actor is not in the specified party', () => {
      const party1 = partyApi.createParty((defaults) => defaults);
      const party2 = partyApi.createParty((defaults) => defaults);

      // Create and add actor to world
      const alice = createTestActor({ id: ALICE_ID });
      context.world.actors[ALICE_ID] = alice;

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
      const party = partyApi.createParty((defaults) => defaults);

      // Create and add actor to world (but don't add to any party)
      const alice = createTestActor({ id: ALICE_ID });
      context.world.actors[ALICE_ID] = alice;

      // Try to remove from party (should throw)
      expect(() => {
        partyApi.removePartyMember(party, ALICE_ID);
      }).toThrow(`Actor ${ALICE_ID} is not in party ${party.id}`);
    });

    it('should handle multiple members correctly', () => {
      const party = partyApi.createParty((defaults) => defaults);
      const charlieId = 'flux:actor:charlie' as ActorURN;

      // Create and add actors to world
      const alice = createTestActor({ id: ALICE_ID });
      const bob = createTestActor({ id: BOB_ID });
      const charlie = createTestActor({ id: charlieId });
      context.world.actors[ALICE_ID] = alice;
      context.world.actors[BOB_ID] = bob;
      context.world.actors[charlieId] = charlie;

      // Add all actors to party (Alice becomes owner)
      partyApi.addPartyMember(party, ALICE_ID);
      partyApi.addPartyMember(party, BOB_ID);
      partyApi.addPartyMember(party, charlieId);
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
      const party1 = partyApi.createParty((defaults) => defaults);
      const party2 = partyApi.createParty((defaults) => defaults);

      // Create actors and add to world
      const alice = createTestActor({ id: ALICE_ID });
      const bob = createTestActor({ id: BOB_ID });
      context.world.actors[ALICE_ID] = alice;
      context.world.actors[BOB_ID] = bob;

      // Add Bob and Alice to party 1. Bob is the owner since he's the first to join.
      partyApi.addPartyMember(party1, BOB_ID);
      partyApi.addPartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party1.id);

      // Remove Alice from party1 (should clear her party)
      partyApi.removePartyMember(party1, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBeUndefined();

      // Now Alice should be able to join party2
      partyApi.addPartyMember(party2, ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(party2.id);

      // Verify Alice is not in party1 anymore
      expect(partyApi.isPartyMember(party1, ALICE_ID)).toBe(false);
      expect(partyApi.isPartyMember(party2, ALICE_ID)).toBe(true);
    });

    it('should prevent simultaneous membership even with direct actor.party manipulation', () => {
      const party1 = partyApi.createParty((defaults) => defaults);
      const party2 = partyApi.createParty((defaults) => defaults);

      // Create actors and add to world
      const alice = createTestActor({ id: ALICE_ID });
      const bob = createTestActor({ id: BOB_ID });
      context.world.actors[ALICE_ID] = alice;
      context.world.actors[BOB_ID] = bob;

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
      const parties = [
        partyApi.createParty((defaults) => defaults),
        partyApi.createParty((defaults) => defaults),
        partyApi.createParty((defaults) => defaults)
      ];

      // Create actors and add to world - need separate actors for each party
      const alice = createTestActor({ id: ALICE_ID });
      const bob = createTestActor({ id: BOB_ID });
      const charlie = createTestActor({ id: 'flux:actor:charlie' as ActorURN });
      context.world.actors[ALICE_ID] = alice;
      context.world.actors[BOB_ID] = bob;
      context.world.actors['flux:actor:charlie' as ActorURN] = charlie;

      // Add different actors to each party first (so Alice won't be owner anywhere)
      partyApi.addPartyMember(parties[0], BOB_ID);
      partyApi.addPartyMember(parties[1], 'flux:actor:charlie' as ActorURN);
      // For party 2, we'll add Alice directly and then test she can't join others

      // Try to add Alice to each party - only the first should succeed
      partyApi.addPartyMember(parties[0], ALICE_ID);
      expect(context.world.actors[ALICE_ID].party).toBe(parties[0].id);

      // All subsequent attempts should fail
      for (let i = 1; i < parties.length; i++) {
        expect(() => {
          partyApi.addPartyMember(parties[i], ALICE_ID);
        }).toThrow(`Actor ${ALICE_ID} is already in a different party (${parties[0].id})`);
      }

      // Verify Alice is only in the first party
      expect(partyApi.isPartyMember(parties[0], ALICE_ID)).toBe(true);
      expect(partyApi.isPartyMember(parties[1], ALICE_ID)).toBe(false);
      expect(partyApi.isPartyMember(parties[2], ALICE_ID)).toBe(false);
    });

    it('should handle edge case of actor with corrupted party reference', () => {
      const party1 = partyApi.createParty((defaults) => defaults);
      const party2 = partyApi.createParty((defaults) => defaults);

      // Create actor and add to world
      const alice = createTestActor({ id: ALICE_ID });
      context.world.actors[ALICE_ID] = alice;

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

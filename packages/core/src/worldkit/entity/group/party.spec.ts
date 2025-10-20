import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPartyMembers,
  getPartyMembersInLocation,
  getActorParty,
  areInSameParty,
  isPartyMember,
  getPartyAllies,
  getPartyAlliesInLocation,
} from './party';
import { createTestActor } from '~/testing';
import { WorldProjection } from '~/types/world';
import { Actor } from '~/types/entity/actor';
import { Party, GroupType } from '~/types/entity/group';
import { ActorURN, PartyURN, PlaceURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';

describe('Party Utilities', () => {
  let world: WorldProjection;
  let partyId: PartyURN;
  let party: Party;
  let alice: Actor;
  let bob: Actor;
  let charlie: Actor;
  let dave: Actor;
  let eve: Actor;

  beforeEach(() => {
    // Create test actors
    alice = createTestActor({ id: 'flux:actor:alice' as ActorURN, name: 'Alice', location: 'flux:place:tavern' as PlaceURN });
    bob = createTestActor({ id: 'flux:actor:bob' as ActorURN, name: 'Bob', location: 'flux:place:tavern' as PlaceURN });
    charlie = createTestActor({ id: 'flux:actor:charlie' as ActorURN, name: 'Charlie', location: 'flux:place:forest' as PlaceURN });
    dave = createTestActor({ id: 'flux:actor:dave' as ActorURN, name: 'Dave', location: 'flux:place:tavern' as PlaceURN });
    eve = createTestActor({ id: 'flux:actor:eve' as ActorURN, name: 'Eve', location: 'flux:place:forest' as PlaceURN });

    // Create a party with Alice, Bob, and Charlie
    partyId = 'flux:group:party:adventurers' as PartyURN;
    party = {
      id: partyId,
      type: EntityType.GROUP,
      kind: GroupType.PARTY,
      name: 'The Adventurers',
      members: {
        [alice.id]: 1,
        [bob.id]: 1,
        [charlie.id]: 1,
      },
    };

    // Set up party membership on actors
    alice.party = partyId;
    bob.party = partyId;
    charlie.party = partyId;
    // Dave and Eve are not in any party

    // Create world projection
    world = {
      actors: {
        [alice.id]: alice,
        [bob.id]: bob,
        [charlie.id]: charlie,
        [dave.id]: dave,
        [eve.id]: eve,
      },
      groups: {
        [partyId]: party,
      },
      places: {},
      items: {},
      sessions: {},
    };
  });

  describe('getPartyMembers', () => {
    it('should return all party members', () => {
      const members = getPartyMembers(world, partyId);

      expect(members).toHaveLength(3);
      expect(members).toContain(alice.id);
      expect(members).toContain(bob.id);
      expect(members).toContain(charlie.id);
    });

    it('should return empty array for non-existent party', () => {
      const members = getPartyMembers(world, 'flux:group:party:nonexistent' as PartyURN);

      expect(members).toHaveLength(0);
    });

    it('should return empty array for non-party group type', () => {
      const factionId = 'flux:group:faction:rebels' as PartyURN;
      world.groups[factionId] = {
        id: factionId,
        type: EntityType.GROUP,
        kind: GroupType.FACTION,
        name: 'The Rebels',
        description: 'A rebel faction',
        members: {
          [alice.id]: 1,
        },
      } as any;

      const members = getPartyMembers(world, factionId);

      expect(members).toHaveLength(0);
    });

    it('should skip members that do not exist in world.actors', () => {
      // Add a non-existent actor to party
      party.members['flux:actor:ghost' as ActorURN] = 1;

      const members = getPartyMembers(world, partyId);

      expect(members).toHaveLength(3);
      expect(members).not.toContain('flux:actor:ghost');
    });
  });

  describe('getPartyMembersInLocation', () => {
    it('should return party members in specified location', () => {
      const membersInTavern = getPartyMembersInLocation(world, partyId, 'flux:place:tavern' as PlaceURN);

      expect(membersInTavern).toHaveLength(2);
      expect(membersInTavern).toContain(alice.id);
      expect(membersInTavern).toContain(bob.id);
      expect(membersInTavern).not.toContain(charlie.id);
    });

    it('should return party members in forest location', () => {
      const membersInForest = getPartyMembersInLocation(world, partyId, 'flux:place:forest' as PlaceURN);

      expect(membersInForest).toHaveLength(1);
      expect(membersInForest).toContain(charlie.id);
      expect(membersInForest).not.toContain(alice.id);
      expect(membersInForest).not.toContain(bob.id);
    });

    it('should return empty array for location with no party members', () => {
      const membersInCave = getPartyMembersInLocation(world, partyId, 'flux:place:cave' as PlaceURN);

      expect(membersInCave).toHaveLength(0);
    });

    it('should return empty array for non-existent party', () => {
      const members = getPartyMembersInLocation(world, 'flux:group:party:nonexistent' as PartyURN, 'flux:place:tavern' as PlaceURN);

      expect(members).toHaveLength(0);
    });
  });

  describe('getActorParty', () => {
    it('should return party for actor with party membership', () => {
      const aliceParty = getActorParty(world, alice);

      expect(aliceParty).toBe(party);
    });

    it('should return null for actor without party', () => {
      const daveParty = getActorParty(world, dave);

      expect(daveParty).toBeNull();
    });

    it('should return null for actor with non-existent party', () => {
      alice.party = 'flux:group:party:nonexistent' as PartyURN;

      const aliceParty = getActorParty(world, alice);

      expect(aliceParty).toBeNull();
    });

    it('should return null for actor with non-party group', () => {
      const factionId = 'flux:group:faction:rebels' as PartyURN;
      world.groups[factionId] = {
        id: factionId,
        type: EntityType.GROUP,
        kind: GroupType.FACTION,
        name: 'The Rebels',
        description: 'A rebel faction',
        members: {},
      } as any;

      alice.party = factionId;

      const aliceParty = getActorParty(world, alice);

      expect(aliceParty).toBeNull();
    });
  });

  describe('areInSameParty', () => {
    it('should return true for actors in same party', () => {
      const result = areInSameParty(alice, bob, world);

      expect(result).toBe(true);
    });

    it('should return false for actors in different parties', () => {
      // Create another party for Dave
      const otherPartyId = 'flux:group:party:merchants' as PartyURN;
      const otherParty: Party = {
        id: otherPartyId,
        type: EntityType.GROUP,
        kind: GroupType.PARTY,
        name: 'The Merchants',
        members: {
          [dave.id]: 1,
        },
      };

      world.groups[otherPartyId] = otherParty;
      dave.party = otherPartyId;

      const result = areInSameParty(alice, dave, world);

      expect(result).toBe(false);
    });

    it('should return false when one actor has no party', () => {
      const result = areInSameParty(alice, dave, world);

      expect(result).toBe(false);
    });

    it('should return false when both actors have no party', () => {
      const result = areInSameParty(dave, eve, world);

      expect(result).toBe(false);
    });
  });

  describe('isPartyMember', () => {
    it('should return true for actual party member', () => {
      const result = isPartyMember(alice, partyId, world);

      expect(result).toBe(true);
    });

    it('should return false for non-party member', () => {
      const result = isPartyMember(dave, partyId, world);

      expect(result).toBe(false);
    });

    it('should return false for non-existent party', () => {
      const result = isPartyMember(alice, 'flux:group:party:nonexistent' as PartyURN, world);

      expect(result).toBe(false);
    });

    it('should return false for non-party group type', () => {
      const factionId = 'flux:group:faction:rebels' as PartyURN;
      world.groups[factionId] = {
        id: factionId,
        type: EntityType.GROUP,
        kind: GroupType.FACTION,
        name: 'The Rebels',
        description: 'A rebel faction',
        members: {
          [alice.id]: 1,
        },
      } as any;

      const result = isPartyMember(alice, factionId, world);

      expect(result).toBe(false);
    });
  });

  describe('getPartyAllies', () => {
    it('should return party members excluding the actor themselves', () => {
      const allies = getPartyAllies(world, alice);

      expect(allies).toHaveLength(2);
      expect(allies).toContain(bob.id);
      expect(allies).toContain(charlie.id);
      expect(allies).not.toContain(alice.id);
    });

    it('should return empty array for actor without party', () => {
      const allies = getPartyAllies(world, dave);

      expect(allies).toHaveLength(0);
    });

    it('should return empty array for single-member party', () => {
      // Create a party with only Dave
      const soloPartyId = 'flux:group:party:solo' as PartyURN;
      const soloParty: Party = {
        id: soloPartyId,
        type: EntityType.GROUP,
        kind: GroupType.PARTY,
        name: 'Solo Adventure',
        members: {
          [dave.id]: 1,
        },
      };

      world.groups[soloPartyId] = soloParty;
      dave.party = soloPartyId;

      const allies = getPartyAllies(world, dave);

      expect(allies).toHaveLength(0);
    });
  });

  describe('getPartyAlliesInLocation', () => {
    it('should return party allies in same location', () => {
      const allies = getPartyAlliesInLocation(world, alice);

      expect(allies).toHaveLength(1);
      expect(allies).toContain(bob.id);
      expect(allies).not.toContain(charlie.id); // Charlie is in forest
      expect(allies).not.toContain(alice.id); // Exclude self
    });

    it('should return party allies in different location', () => {
      const allies = getPartyAlliesInLocation(world, charlie);

      expect(allies).toHaveLength(0); // No other party members in forest
    });

    it('should return empty array for actor without party', () => {
      const allies = getPartyAlliesInLocation(world, dave);

      expect(allies).toHaveLength(0);
    });

    it('should handle actor with party but no allies in location', () => {
      // Move Alice to a location where no other party members are
      alice.location = 'flux:place:mountain' as PlaceURN;

      const allies = getPartyAlliesInLocation(world, alice);

      expect(allies).toHaveLength(0);
    });
  });
});

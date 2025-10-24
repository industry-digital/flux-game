import { describe, it, expect, beforeEach } from 'vitest';
import { createGroupApi, GroupApiContext } from './api';
import { GroupType } from '~/types/entity/group';
import { ActorURN, GroupURN } from '~/types/taxonomy';
import { createTransformerContext } from '~/worldkit/context';
import { Transform } from './factory';

describe('Group API', () => {
  let context: GroupApiContext;
  let partyApi: ReturnType<typeof createGroupApi<GroupType.PARTY, ActorURN>>;
  let factionApi: ReturnType<typeof createGroupApi<GroupType.FACTION, ActorURN>>;

  beforeEach(() => {
    context = createTransformerContext();
    partyApi = createGroupApi<GroupType.PARTY, ActorURN>(GroupType.PARTY, context);
    factionApi = createGroupApi<GroupType.FACTION, ActorURN>(GroupType.FACTION, context);
  });

  describe('createGroup', () => {
    it('should create a party with default values', () => {
      const party = partyApi.createGroup((defaults) => ({
        ...defaults,
        name: 'Test Party',
      }));

      expect(party.kind).toBe(GroupType.PARTY);
      expect(party.name).toBe('Test Party');
      expect(party.size).toBe(0);
      expect(party.members).toEqual({});
      expect(party.owner).toBeUndefined();
      expect(party.id).toMatch(/^flux:group:party:/);
      expect(context.world.groups[party.id]).toBe(party);
    });

    it('should create a faction with default values', () => {
      const faction = factionApi.createGroup((defaults) => ({
        ...defaults,
        name: 'Test Faction',
      }));

      expect(faction.kind).toBe(GroupType.FACTION);
      expect(faction.name).toBe('Test Faction');
      expect(faction.size).toBe(0);
      expect(faction.members).toEqual({});
      expect(faction.owner).toBeUndefined();
      expect(faction.id).toMatch(/^flux:group:faction:/);
      expect(context.world.groups[faction.id]).toBe(faction);
    });

    it('should allow custom transform functions', () => {
      const customTransform: Transform<any> = (defaults) => ({
        ...defaults,
        name: 'Custom Group',
        owner: 'flux:actor:leader123' as ActorURN,
      });

      const party = partyApi.createGroup(customTransform);

      expect(party.name).toBe('Custom Group');
      expect(party.owner).toBe('flux:actor:leader123');
    });
  });

  describe('getGroup', () => {
    it('should retrieve an existing group', () => {
      const party = partyApi.createGroup((defaults) => ({
        ...defaults,
        name: 'Retrievable Party',
      }));

      const retrieved = partyApi.getGroup(party.id);
      expect(retrieved).toBe(party);
      expect(retrieved.name).toBe('Retrievable Party');
    });

    it('should throw error for non-existent group', () => {
      const nonExistentId = 'flux:group:party:nonexistent' as GroupURN<GroupType.PARTY>;

      expect(() => partyApi.getGroup(nonExistentId)).toThrow('Group not found: flux:group:party:nonexistent');
    });
  });

  describe('isGroupMember', () => {
    it('should return false for non-members', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:test123' as ActorURN;

      expect(partyApi.isGroupMember(party, actorId)).toBe(false);
    });

    it('should return true for members', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:test123' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      expect(partyApi.isGroupMember(party, actorId)).toBe(true);
    });
  });

  describe('addGroupMember', () => {
    it('should add a member to an empty group', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:test123' as ActorURN;

      partyApi.addGroupMember(party, actorId);

      expect(party.members[actorId]).toBe(1);
      expect(party.size).toBe(1);
      expect(partyApi.isGroupMember(party, actorId)).toBe(true);
    });

    it('should add multiple members', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actor1 = 'flux:actor:test1' as ActorURN;
      const actor2 = 'flux:actor:test2' as ActorURN;

      partyApi.addGroupMember(party, actor1);
      partyApi.addGroupMember(party, actor2);

      expect(party.size).toBe(2);
      expect(partyApi.isGroupMember(party, actor1)).toBe(true);
      expect(partyApi.isGroupMember(party, actor2)).toBe(true);
    });

    it('should not add duplicate members', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:test123' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      partyApi.addGroupMember(party, actorId); // Add same member again

      expect(party.size).toBe(1);
      expect(party.members[actorId]).toBe(1);
    });


    it('should add multiple members to any group type without size restrictions', () => {
      const faction = factionApi.createGroup((defaults) => defaults);

      // Add several members - generic API has no size limits
      for (let i = 0; i < 10; i++) {
        factionApi.addGroupMember(faction, `flux:actor:test${i}` as ActorURN);
      }

      expect(faction.size).toBe(10);
    });
  });

  describe('removeGroupMember', () => {
    it('should remove an existing member when they are not the owner', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const owner = 'flux:actor:owner' as ActorURN;
      const member = 'flux:actor:member' as ActorURN;

      // Add owner first, then member
      partyApi.addGroupMember(party, owner);
      partyApi.addGroupMember(party, member);
      expect(party.size).toBe(2);
      expect(party.owner).toBe(owner); // First member becomes owner

      // Remove the non-owner member
      partyApi.removeGroupMember(party, member);
      expect(party.size).toBe(1);
      expect(partyApi.isGroupMember(party, member)).toBe(false);
      expect(party.members[member]).toBeUndefined();
      expect(party.owner).toBe(owner); // Owner should remain
    });

    it('should handle removing non-existent members gracefully', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:nonexistent' as ActorURN;

      // Should not throw
      partyApi.removeGroupMember(party, actorId);
      expect(party.size).toBe(0);
    });

    it('should prevent removing the owner', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const ownerId = 'flux:actor:owner' as ActorURN;
      const memberId = 'flux:actor:member' as ActorURN;

      partyApi.addGroupMember(party, ownerId);
      partyApi.addGroupMember(party, memberId);
      partyApi.setGroupLeader(party, ownerId);

      expect(() => {
        partyApi.removeGroupMember(party, ownerId);
      }).toThrow(`Cannot remove owner from group ${party.id}`);

      // Should still be able to remove non-owner members
      partyApi.removeGroupMember(party, memberId);
      expect(party.size).toBe(1);
      expect(partyApi.isGroupMember(party, memberId)).toBe(false);
    });
  });

  describe('setGroupLeader', () => {
    it('should set a member as leader', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:leader' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      partyApi.setGroupLeader(party, actorId);

      expect(party.owner).toBe(actorId);
    });

    it('should throw error when setting non-member as leader', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const nonMemberId = 'flux:actor:nonmember' as ActorURN;

      expect(() => {
        partyApi.setGroupLeader(party, nonMemberId);
      }).toThrow(`Member ${nonMemberId} is not a member of group ${party.id}`);
    });

    it('should handle setting same leader twice gracefully', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actorId = 'flux:actor:leader' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      partyApi.setGroupLeader(party, actorId);

      // Setting same leader again should not throw
      partyApi.setGroupLeader(party, actorId);
      expect(party.owner).toBe(actorId);
    });

    it('should change leadership between members', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const leader1 = 'flux:actor:leader1' as ActorURN;
      const leader2 = 'flux:actor:leader2' as ActorURN;

      partyApi.addGroupMember(party, leader1);
      partyApi.addGroupMember(party, leader2);

      partyApi.setGroupLeader(party, leader1);
      expect(party.owner).toBe(leader1);

      partyApi.setGroupLeader(party, leader2);
      expect(party.owner).toBe(leader2);
    });
  });

  describe('areInSameGroup', () => {
    it('should return true for the same group', () => {
      const party = partyApi.createGroup((defaults) => defaults);

      expect(partyApi.areInSameGroup(party, party)).toBe(true);
    });

    it('should return false for different groups', () => {
      const party1 = partyApi.createGroup((defaults) => ({ ...defaults, name: 'Party 1' }));
      const party2 = partyApi.createGroup((defaults) => ({ ...defaults, name: 'Party 2' }));

      expect(partyApi.areInSameGroup(party1, party2)).toBe(false);
    });
  });

  describe('refreshGroup', () => {
    it('should recalculate group size correctly', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      const actor1 = 'flux:actor:test1' as ActorURN;
      const actor2 = 'flux:actor:test2' as ActorURN;

      // Manually manipulate members to test refresh
      party.members[actor1] = 1;
      party.members[actor2] = 1;
      party.size = 999; // Wrong size

      partyApi.refreshGroup(party);
      expect(party.size).toBe(2);
    });

    it('should handle empty groups', () => {
      const party = partyApi.createGroup((defaults) => defaults);
      party.size = 999; // Wrong size

      partyApi.refreshGroup(party);
      expect(party.size).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete party lifecycle', () => {
      // Create party
      const party = partyApi.createGroup((defaults) => ({
        ...defaults,
        name: 'Adventure Party',
      }));

      // Add members
      const leader = 'flux:actor:leader' as ActorURN;
      const member1 = 'flux:actor:member1' as ActorURN;
      const member2 = 'flux:actor:member2' as ActorURN;

      partyApi.addGroupMember(party, leader);
      partyApi.addGroupMember(party, member1);
      partyApi.addGroupMember(party, member2);

      expect(party.size).toBe(3);

      // Set leader
      partyApi.setGroupLeader(party, leader);
      expect(party.owner).toBe(leader);

      // Remove non-leader member
      partyApi.removeGroupMember(party, member1);
      expect(party.size).toBe(2);
      expect(partyApi.isGroupMember(party, member1)).toBe(false);

      // Verify final state
      expect(partyApi.isGroupMember(party, leader)).toBe(true);
      expect(partyApi.isGroupMember(party, member2)).toBe(true);
      expect(party.owner).toBe(leader);
    });

    it('should work with different group types independently', () => {
      const party = partyApi.createGroup((defaults) => ({ ...defaults, name: 'Party' }));
      const faction = factionApi.createGroup((defaults) => ({ ...defaults, name: 'Faction' }));

      const actor = 'flux:actor:test' as ActorURN;

      partyApi.addGroupMember(party, actor);
      factionApi.addGroupMember(faction, actor);

      expect(party.size).toBe(1);
      expect(faction.size).toBe(1);
      expect(partyApi.isGroupMember(party, actor)).toBe(true);
      expect(factionApi.isGroupMember(faction, actor)).toBe(true);
      expect(partyApi.areInSameGroup(party, faction as any)).toBe(false);
    });
  });
});

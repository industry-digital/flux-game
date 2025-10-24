import { describe, it, expect, beforeEach } from 'vitest';
import { createGroupApi, GroupApiContext } from '.';
import { GroupType } from '~/types/entity/group';
import { ActorURN, GroupURN } from '~/types/taxonomy';
import { createTransformerContext } from '~/worldkit/context';
import { GroupFactoryDependencies, Transform } from '../factory';

describe('Group API', () => {
  let context: GroupApiContext;
  let partyApi: ReturnType<typeof createGroupApi<GroupType.PARTY, ActorURN>>;
  let factionApi: ReturnType<typeof createGroupApi<GroupType.FACTION, ActorURN>>;
  let mockTimestamp: number;

  beforeEach(() => {
    context = createTransformerContext();
    mockTimestamp = 1000000; // Start at a fixed time
    let groupCounter = 0;

    const mockDeps: GroupFactoryDependencies<any> = {
      generateGroupId: (groupType: any) => `flux:group:${groupType}:test${++groupCounter}`,
      timestamp: () => mockTimestamp,
    };

    partyApi = createGroupApi<GroupType.PARTY, ActorURN>(
      GroupType.PARTY,
      context,
      { invitationTimeout: 60000 }, // 1 minute timeout
      mockDeps
    );
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
      expect(party.invitations).toEqual({});
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
      expect(faction.invitations).toEqual({});
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
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:test123' as ActorURN;

      expect(partyApi.isGroupMember(party, actorId)).toBe(false);
    });

    it('should return true for members', () => {
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:test123' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      expect(partyApi.isGroupMember(party, actorId)).toBe(true);
    });
  });

  describe('addGroupMember', () => {
    it('should add a member to an empty group', () => {
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:test123' as ActorURN;

      partyApi.addGroupMember(party, actorId);

      expect(party.members[actorId]).toBe(1);
      expect(party.size).toBe(1);
      expect(partyApi.isGroupMember(party, actorId)).toBe(true);
    });

    it('should add multiple members', () => {
      const party = partyApi.createGroup();
      const actor1 = 'flux:actor:test1' as ActorURN;
      const actor2 = 'flux:actor:test2' as ActorURN;

      partyApi.addGroupMember(party, actor1);
      partyApi.addGroupMember(party, actor2);

      expect(party.size).toBe(2);
      expect(partyApi.isGroupMember(party, actor1)).toBe(true);
      expect(partyApi.isGroupMember(party, actor2)).toBe(true);
    });

    it('should not add duplicate members', () => {
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:test123' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      partyApi.addGroupMember(party, actorId); // Add same member again

      expect(party.size).toBe(1);
      expect(party.members[actorId]).toBe(1);
    });


    it('should add multiple members to any group type without size restrictions', () => {
      const faction = factionApi.createGroup();

      // Add several members - generic API has no size limits
      for (let i = 0; i < 10; i++) {
        factionApi.addGroupMember(faction, `flux:actor:test${i}` as ActorURN);
      }

      expect(faction.size).toBe(10);
    });
  });

  describe('removeGroupMember', () => {
    it('should remove an existing member when they are not the owner', () => {
      const party = partyApi.createGroup();
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
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:nonexistent' as ActorURN;

      // Should not throw
      partyApi.removeGroupMember(party, actorId);
      expect(party.size).toBe(0);
    });

    it('should prevent removing the owner', () => {
      const party = partyApi.createGroup();
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
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:leader' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      partyApi.setGroupLeader(party, actorId);

      expect(party.owner).toBe(actorId);
    });

    it('should throw error when setting non-member as leader', () => {
      const party = partyApi.createGroup();
      const nonMemberId = 'flux:actor:nonmember' as ActorURN;

      expect(() => {
        partyApi.setGroupLeader(party, nonMemberId);
      }).toThrow(`Member ${nonMemberId} is not a member of group ${party.id}`);
    });

    it('should handle setting same leader twice gracefully', () => {
      const party = partyApi.createGroup();
      const actorId = 'flux:actor:leader' as ActorURN;

      partyApi.addGroupMember(party, actorId);
      partyApi.setGroupLeader(party, actorId);

      // Setting same leader again should not throw
      partyApi.setGroupLeader(party, actorId);
      expect(party.owner).toBe(actorId);
    });

    it('should change leadership between members', () => {
      const party = partyApi.createGroup();
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
      const party = partyApi.createGroup();

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
      const party = partyApi.createGroup();
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
      const party = partyApi.createGroup();
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

  describe('invitation system', () => {
    describe('inviteToGroup', () => {
      it('should invite a new actor to the group', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);

        expect(partyApi.isInvited(party, actorId)).toBe(true);
        expect(party.invitations[actorId]).toBeTypeOf('number');
        expect(partyApi.isGroupMember(party, actorId)).toBe(false);
      });

      it('should not invite someone who is already a member', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:member' as ActorURN;

        partyApi.addGroupMember(party, actorId);

        expect(() => {
          partyApi.inviteToGroup(party, actorId);
        }).toThrow(`${actorId} is already a member of group ${party.id}`);
      });

      it('should be idempotent when inviting same actor multiple times', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);
        const firstTimestamp = party.invitations[actorId];

        partyApi.inviteToGroup(party, actorId); // Second invitation
        const secondTimestamp = party.invitations[actorId];

        expect(firstTimestamp).toBe(secondTimestamp);
        expect(Object.keys(party.invitations)).toHaveLength(1);
      });
    });

    describe('acceptInvitation', () => {
      it('should accept invitation and add actor as member', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);
        partyApi.acceptInvitation(party, actorId);

        expect(partyApi.isGroupMember(party, actorId)).toBe(true);
        expect(partyApi.isInvited(party, actorId)).toBe(false);
        expect(party.size).toBe(1);
        expect(party.invitations[actorId]).toBeUndefined();
      });

      it('should throw error when accepting non-existent invitation', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:uninvited' as ActorURN;

        expect(() => {
          partyApi.acceptInvitation(party, actorId);
        }).toThrow(`No pending invitation for ${actorId} to group ${party.id}`);
      });

      it('should set first member as owner when accepting invitation', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);
        partyApi.acceptInvitation(party, actorId);

        expect(party.owner).toBe(actorId);
      });
    });

    describe('rejectInvitation', () => {
      it('should reject invitation and remove from invitations', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);
        partyApi.rejectInvitation(party, actorId);

        expect(partyApi.isInvited(party, actorId)).toBe(false);
        expect(partyApi.isGroupMember(party, actorId)).toBe(false);
        expect(party.invitations[actorId]).toBeUndefined();
      });

      it('should throw error when rejecting non-existent invitation', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:uninvited' as ActorURN;

        expect(() => {
          partyApi.rejectInvitation(party, actorId);
        }).toThrow(`No pending invitation for ${actorId} to group ${party.id}`);
      });
    });

    describe('isInvited', () => {
      it('should return true for invited actors', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);

        expect(partyApi.isInvited(party, actorId)).toBe(true);
      });

      it('should return false for non-invited actors', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:uninvited' as ActorURN;

        expect(partyApi.isInvited(party, actorId)).toBe(false);
      });

      it('should return false after invitation is accepted', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        partyApi.inviteToGroup(party, actorId);
        partyApi.acceptInvitation(party, actorId);

        expect(partyApi.isInvited(party, actorId)).toBe(false);
      });
    });

    describe('getInvitations', () => {
      it('should return copy of invitations', () => {
        const party = partyApi.createGroup();
        const actor1 = 'flux:actor:invitee1' as ActorURN;
        const actor2 = 'flux:actor:invitee2' as ActorURN;

        partyApi.inviteToGroup(party, actor1);
        partyApi.inviteToGroup(party, actor2);

        const invitations = partyApi.getInvitations(party);

        expect(invitations).toEqual(party.invitations);
        expect(invitations).toBe(party.invitations); // Should be the same reference
        expect(Object.keys(invitations)).toHaveLength(2);
      });

      it('should return empty object for group with no invitations', () => {
        const party = partyApi.createGroup();

        const invitations = partyApi.getInvitations(party);

        expect(invitations).toEqual({});
      });
    });

    describe('invitation workflow integration', () => {
      it('should handle complete invitation lifecycle', () => {
        const party = partyApi.createGroup((defaults) => ({ ...defaults, name: 'Test Party' }));
        const leader = 'flux:actor:leader' as ActorURN;
        const invitee1 = 'flux:actor:invitee1' as ActorURN;
        const invitee2 = 'flux:actor:invitee2' as ActorURN;

        // Add leader first
        partyApi.addGroupMember(party, leader);
        expect(party.owner).toBe(leader);

        // Invite two actors
        partyApi.inviteToGroup(party, invitee1);
        partyApi.inviteToGroup(party, invitee2);
        expect(Object.keys(party.invitations)).toHaveLength(2);

        // One accepts, one rejects
        partyApi.acceptInvitation(party, invitee1);
        partyApi.rejectInvitation(party, invitee2);

        // Verify final state
        expect(party.size).toBe(2);
        expect(partyApi.isGroupMember(party, leader)).toBe(true);
        expect(partyApi.isGroupMember(party, invitee1)).toBe(true);
        expect(partyApi.isGroupMember(party, invitee2)).toBe(false);
        expect(Object.keys(party.invitations)).toHaveLength(0);
        expect(party.owner).toBe(leader); // Leader should remain owner
      });

      it('should prevent inviting members of the same group', () => {
        const party = partyApi.createGroup();
        const actor1 = 'flux:actor:member1' as ActorURN;
        const actor2 = 'flux:actor:member2' as ActorURN;

        partyApi.addGroupMember(party, actor1);
        partyApi.addGroupMember(party, actor2);

        expect(() => {
          partyApi.inviteToGroup(party, actor1);
        }).toThrow(`${actor1} is already a member of group ${party.id}`);
      });
    });

    describe('invitation timeout', () => {
      const advanceTime = (milliseconds: number) => {
        mockTimestamp += milliseconds;
      };

      it('should expire invitations after timeout period', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        // Send invitation
        partyApi.inviteToGroup(party, actorId);
        expect(partyApi.isInvited(party, actorId)).toBe(true);

        // Advance time past timeout (60000ms)
        advanceTime(70000);

        // Invitation should now be expired
        expect(partyApi.isInvited(party, actorId)).toBe(false);
        expect(Object.keys(party.invitations)).toHaveLength(0);
      });

      it('should not expire invitations within timeout period', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        // Send invitation
        partyApi.inviteToGroup(party, actorId);
        expect(partyApi.isInvited(party, actorId)).toBe(true);

        // Advance time but stay within timeout (60000ms)
        advanceTime(30000);

        // Invitation should still be valid
        expect(partyApi.isInvited(party, actorId)).toBe(true);
        expect(Object.keys(party.invitations)).toHaveLength(1);
      });

      it('should clean up expired invitations when getting invitations', () => {
        const party = partyApi.createGroup();
        const actor1 = 'flux:actor:invitee1' as ActorURN;
        const actor2 = 'flux:actor:invitee2' as ActorURN;

        // Send two invitations
        partyApi.inviteToGroup(party, actor1);
        advanceTime(30000); // Advance time between invitations
        partyApi.inviteToGroup(party, actor2);

        expect(Object.keys(party.invitations)).toHaveLength(2);

        // Advance time to expire first invitation but not second
        advanceTime(40000); // Total: 70000ms for actor1, 40000ms for actor2

        const invitations = partyApi.getInvitations(party);
        expect(Object.keys(invitations)).toHaveLength(1);
        expect(invitations[actor2]).toBeDefined();
        expect(invitations[actor1]).toBeUndefined();
      });

      it('should prevent accepting expired invitations', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        // Send invitation
        partyApi.inviteToGroup(party, actorId);

        // Advance time past timeout
        advanceTime(70000);

        // Should not be able to accept expired invitation
        expect(() => {
          partyApi.acceptInvitation(party, actorId);
        }).toThrow(`No pending invitation for ${actorId} to group ${party.id}`);
      });

      it('should prevent rejecting expired invitations', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        // Send invitation
        partyApi.inviteToGroup(party, actorId);

        // Advance time past timeout
        advanceTime(70000);

        // Should not be able to reject expired invitation
        expect(() => {
          partyApi.rejectInvitation(party, actorId);
        }).toThrow(`No pending invitation for ${actorId} to group ${party.id}`);
      });

      it('should allow manual cleanup of expired invitations', () => {
        const party = partyApi.createGroup();
        const actor1 = 'flux:actor:invitee1' as ActorURN;
        const actor2 = 'flux:actor:invitee2' as ActorURN;

        // Send invitations at different times
        partyApi.inviteToGroup(party, actor1);
        advanceTime(30000);
        partyApi.inviteToGroup(party, actor2);

        // Advance time to expire first invitation
        advanceTime(40000);

        // Before cleanup - both invitations exist in raw data
        expect(Object.keys(party.invitations)).toHaveLength(2);

        // Manual cleanup
        partyApi.cleanupExpiredInvitations(party);

        // After cleanup - only valid invitation remains
        expect(Object.keys(party.invitations)).toHaveLength(1);
        expect(party.invitations[actor2]).toBeDefined();
        expect(party.invitations[actor1]).toBeUndefined();
      });

      it('should refresh invitation timestamp when re-inviting', () => {
        const party = partyApi.createGroup();
        const actorId = 'flux:actor:invitee' as ActorURN;

        // Send initial invitation
        partyApi.inviteToGroup(party, actorId);
        const firstTimestamp = party.invitations[actorId];

        // Advance time
        advanceTime(30000);

        // Re-invite (should refresh timestamp)
        partyApi.inviteToGroup(party, actorId);
        const secondTimestamp = party.invitations[actorId];

        expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
        expect(secondTimestamp - firstTimestamp).toBe(30000);
      });
    });
  });
});

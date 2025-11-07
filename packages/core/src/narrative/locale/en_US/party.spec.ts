import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerContext } from '~/worldkit/context';
import { ActorURN } from '~/types/taxonomy';
import { ActorDidCreateParty } from '~/types/event';
import { ALICE_ID, BOB_ID, CHARLIE_ID, DEFAULT_PARTY_ID } from '~/testing/constants';
import { Gender } from '~/types/entity/actor';
import { PartyLeaveReason } from '~/types/party';
import { createActor } from '~/worldkit/entity/actor';
import {
  withObjectSerializationValidation,
  withDebuggingArtifactValidation,
  withNonEmptyValidation,
  withNarrativeQuality,
  withComposedValidation,
} from '~/testing/narrative-quality';

// Import party event factory functions
import {
  createActorDidCreatePartyEvent,
  createActorDidDisbandPartyEvent,
  createActorDidIssuePartyInvitationEvent,
  createActorDidReceivePartyInvitationEvent,
  createActorDidAcceptPartyInvitationEvent,
  createActorDidRejectPartyInvitationEvent,
  createActorDidJoinPartyEvent,
  createActorDidLeavePartyEvent,
  createActorDidInspectPartyEvent,
} from '~/testing/event/factory/party';

// Import the specific narrative functions we're testing
import {
  narrateActorDidCreateParty,
  narrateActorDidDisbandParty,
  narrateActorDidIssuePartyInvitation,
  narrateActorDidReceivePartyInvitation,
  narrateActorDidAcceptPartyInvitation,
  narrateActorDidRejectPartyInvitation,
  narrateActorDidJoinParty,
  narrateActorDidLeaveParty,
  narrateActorDidInspectParty,
} from './party';
import { Party } from '~/types/entity/group';

const OBSERVER_ID: ActorURN = 'flux:actor:test:observer';
const DAVID_ID: ActorURN = 'flux:actor:test:david';

describe('English Party Narratives - Snapshot Tests', () => {
  let context: ReturnType<typeof createTransformerContext>;

  beforeEach(() => {
    context = createTransformerContext();

    // Create test actors
    const alice = createActor({ id: ALICE_ID, name: 'Alice', gender: Gender.FEMALE });
    const bob = createActor({ id: BOB_ID, name: 'Bob', gender: Gender.MALE });
    const charlie = createActor({ id: CHARLIE_ID, name: 'Charlie', gender: Gender.MALE });
    const observer = createActor({ id: OBSERVER_ID, name: 'Observer', gender: Gender.FEMALE });
    const david = createActor({ id: DAVID_ID, name: 'David', gender: Gender.MALE });

    context.world.actors[ALICE_ID] = alice;
    context.world.actors[BOB_ID] = bob;
    context.world.actors[CHARLIE_ID] = charlie;
    context.world.actors[OBSERVER_ID] = observer;
    context.world.actors[DAVID_ID] = david;

    const testParty = context.partyApi.createParty(ALICE_ID, (party) => ({
      ...party,
      id: DEFAULT_PARTY_ID,
      owner: ALICE_ID,
    }));

    context.partyApi.addPartyMember(testParty, ALICE_ID);
    context.partyApi.addPartyMember(testParty, BOB_ID);

    context.world.groups[testParty.id] = testParty;
  });

  describe('narrateActorDidCreateParty', () => {
    it('should render exact party creation from creator perspective', () => {
      const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidCreateParty(context, event, ALICE_ID);
      expect(narrative).toBe('You form a new party.');
    });

    it('should render empty string from observer perspective', () => {
      const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should render empty string from observer perspective with different actor names', () => {
      const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: BOB_ID }));
      const narrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });
  });

  describe('narrateActorDidDisbandParty', () => {
    it('should render exact party disbanding from leader perspective', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidDisbandParty(context, event, ALICE_ID);
      expect(narrative).toBe('You have disbanded the party.');
    });

    it('should render exact party disbanding from observer perspective', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidDisbandParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice has disbanded the party.');
    });

    it('should render exact party disbanding with different actor names', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({ ...e, actor: CHARLIE_ID }));
      const narrative = narrateActorDidDisbandParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Charlie has disbanded the party.');
    });
  });

  describe('narrateActorDidIssuePartyInvitation', () => {
    it('should render exact invitation from inviter perspective', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, ALICE_ID);
      expect(narrative).toBe('You have invited Bob to join your party.');
    });

    it('should render empty string from invitee perspective', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should render empty string from observer perspective', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should render empty string from observer perspective with different actor names', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: CHARLIE_ID,
        payload: {
          ...e.payload,
          inviteeId: DAVID_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });
  });

  describe('narrateActorDidReceivePartyInvitation', () => {
    it('should render exact invitation receipt from invitee perspective', () => {
      const event = createActorDidReceivePartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidReceivePartyInvitation(context, event, BOB_ID);
      expect(narrative).toBe('Alice has invited you to join her party.\nTo accept: `party accept alice`\nTo reject: `party reject alice`');
    });

    it('should render empty string from inviter perspective', () => {
      const event = createActorDidReceivePartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidReceivePartyInvitation(context, event, ALICE_ID);
      expect(narrative).toBe('');
    });

    it('should render empty string from observer perspective', () => {
      const event = createActorDidReceivePartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidReceivePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });
  });

  describe('narrateActorDidAcceptPartyInvitation', () => {
    it('should render exact invitation acceptance from accepter perspective', () => {
      const event = createActorDidAcceptPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidAcceptPartyInvitation(context, event, BOB_ID);
      expect(narrative).toBe('You have accepted Alice\'s party invitation.\n');
    });

    it('should render exact invitation acceptance from inviter perspective', () => {
      const event = createActorDidAcceptPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidAcceptPartyInvitation(context, event, ALICE_ID);
      expect(narrative).toBe('Bob has accepted your party invitation.\n');
    });

    it('should render exact invitation acceptance from observer perspective', () => {
      const event = createActorDidAcceptPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidAcceptPartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });
  });

  describe('narrateActorDidRejectPartyInvitation', () => {
    it('should render exact invitation rejection from rejecter perspective', () => {
      const event = createActorDidRejectPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidRejectPartyInvitation(context, event, BOB_ID);
      expect(narrative).toBe('You have rejected Alice\'s party invitation.');
    });

    it('should render exact invitation rejection from inviter perspective', () => {
      const event = createActorDidRejectPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidRejectPartyInvitation(context, event, ALICE_ID);
      expect(narrative).toBe('Bob has rejected your party invitation.');
    });

    it('should render exact invitation rejection from observer perspective', () => {
      const event = createActorDidRejectPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          inviterId: ALICE_ID,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidRejectPartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });
  });

  describe('narrateActorDidJoinParty', () => {
    it('should render exact party joining from joiner perspective', () => {
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidJoinParty(context, event, BOB_ID);
      expect(narrative).toBe('You have joined Alice\'s party.\nTo list party members: `party list`\nTo leave the party: `party leave`');
    });

    it('should render exact party joining from observer perspective', () => {
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidJoinParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob has joined the party.');
    });

    it('should render exact party joining with different actor names', () => {
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: CHARLIE_ID,
      }));

      const narrative = narrateActorDidJoinParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Charlie has joined the party.');
    });
  });

  describe('narrateActorDidLeaveParty', () => {
    it('should render exact voluntary party leaving from leaver perspective', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.VOLUNTARY,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, BOB_ID);
      expect(narrative).toBe('You have left the party.');
    });

    it('should render exact kicked from party from leaver perspective', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.KICKED,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, BOB_ID);
      expect(narrative).toBe('You were removed from the party.');
    });

    it('should render exact disbanded party removal from leaver perspective', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.DISBANDED,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, BOB_ID);
      expect(narrative).toBe('You are no longer in a party.');
    });

    it('should render exact voluntary leaving from observer perspective', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.VOLUNTARY,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob has left the party.');
    });

    it('should render exact kicked from observer perspective', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.KICKED,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob was removed from the party.');
    });

    it('should render exact leaving with ownership transfer', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.VOLUNTARY,
          newOwner: BOB_ID,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice has left the party.\nBob is the new party leader.');
    });

    it('should not show ownership transfer to the leaving actor', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.VOLUNTARY,
          newOwner: BOB_ID,
        },
      }));

      const narrative = narrateActorDidLeaveParty(context, event, ALICE_ID);
      expect(narrative).toBe('You have left the party.');
    });
  });

  describe('narrateActorDidInspectParty', () => {
    it('should render party members list with owner marked by star and recipient marked as you', () => {
      const event = createActorDidInspectPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('★ Alice (you)\n  Bob\nInvitations:\nNo pending invitations.');
    });

    it('should render party members list from non-member perspective', () => {
      const event = createActorDidInspectPartyEvent((e) => ({ ...e, actor: BOB_ID }));
      const narrative = narrateActorDidInspectParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('★ Alice\n  Bob');
    });

    it('should show invitations to party owner only', () => {
      // Add some invitations to the party
      const party = context.world.groups[DEFAULT_PARTY_ID] as Party;
      party.invitations = {
        [CHARLIE_ID]: Date.now() - 5000, // 5 seconds ago
        [DAVID_ID]: Date.now() - 10000,  // 10 seconds ago
      };

      const event = createActorDidInspectPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toContain('★ Alice (you)\n  Bob');
      expect(narrative).toContain('Invitations:');
      expect(narrative).toContain('Charlie');
      expect(narrative).toContain('David');
    });

    it('should not show invitations to non-owner', () => {
      // Add some invitations to the party
      const party = context.world.groups[DEFAULT_PARTY_ID] as Party;
      party.invitations = {
        [CHARLIE_ID]: Date.now() - 5000,
      };

      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidInspectParty(context, event, BOB_ID);
      expect(narrative).toBe('★ Alice\n  Bob (you)');
      expect(narrative).not.toContain('Invitations:');
    });

    it('should handle party with single member', () => {
      // Create a party with only Alice
      const singleMemberParty = context.partyApi.createParty(ALICE_ID, (party) => ({
        ...party,
        id: 'flux:group:party:test:single' as any,
        members: { [ALICE_ID]: 1 },
      }));
      context.world.groups[singleMemberParty.id] = singleMemberParty;

      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        payload: {
          ...e.payload,
          partyId: singleMemberParty.id,
        },
      }));

      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('★ Alice (you)\nInvitations:\nNo pending invitations.');
    });

    it('should handle missing members gracefully', () => {
      // Create a party with a non-existent member
      const testParty = context.partyApi.createParty(ALICE_ID, (party) => ({
        ...party,
        id: 'flux:group:party:test:missing' as any,
        owner: ALICE_ID,
        members: {
          [ALICE_ID]: 1,
          ['flux:actor:nonexistent' as ActorURN]: 1
        },
      }));

      context.world.groups[testParty.id] = testParty;

      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        payload: {
          ...e.payload,
          partyId: testParty.id,
        },
      }));

      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('★ Alice (you)\nInvitations:\nNo pending invitations.');
    });
  });

  describe('Error handling', () => {
    it('should return empty string for missing actor in create party', () => {
      const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in disband party', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidDisbandParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in issue invitation', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing invitee in issue invitation', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          inviteeId: 'flux:actor:nonexistent' as ActorURN,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in join party', () => {
      const event = createActorDidJoinPartyEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidJoinParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in leave party', () => {
      const event = createActorDidLeavePartyEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidLeaveParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing party in inspect party', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          partyId: 'flux:group:party:nonexistent',
        },
      }));

      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('');
    });
  });

  describe('Narrative Quality Validation', () => {
    describe('narrateActorDidCreateParty - Quality validation', () => {
      it('should not contain [object Object] in party creation narratives', () => {
        const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withObjectSerializationValidation(narrateActorDidCreateParty, context, event, perspective)();
        });
      });

      it('should pass comprehensive quality validation', () => {
        const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
        withNarrativeQuality(narrateActorDidCreateParty, context, event, OBSERVER_ID)();
      });

      it('should generate different narratives for different perspectives', () => {
        const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
        // Only test the actor perspective since observer returns empty string
        const actorNarrative = narrateActorDidCreateParty(context, event, ALICE_ID);
        const observerNarrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
        expect(actorNarrative).toBeTruthy();
        expect(observerNarrative).toBe('');
        expect(actorNarrative).not.toBe(observerNarrative);
      });
    });

    describe('narrateActorDidIssuePartyInvitation - Quality validation', () => {
      it('should pass quality validation for invitation narratives', () => {
        const event = createActorDidIssuePartyInvitationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            inviteeId: BOB_ID,
          },
        }));

        const perspectives = [ALICE_ID, BOB_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidIssuePartyInvitation, context, event, perspective)();
        });
      });

      it('should generate different narratives for different perspectives', () => {
        const event = createActorDidIssuePartyInvitationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            inviteeId: BOB_ID,
          },
        }));

        // Only inviter gets narrative, others get empty string
        const inviterNarrative = narrateActorDidIssuePartyInvitation(context, event, ALICE_ID);
        const inviteeNarrative = narrateActorDidIssuePartyInvitation(context, event, BOB_ID);
        const observerNarrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
        expect(inviterNarrative).toBeTruthy();
        expect(inviteeNarrative).toBe('');
        expect(observerNarrative).toBe('');
      });
    });

    describe('narrateActorDidLeaveParty - Quality validation', () => {
      it('should pass quality validation for different leave reasons', () => {
        const reasons = [PartyLeaveReason.VOLUNTARY, PartyLeaveReason.KICKED, PartyLeaveReason.DISBANDED];

        reasons.forEach(reason => {
          const event = createActorDidLeavePartyEvent((e) => ({
            ...e,
            actor: BOB_ID,
            payload: {
              ...e.payload,
              reason,
            },
          }));

          const perspectives = [BOB_ID, OBSERVER_ID];
          perspectives.forEach(perspective => {
            withNarrativeQuality(narrateActorDidLeaveParty, context, event, perspective)();
          });
        });
      });
    });

    describe('narrateActorDidInspectParty - Quality validation', () => {
      it('should pass quality validation for party inspection narratives', () => {
        const event = createActorDidInspectPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidInspectParty, context, event, perspective)();
        });
      });
    });

    describe('Composed quality validation', () => {
      it('should pass all quality checks with composed validators', () => {
        const event = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
        // Demonstrate composition of validators
        const composedValidator = withComposedValidation<ActorDidCreateParty>(
          withObjectSerializationValidation,
          withDebuggingArtifactValidation,
          withNonEmptyValidation
        );

        composedValidator(narrateActorDidCreateParty, context, event, ALICE_ID)();
      });

      it('should validate perspective differentiation across all party narrative functions', () => {
        const createEvent = createActorDidCreatePartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        // Test create party - only actor gets narrative
        const createActorNarrative = narrateActorDidCreateParty(context, createEvent, ALICE_ID);
        const createObserverNarrative = narrateActorDidCreateParty(context, createEvent, OBSERVER_ID);
        expect(createActorNarrative).toBeTruthy();
        expect(createObserverNarrative).toBe('');

        const inviteEvent = createActorDidIssuePartyInvitationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            inviteeId: BOB_ID,
          },
        }));

        // Test invite - only inviter gets narrative
        const inviteInviterNarrative = narrateActorDidIssuePartyInvitation(context, inviteEvent, ALICE_ID);
        const inviteInviteeNarrative = narrateActorDidIssuePartyInvitation(context, inviteEvent, BOB_ID);
        const inviteObserverNarrative = narrateActorDidIssuePartyInvitation(context, inviteEvent, OBSERVER_ID);
        expect(inviteInviterNarrative).toBeTruthy();
        expect(inviteInviteeNarrative).toBe('');
        expect(inviteObserverNarrative).toBe('');

        const joinEvent = createActorDidJoinPartyEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        // Test join - both joiner and observer get narratives
        const joinJoinerNarrative = narrateActorDidJoinParty(context, joinEvent, BOB_ID);
        const joinObserverNarrative = narrateActorDidJoinParty(context, joinEvent, OBSERVER_ID);
        expect(joinJoinerNarrative).toBeTruthy();
        expect(joinObserverNarrative).toBeTruthy();
        expect(joinJoinerNarrative).not.toBe(joinObserverNarrative);
      });
    });
  });

  describe('Party Narrative Mood Board', () => {
    it('should generate a comprehensive mood board of all party narratives', () => {
      console.log('\n' + '='.repeat(80));
      console.log('🎉 PARTY NARRATIVE MOOD BOARD');
      console.log('='.repeat(80));

      // Party Lifecycle
      console.log('\n🏗️  PARTY LIFECYCLE');
      console.log('-'.repeat(40));

      const createEvent = createActorDidCreatePartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      console.log('🆕 Party Creation (Self):', narrateActorDidCreateParty(context, createEvent, ALICE_ID));
      console.log('👁️  Party Creation (Observer):', narrateActorDidCreateParty(context, createEvent, OBSERVER_ID) || '(empty - private action)');

      const disbandEvent = createActorDidDisbandPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      console.log('💥 Party Disband (Self):', narrateActorDidDisbandParty(context, disbandEvent, ALICE_ID));
      console.log('👁️  Party Disband (Observer):', narrateActorDidDisbandParty(context, disbandEvent, OBSERVER_ID));

      // Invitation Flow
      console.log('\n📨 INVITATION SYSTEM');
      console.log('-'.repeat(40));

      const issueInviteEvent = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: { ...e.payload, inviteeId: BOB_ID },
      }));
      console.log('📤 Issue Invitation (Inviter):', narrateActorDidIssuePartyInvitation(context, issueInviteEvent, ALICE_ID));
      console.log('👁️  Issue Invitation (Invitee):', narrateActorDidIssuePartyInvitation(context, issueInviteEvent, BOB_ID) || '(empty - private action)');
      console.log('👁️  Issue Invitation (Observer):', narrateActorDidIssuePartyInvitation(context, issueInviteEvent, OBSERVER_ID) || '(empty - private action)');

      const receiveInviteEvent = createActorDidReceivePartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: { ...e.payload, inviterId: ALICE_ID, inviteeId: BOB_ID },
      }));
      console.log('📥 Receive Invitation (Invitee):\n' + narrateActorDidReceivePartyInvitation(context, receiveInviteEvent, BOB_ID).split('\n').map(line => '    ' + line).join('\n'));
      console.log('👁️  Receive Invitation (Inviter):', narrateActorDidReceivePartyInvitation(context, receiveInviteEvent, ALICE_ID) || '(empty - private action)');

      // Invitation Responses
      console.log('\n✅ INVITATION RESPONSES');
      console.log('-'.repeat(40));

      const acceptEvent = createActorDidAcceptPartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: { ...e.payload, inviterId: ALICE_ID, inviteeId: BOB_ID },
      }));
      console.log('✅ Accept Invitation (Accepter):', narrateActorDidAcceptPartyInvitation(context, acceptEvent, BOB_ID));
      console.log('👁️  Accept Invitation (Inviter):', narrateActorDidAcceptPartyInvitation(context, acceptEvent, ALICE_ID));
      console.log('👁️  Accept Invitation (Observer):', narrateActorDidAcceptPartyInvitation(context, acceptEvent, OBSERVER_ID) || '(empty - private action)');

      const rejectEvent = createActorDidRejectPartyInvitationEvent((e) => ({
        ...e,
        actor: CHARLIE_ID,
        payload: { ...e.payload, inviterId: ALICE_ID, inviteeId: CHARLIE_ID },
      }));
      console.log('❌ Reject Invitation (Rejecter):', narrateActorDidRejectPartyInvitation(context, rejectEvent, CHARLIE_ID));
      console.log('👁️  Reject Invitation (Inviter):', narrateActorDidRejectPartyInvitation(context, rejectEvent, ALICE_ID));
      console.log('👁️  Reject Invitation (Observer):', narrateActorDidRejectPartyInvitation(context, rejectEvent, OBSERVER_ID) || '(empty - private action)');

      // Party Membership
      console.log('\n👥 PARTY MEMBERSHIP');
      console.log('-'.repeat(40));

      const joinEvent = createActorDidJoinPartyEvent((e) => ({ ...e, actor: BOB_ID }));
      console.log('🚪 Join Party (Joiner):\n' + narrateActorDidJoinParty(context, joinEvent, BOB_ID).split('\n').map(line => '    ' + line).join('\n'));
      console.log('👁️  Join Party (Observer):', narrateActorDidJoinParty(context, joinEvent, OBSERVER_ID));

      // Party Leaving Scenarios
      console.log('\n🚪 LEAVING SCENARIOS');
      console.log('-'.repeat(40));

      const voluntaryLeaveEvent = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: { ...e.payload, reason: PartyLeaveReason.VOLUNTARY },
      }));
      console.log('🚶 Voluntary Leave (Leaver):', narrateActorDidLeaveParty(context, voluntaryLeaveEvent, BOB_ID));
      console.log('👁️  Voluntary Leave (Observer):', narrateActorDidLeaveParty(context, voluntaryLeaveEvent, OBSERVER_ID));

      const kickedEvent = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: { ...e.payload, reason: PartyLeaveReason.KICKED },
      }));
      console.log('👢 Kicked from Party (Victim):', narrateActorDidLeaveParty(context, kickedEvent, BOB_ID));
      console.log('👁️  Kicked from Party (Observer):', narrateActorDidLeaveParty(context, kickedEvent, OBSERVER_ID));

      const disbandedLeaveEvent = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: { ...e.payload, reason: PartyLeaveReason.DISBANDED },
      }));
      console.log('💥 Party Disbanded (Member):', narrateActorDidLeaveParty(context, disbandedLeaveEvent, BOB_ID));

      const ownershipTransferEvent = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          reason: PartyLeaveReason.VOLUNTARY,
          newOwner: BOB_ID,
        },
      }));
      console.log('👑 Leadership Transfer (Leaver):', narrateActorDidLeaveParty(context, ownershipTransferEvent, ALICE_ID));
      console.log('👁️  Leadership Transfer (Observer):', narrateActorDidLeaveParty(context, ownershipTransferEvent, OBSERVER_ID));

      // Party Inspection
      console.log('\n🔍 PARTY INSPECTION');
      console.log('-'.repeat(40));

      // Set up party with invitations for inspection demo
      const party = context.world.groups[DEFAULT_PARTY_ID] as Party;
      party.invitations = {
        [CHARLIE_ID]: Date.now() - 30000, // 30 seconds ago
        [DAVID_ID]: Date.now() - 120000,  // 2 minutes ago
      };

      const inspectEventOwner = createActorDidInspectPartyEvent((e) => ({ ...e, actor: ALICE_ID }));
      const ownerInspection = narrateActorDidInspectParty(context, inspectEventOwner, ALICE_ID);
      console.log('👑 Party Inspection (Owner):\n' + ownerInspection.split('\n').map(line => '    ' + line).join('\n'));

      const inspectEventMember = createActorDidInspectPartyEvent((e) => ({ ...e, actor: BOB_ID }));
      const memberInspection = narrateActorDidInspectParty(context, inspectEventMember, BOB_ID);
      console.log('👤 Party Inspection (Member):\n' + memberInspection.split('\n').map(line => '    ' + line).join('\n'));

      const inspectEventObserver = createActorDidInspectPartyEvent((e) => ({ ...e, actor: OBSERVER_ID }));
      const observerInspection = narrateActorDidInspectParty(context, inspectEventObserver, OBSERVER_ID);
      console.log('👁️  Party Inspection (Observer):\n' + observerInspection.split('\n').map(line => '    ' + line).join('\n'));

      // Single Member Party
      console.log('\n👤 SOLO PARTY SCENARIOS');
      console.log('-'.repeat(40));

      const soloParty = context.partyApi.createParty(CHARLIE_ID, (party) => ({
        ...party,
        id: 'flux:group:party:test:solo' as any,
        members: { [CHARLIE_ID]: 1 },
        invitations: {},
      }));
      context.world.groups[soloParty.id] = soloParty;

      const soloInspectEvent = createActorDidInspectPartyEvent((e) => ({
        ...e,
        payload: { ...e.payload, partyId: soloParty.id },
      }));
      const soloInspection = narrateActorDidInspectParty(context, soloInspectEvent, CHARLIE_ID);
      console.log('🏠 Solo Party Inspection:\n' + soloInspection.split('\n').map(line => '    ' + line).join('\n'));

      // Gender Variations
      console.log('\n👤 GENDER VARIATIONS');
      console.log('-'.repeat(40));

      // Alice (female) inviting Bob (male)
      const femaleInviterEvent = createActorDidReceivePartyInvitationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: { ...e.payload, inviterId: ALICE_ID, inviteeId: BOB_ID },
      }));
      console.log('♀️  Female Inviter (her party):\n' + narrateActorDidReceivePartyInvitation(context, femaleInviterEvent, BOB_ID).split('\n').map(line => '    ' + line).join('\n'));

      // Bob (male) inviting Alice (female) - hypothetical reverse scenario
      const maleInviterEvent = createActorDidReceivePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: { ...e.payload, inviterId: BOB_ID, inviteeId: ALICE_ID },
      }));
      console.log('♂️  Male Inviter (his party):\n' + narrateActorDidReceivePartyInvitation(context, maleInviterEvent, ALICE_ID).split('\n').map(line => '    ' + line).join('\n'));

      // Error Scenarios
      console.log('\n⚠️  ERROR HANDLING');
      console.log('-'.repeat(40));

      const missingActorEvent = createActorDidCreatePartyEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN
      }));
      console.log('❌ Missing Actor:', narrateActorDidCreateParty(context, missingActorEvent, OBSERVER_ID) || '(empty - graceful failure)');

      const missingPartyEvent = createActorDidInspectPartyEvent((e) => ({
        ...e,
        payload: { ...e.payload, partyId: 'flux:group:party:nonexistent' },
      }));
      console.log('❌ Missing Party:', narrateActorDidInspectParty(context, missingPartyEvent, ALICE_ID) || '(empty - graceful failure)');

      console.log('\n' + '='.repeat(80));
      console.log('🎉 END PARTY MOOD BOARD');
      console.log('='.repeat(80) + '\n');

      // No meaningful assertions - this is purely for visualization
      expect(true).toBe(true);
    });
  });
});

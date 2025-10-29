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
  withPerspectiveDifferentiation,
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

    const testParty = context.partyApi.createParty((party) => ({
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
      const event = createActorDidCreatePartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidCreateParty(context, event, ALICE_ID);
      expect(narrative).toBe('You create a new party.');
    });

    it('should render exact party creation from observer perspective', () => {
      const event = createActorDidCreatePartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice creates a new party.');
    });

    it('should render exact party creation with different actor names', () => {
      const event = createActorDidCreatePartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob creates a new party.');
    });
  });

  describe('narrateActorDidDisbandParty', () => {
    it('should render exact party disbanding from leader perspective', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidDisbandParty(context, event, ALICE_ID);
      expect(narrative).toBe('You disband the party.');
    });

    it('should render exact party disbanding from observer perspective', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidDisbandParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice disbands the party.');
    });

    it('should render exact party disbanding with different actor names', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({
        ...e,
        actor: CHARLIE_ID,
      }));

      const narrative = narrateActorDidDisbandParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Charlie disbands the party.');
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
      expect(narrative).toBe('You invite Bob to join your party.');
    });

    it('should render exact invitation from invitee perspective', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, BOB_ID);
      expect(narrative).toBe('Alice invites you to join their party.');
    });

    it('should render exact invitation from observer perspective', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          inviteeId: BOB_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice invites Bob to join the party.');
    });

    it('should render exact invitation with different actor names', () => {
      const event = createActorDidIssuePartyInvitationEvent((e) => ({
        ...e,
        actor: CHARLIE_ID,
        payload: {
          ...e.payload,
          inviteeId: DAVID_ID,
        },
      }));

      const narrative = narrateActorDidIssuePartyInvitation(context, event, OBSERVER_ID);
      expect(narrative).toBe('Charlie invites David to join the party.');
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
      expect(narrative).toBe('You receive a party invitation from Alice.');
    });

    it('should render exact invitation receipt from inviter perspective', () => {
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
      expect(narrative).toBe('Bob receives your party invitation.');
    });

    it('should render exact invitation receipt from observer perspective', () => {
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
      expect(narrative).toBe('Bob receives a party invitation from Alice.');
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
      expect(narrative).toBe('You accept Alice\'s party invitation.');
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
      expect(narrative).toBe('Bob accepts your party invitation.');
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
      expect(narrative).toBe('Bob accepts Alice\'s party invitation.');
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
      expect(narrative).toBe('You reject Alice\'s party invitation.');
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
      expect(narrative).toBe('Bob rejects your party invitation.');
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
      expect(narrative).toBe('Bob rejects Alice\'s party invitation.');
    });
  });

  describe('narrateActorDidJoinParty', () => {
    it('should render exact party joining from joiner perspective', () => {
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidJoinParty(context, event, BOB_ID);
      expect(narrative).toBe('You join the party.');
    });

    it('should render exact party joining from observer perspective', () => {
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidJoinParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob joins the party.');
    });

    it('should render exact party joining with different actor names', () => {
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: CHARLIE_ID,
      }));

      const narrative = narrateActorDidJoinParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Charlie joins the party.');
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
      expect(narrative).toBe('You leave the party.');
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
      expect(narrative).toBe('You are kicked from the party.');
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
      expect(narrative).toBe('You are removed as the party disbands.');
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
      expect(narrative).toBe('Bob leaves the party.');
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
      expect(narrative).toBe('Bob is kicked from the party.');
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
      expect(narrative).toBe('Alice leaves the party. Bob becomes the new party leader.');
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
      expect(narrative).toBe('You leave the party.');
    });
  });

  describe('narrateActorDidInspectParty', () => {
    it('should render exact party inspection from inspector perspective with multiple members', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          owner: ALICE_ID,
          members: {
            [ALICE_ID]: 1,
            [BOB_ID]: 1,
          },
        },
      }));

      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('Party: Alice (leader, 2 members)');
    });

    it('should render exact party inspection from inspector perspective with single member', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          owner: ALICE_ID,
          members: {
            [ALICE_ID]: 1,
          },
        },
      }));

      // Update the party size for this test
      context.world.groups['flux:group:party:test:001'].size = 1;

      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('Party: Alice (leader, 1 member)');
    });

    it('should render exact party inspection from observer perspective', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidInspectParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Alice inspects the party.');
    });

    it('should render exact party inspection with different actor names', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: BOB_ID,
      }));

      const narrative = narrateActorDidInspectParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('Bob inspects the party.');
    });

    it('should handle missing owner gracefully', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          owner: undefined,
          members: {
            [ALICE_ID]: 1,
            [BOB_ID]: 1,
          },
        },
      }));

      const narrative = narrateActorDidInspectParty(context, event, ALICE_ID);
      expect(narrative).toBe('Party: Unknown (leader, 2 members)');
    });
  });

  describe('Error handling', () => {
    it('should return empty string for missing actor in create party', () => {
      const event = createActorDidCreatePartyEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidCreateParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in disband party', () => {
      const event = createActorDidDisbandPartyEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

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
      const event = createActorDidJoinPartyEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidJoinParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in leave party', () => {
      const event = createActorDidLeavePartyEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidLeaveParty(context, event, OBSERVER_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in inspect party', () => {
      const event = createActorDidInspectPartyEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidInspectParty(context, event, OBSERVER_ID);
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
        const event = createActorDidCreatePartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withObjectSerializationValidation(narrateActorDidCreateParty, context, event, perspective)();
        });
      });

      it('should pass comprehensive quality validation', () => {
        const event = createActorDidCreatePartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        withNarrativeQuality(narrateActorDidCreateParty, context, event, OBSERVER_ID)();
      });

      it('should generate different narratives for different perspectives', () => {
        const event = createActorDidCreatePartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        withPerspectiveDifferentiation(narrateActorDidCreateParty, context, event, [ALICE_ID, OBSERVER_ID])();
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

        withPerspectiveDifferentiation(narrateActorDidIssuePartyInvitation, context, event, [ALICE_ID, BOB_ID, OBSERVER_ID])();
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
        const event = createActorDidInspectPartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        const perspectives = [ALICE_ID, OBSERVER_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidInspectParty, context, event, perspective)();
        });
      });
    });

    describe('Composed quality validation', () => {
      it('should pass all quality checks with composed validators', () => {
        const event = createActorDidCreatePartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        // Demonstrate composition of validators
        const composedValidator = withComposedValidation<ActorDidCreateParty>(
          withObjectSerializationValidation,
          withDebuggingArtifactValidation,
          withNonEmptyValidation
        );

        composedValidator(narrateActorDidCreateParty, context, event, OBSERVER_ID)();
      });

      it('should validate perspective differentiation across all party narrative functions', () => {
        const createEvent = createActorDidCreatePartyEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        withPerspectiveDifferentiation(narrateActorDidCreateParty, context, createEvent, [ALICE_ID, OBSERVER_ID])();

        const inviteEvent = createActorDidIssuePartyInvitationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            inviteeId: BOB_ID,
          },
        }));

        withPerspectiveDifferentiation(narrateActorDidIssuePartyInvitation, context, inviteEvent, [ALICE_ID, BOB_ID, OBSERVER_ID])();

        const joinEvent = createActorDidJoinPartyEvent((e) => ({
          ...e,
          actor: BOB_ID,
        }));

        withPerspectiveDifferentiation(narrateActorDidJoinParty, context, joinEvent, [BOB_ID, OBSERVER_ID])();
      });
    });
  });
});

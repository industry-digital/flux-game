import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_PARTY_ID, DEFAULT_TRACE } from '~/testing/constants';
import { Transform } from '~/testing/types';
import {
  ActorDidCreateParty,
  ActorDidDisbandParty,
  ActorDidIssuePartyInvitation,
  ActorDidReceivePartyInvitation,
  ActorDidAcceptPartyInvitation,
  ActorDidRejectPartyInvitation,
  ActorDidJoinParty,
  ActorDidLeaveParty,
  ActorDidInspectParty,
  EventType,
  WorldEvent,
  WorldEventInput,
} from '~/types/event';
import { PartyLeaveReason } from '~/types/party';
import { createWorldEvent } from '~/worldkit/event';

const identity = <T>(x: T): T => x;

export type PartyEventFactoryDependencies = {
  createWorldEvent: (input: WorldEventInput) => WorldEvent;
};

export const DEFAULT_PARTY_EVENT_FACTORY_DEPS: PartyEventFactoryDependencies = {
  createWorldEvent,
};

export const createActorDidCreatePartyEvent = (
  transform: Transform<ActorDidCreateParty> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidCreateParty => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidCreateParty = createWorldEvent({
    type: EventType.ACTOR_DID_CREATE_PARTY,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
    },
  }) as ActorDidCreateParty;

  return transform(baseEvent);
};

export const createActorDidDisbandPartyEvent = (
  transform: Transform<ActorDidDisbandParty> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidDisbandParty => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidDisbandParty = createWorldEvent({
    type: EventType.ACTOR_DID_DISBAND_PARTY,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      formerMembers: {
        [ALICE_ID]: 1,
        [BOB_ID]: 1,
      },
      cancelledInvitations: {
        [BOB_ID]: 1,
      },
    },
  }) as ActorDidDisbandParty;

  return transform(baseEvent);
};

export const createActorDidIssuePartyInvitationEvent = (
  transform: Transform<ActorDidIssuePartyInvitation> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidIssuePartyInvitation => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidIssuePartyInvitation = createWorldEvent({
    type: EventType.ACTOR_DID_ISSUE_PARTY_INVITATION,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      inviteeId: BOB_ID,
      inviterId: ALICE_ID,
    },
  }) as ActorDidIssuePartyInvitation;

  return transform(baseEvent);
};

export const createActorDidReceivePartyInvitationEvent = (
  transform: Transform<ActorDidReceivePartyInvitation> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidReceivePartyInvitation => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidReceivePartyInvitation = createWorldEvent({
    type: EventType.ACTOR_DID_RECEIVE_PARTY_INVITATION,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      inviterId: BOB_ID,
      inviteeId: ALICE_ID,
    },
  }) as ActorDidReceivePartyInvitation;

  return transform(baseEvent);
};

export const createActorDidAcceptPartyInvitationEvent = (
  transform: Transform<ActorDidAcceptPartyInvitation> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidAcceptPartyInvitation => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidAcceptPartyInvitation = createWorldEvent({
    type: EventType.ACTOR_DID_ACCEPT_PARTY_INVITATION,
    location: DEFAULT_LOCATION,
    actor: BOB_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      inviterId: ALICE_ID,
      inviteeId: BOB_ID,
    },
  }) as ActorDidAcceptPartyInvitation;

  return transform(baseEvent);
};

export const createActorDidRejectPartyInvitationEvent = (
  transform: Transform<ActorDidRejectPartyInvitation> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidRejectPartyInvitation => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidRejectPartyInvitation = createWorldEvent({
    type: EventType.ACTOR_DID_REJECT_PARTY_INVITATION,
    location: DEFAULT_LOCATION,
    actor: BOB_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      inviterId: ALICE_ID,
      inviteeId: BOB_ID,
    },
  }) as ActorDidRejectPartyInvitation;

  return transform(baseEvent);
};

export const createActorDidJoinPartyEvent = (
  transform: Transform<ActorDidJoinParty> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidJoinParty => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidJoinParty = createWorldEvent({
    type: EventType.ACTOR_DID_JOIN_PARTY,
    location: DEFAULT_LOCATION,
    actor: BOB_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
    },
  }) as ActorDidJoinParty;

  return transform(baseEvent);
};

export const createActorDidLeavePartyEvent = (
  transform: Transform<ActorDidLeaveParty> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidLeaveParty => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidLeaveParty = createWorldEvent({
    type: EventType.ACTOR_DID_LEAVE_PARTY,
    location: DEFAULT_LOCATION,
    actor: BOB_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      reason: PartyLeaveReason.VOLUNTARY,
    },
  }) as ActorDidLeaveParty;

  return transform(baseEvent);
};

export const createActorDidInspectPartyEvent = (
  transform: Transform<ActorDidInspectParty> = identity,
  deps: PartyEventFactoryDependencies = DEFAULT_PARTY_EVENT_FACTORY_DEPS
): ActorDidInspectParty => {
  const { createWorldEvent } = deps;

  const baseEvent: ActorDidInspectParty = createWorldEvent({
    type: EventType.ACTOR_DID_INSPECT_PARTY,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      partyId: DEFAULT_PARTY_ID,
      owner: ALICE_ID,
      members: {
        [ALICE_ID]: 1,
        [BOB_ID]: 1,
      },
    },
  }) as ActorDidInspectParty;

  return transform(baseEvent);
};

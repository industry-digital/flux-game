import { Actor } from '~/types/entity/actor';
import { Party, GroupType } from '~/types/entity/group';
import { WorldProjection } from '~/types/handler';
import { ActorURN, GroupURN, PartyURN, PlaceURN } from '~/types/taxonomy';

/**
 * Get all members of a party
 */
export function getPartyMembers(
  world: WorldProjection,
  partyId: PartyURN,
  output: ActorURN[] = [], // consumers can opt-into zero-allocation performance
): ActorURN[] {
  output.length = 0;

  const group = world.groups[partyId];
  if (!group || group.kind !== GroupType.PARTY) {
    return output;
  }

  const party = group as Party;
  for (let actorId in party.members) {
    if (world.actors[actorId as ActorURN]) {
      output.push(actorId as ActorURN);
    }
  }

  return output;
}

/**
 * Get all party members who are currently in the specified location
 */
export function getPartyMembersInLocation(
  world: WorldProjection,
  partyId: PartyURN,
  location: PlaceURN,
  output: ActorURN[] = [], // consumers can opt-into zero-allocation performance
): ActorURN[] {
  output.length = 0;

  const group = world.groups[partyId];
  if (!group || group.kind !== GroupType.PARTY) {
    return output;
  }

  const party = group as Party;
  for (let actorId in party.members) {
    const actor = world.actors[actorId as ActorURN];
    if (!actor) {
      continue;
    }

    if (actor.location === location) {
      output.push(actorId as ActorURN);
    }
  }

  return output;
};

/**
 * Get the party that an actor belongs to, if any
 */
export function getActorParty(world: WorldProjection, actor: Actor): Party | null {
  if (!actor.party) {
    return null;
  }

  const group = world.groups[actor.party];
  if (!group || group.kind !== GroupType.PARTY) {
    return null;
  }

  return group as Party;
}

/**
 * Check if two actors belong to the same party
 */
export function areInSameParty(actorA: Actor, actorB: Actor, world: WorldProjection): boolean {
  if (!actorA.party || !actorB.party) {
    return false;
  }

  return actorA.party === actorB.party;
}

/**
 * Check if an actor is a member of a specific party
 */
export function isPartyMember(actor: Actor, partyId: GroupURN, world: WorldProjection): boolean {
  const party = world.groups[partyId];
  if (!party || party.kind !== GroupType.PARTY) {
    return false;
  }

  const partyObj = party as Party;
  return actor.id in partyObj.members;
}

/**
 * Get all actors in the same party as the given actor, excluding the actor themselves
 */
export function getPartyAllies(
  world: WorldProjection,
  actor: Actor,
  output: ActorURN[] = [], // consumers can opt-into zero-allocation performance
): ActorURN[] {
  output.length = 0;

  const party = getActorParty(world, actor);
  if (!party) {
    return output;
  }

  for (let actorId in party.members) {
    if (actorId !== actor.id) {
      output.push(actorId as ActorURN);
    }
  }

  return output;
}

/**
 * Get all actors in the same party as the given actor who are in the same location
 */
export function getPartyAlliesInLocation(
  world: WorldProjection,
  actor: Actor,
  output: ActorURN[] = [], // consumers can opt-into zero-allocation performance
): ActorURN[] {
  output.length = 0;

  const party = getActorParty(world, actor);
  if (!party) {
    return [];
  }

  for (let partyMemberId in party.members) {
    if (partyMemberId === actor.id) {
      continue;
    }
    const partyMember = world.actors[partyMemberId as ActorURN];
    if (!partyMember) {
      continue;
    }
    if (partyMember.location === actor.location) {
      output.push(partyMember.id as ActorURN);
    }
  }

  return output;
}

/**
 * ReplMemo Functions
 *
 * Pure functions for controlled access to memoized state.
 * Direct mutations for maximum performance.
 */

import { ActorURN, PlaceURN, SessionURN } from '@flux/core';
import type { ReplMemo } from './types';

// ===== MEMO OPERATIONS =====

// Actor session operations
export const getActorSession = (memo: ReplMemo, actorId: ActorURN): SessionURN | undefined => {
  return memo.actors.actorSessions.get(actorId);
};

export const setActorSession = (memo: ReplMemo, actorId: ActorURN, sessionId: SessionURN): void => {
  memo.actors.actorSessions.set(actorId, sessionId);
};

export const removeActorSession = (memo: ReplMemo, actorId: ActorURN): void => {
  memo.actors.actorSessions.delete(actorId);
};

export const hasActorSession = (memo: ReplMemo, actorId: ActorURN): boolean => {
  return memo.actors.actorSessions.has(actorId);
};

// Actor location operations
export const getActorLocation = (memo: ReplMemo, actorId: ActorURN): PlaceURN | undefined => {
  return memo.actors.actorLocations.get(actorId);
};

export const setActorLocation = (memo: ReplMemo, actorId: ActorURN, location: PlaceURN): void => {
  memo.actors.actorLocations.set(actorId, location);
};

export const hasActorLocation = (memo: ReplMemo, actorId: ActorURN): boolean => {
  return memo.actors.actorLocations.has(actorId);
};

// Bulk operations for performance
export const initializeActorLocations = (memo: ReplMemo, locations: Map<ActorURN, PlaceURN>): void => {
  memo.actors.actorLocations.clear();
  for (const [actorId, location] of locations) {
    memo.actors.actorLocations.set(actorId, location);
  }
};

// Read-only inspection
export const getSessionCount = (memo: ReplMemo): number => {
  return memo.actors.actorSessions.size;
};

export const getLocationCount = (memo: ReplMemo): number => {
  return memo.actors.actorLocations.size;
};

// ===== HIGH-LEVEL OPERATIONS =====

// Actor switching with location update
export const switchActorWithLocation = (
  memo: ReplMemo,
  actorId: ActorURN,
  location: PlaceURN
): void => {
  setActorLocation(memo, actorId, location);
};

// Cleanup actor data
export const cleanupActorData = (memo: ReplMemo, actorId: ActorURN): void => {
  removeActorSession(memo, actorId);
  // Note: We typically keep location data for historical purposes
};

// Session lifecycle helpers
export const startActorSession = (
  memo: ReplMemo,
  actorId: ActorURN,
  sessionId: SessionURN
): void => {
  setActorSession(memo, actorId, sessionId);
};

export const endActorSession = (
  memo: ReplMemo,
  actorId: ActorURN,
  sessionId: SessionURN
): void => {
  // Only remove if it matches the expected session
  const currentSession = getActorSession(memo, actorId);
  if (currentSession === sessionId) {
    removeActorSession(memo, actorId);
  }
};

// Batch initialization from world state
export const initializeMemoFromWorld = (
  memo: ReplMemo,
  actors: Record<string, { location: PlaceURN }>
): void => {
  const locations = new Map<ActorURN, PlaceURN>();
  for (const [actorId, actor] of Object.entries(actors)) {
    locations.set(actorId as ActorURN, actor.location);
  }
  initializeActorLocations(memo, locations);
};

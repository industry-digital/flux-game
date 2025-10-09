import type { ActorURN } from '@flux/core';

/**
 * Extracts actor URN from JWT token
 */
export function extractActorFromJwt(token: string): ActorURN {
  try {
    const payload = token.split('.')[1];
    if (!payload) throw new Error('Invalid JWT');

    // base64url decode for browser compatibility
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const json = atob(padded);
    const decoded = JSON.parse(json);

    if (!decoded.actor) throw new Error('Invalid JWT');
    return decoded.actor as ActorURN;
  } catch {
    throw new Error('Invalid JWT');
  }
}

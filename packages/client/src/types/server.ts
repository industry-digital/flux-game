// ============================================================================
// Game Domain Types
// ============================================================================

/**
 * World Server Protocol Types
 *
 * These types are specific to the Flux game's world server handshake protocol
 * and should not be confused with generic XMPP types.
 */

export type WorldServerConnectionStatus = 'waiting' | 'handshaking' | 'ready' | 'failed';

export type WorldServerConnectionState = {
  status: WorldServerConnectionStatus;
  jid: string | null;
  completed: boolean;
};

export type WorldServerConnectionDependencies = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

// ============================================================================
// Game State Types (for future expansion)
// ============================================================================

// TODO: Add player state, world state, combat state types here as needed

import { ref, computed, watch, type Ref } from 'vue';
import type { Client as XmppClient } from '@xmpp/client';
import type { Element as XMLElement } from '@xmpp/xml';
import type {
  WorldServerConnectionStatus,
  WorldServerConnectionState,
  WorldServerConnectionDependencies,
} from '~/types/server';

export const DEFAULT_WORLD_SERVER_CONNECTION_DEPS: WorldServerConnectionDependencies = {
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
};

// ============================================================================
// World Server Protocol Composable
// ============================================================================

/**
 * World Server protocol composable for Flux game client
 *
 * Handles game-specific handshake with flux.sys.server and tracks
 * world server connection status. This is game domain logic that
 * uses XMPP as the transport layer.
 *
 * @param client - Reactive XMPP client reference
 * @param deps - Injectable dependencies for testing
 * @returns Reactive world server state and methods
 */
export function useWorldServerProtocol(
  client: Ref<XmppClient | null>,
  deps: WorldServerConnectionDependencies = DEFAULT_WORLD_SERVER_CONNECTION_DEPS,
) {
  // Internal state
  const status = ref<WorldServerConnectionStatus>('waiting');
  const serverJid = ref<string | null>(null);
  const handshakeComplete = ref(false);
  const handshakeTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

  // Configuration
  const HANDSHAKE_TIMEOUT_MS = 10000; // 10 seconds
  const WORLD_SERVER_PREFIX = 'flux.sys.server';

  // Computed properties
  const ready = computed(() =>
    status.value === 'ready' && handshakeComplete.value
  );

  const waiting = computed(() =>
    status.value === 'waiting'
  );

  const failed = computed(() =>
    status.value === 'failed'
  );

  const handshaking = computed(() =>
    status.value === 'handshaking'
  );

  // World server state object
  const worldServerState = computed<WorldServerConnectionState>(() => ({
    status: status.value,
    jid: serverJid.value,
    completed: handshakeComplete.value,
  }));

  /**
   * Check if a stanza is from the world server
   */
  function isFromWorldServer(stanza: XMLElement): boolean {
    return !!stanza.attrs.from?.startsWith(WORLD_SERVER_PREFIX);
  }

  /**
   * Check if a stanza is a world server handshake response
   */
  function isHandshakeResponse(stanza: XMLElement): boolean {
    return stanza.is('presence') && isFromWorldServer(stanza);
  }

  /**
   * Handle world server handshake response
   */
  function handleHandshakeResponse(stanza: XMLElement): void {
    if (!isHandshakeResponse(stanza)) return;

    clearHandshakeTimeout();

    serverJid.value = stanza.attrs.from || null;
    handshakeComplete.value = true;
    status.value = 'ready';
  }

  /**
   * Start handshake timeout
   */
  function startHandshakeTimeout(): void {
    clearHandshakeTimeout();

    handshakeTimeout.value = deps.setTimeout(() => {
      if (status.value === 'handshaking') {
        status.value = 'failed';
        handshakeComplete.value = false;
        serverJid.value = null;
      }
    }, HANDSHAKE_TIMEOUT_MS);
  }

  /**
   * Clear handshake timeout
   */
  function clearHandshakeTimeout(): void {
    if (handshakeTimeout.value) {
      deps.clearTimeout(handshakeTimeout.value);
      handshakeTimeout.value = null;
    }
  }

  /**
   * Initiate world server handshake
   */
  function initiateHandshake(): void {
    if (!client.value) {
      throw new Error('Cannot initiate handshake: XMPP client not available');
    }

    status.value = 'handshaking';
    handshakeComplete.value = false;
    serverJid.value = null;

    // Set up stanza listener for handshake response
    const handleStanza = (stanza: XMLElement) => {
      handleHandshakeResponse(stanza);
    };

    client.value.on('stanza', handleStanza);

    // Start timeout
    startHandshakeTimeout();

    // The handshake is initiated by sending presence, which should be
    // handled by the messaging composable. We just wait for the response.
  }

  /**
   * Reset world server state
   */
  function reset(): void {
    clearHandshakeTimeout();
    status.value = 'waiting';
    serverJid.value = null;
    handshakeComplete.value = false;
  }

  /**
   * Handle client disconnection
   */
  function handleDisconnect(): void {
    clearHandshakeTimeout();

    if (status.value !== 'waiting') {
      status.value = 'waiting';
      serverJid.value = null;
      handshakeComplete.value = false;
    }
  }

  /**
   * Manually trigger handshake failure
   */
  function setFailed(_reason?: string): void {
    clearHandshakeTimeout();
    status.value = 'failed';
    handshakeComplete.value = false;
    serverJid.value = null;

    // Reason is available for debugging but not logged to console
    // Could be passed to a centralized logging system
  }

  /**
   * Get human-readable status message
   */
  function getStatusMessage(): string {
    switch (status.value) {
      case 'waiting':
        return 'Waiting for XMPP connection';
      case 'handshaking':
        return 'Handshaking with world server...';
      case 'ready':
        return `Connected to world server: ${serverJid.value}`;
      case 'failed':
        return 'World server handshake failed';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Clean up resources
   */
  function cleanup(): void {
    clearHandshakeTimeout();

    if (client.value) {
      client.value.removeAllListeners('stanza');
    }

    reset();
  }

  // Watch client changes
  watch(client, (newClient, oldClient) => {
    // Clean up old client listeners
    if (oldClient) {
      oldClient.removeAllListeners('stanza');
    }

    if (newClient) {
      // Client is available, ready to handshake when online
      if (status.value === 'waiting') {
        // Don't auto-initiate - let the orchestrator handle timing
      }
    } else {
      // Client disconnected
      handleDisconnect();
    }
  });

  return {
    // State
    status,
    serverJid,
    handshakeComplete,

    // Computed
    ready,
    waiting,
    failed,
    handshaking,
    worldServerState,

    // Methods
    isFromWorldServer,
    isHandshakeResponse,
    handleHandshakeResponse,
    initiateHandshake,
    reset,
    handleDisconnect,
    setFailed,
    getStatusMessage,
    cleanup,
  };
}

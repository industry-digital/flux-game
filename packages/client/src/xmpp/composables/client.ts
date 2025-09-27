import { ref, computed, watch, onUnmounted, type Ref } from 'vue';
import type { Element as XMLElement } from '@xmpp/xml';
import type {
  XmppCredentials,
  XmppClientConfig,
  XmppClientState,
  XmppClientStatus,
} from '~/types/xmpp';

// Import individual XMPP composables (pure transport layer)
import { useXmppConnection } from './connection';
import { useXmppAuth } from './auth';
import { useXmppMessaging } from './messaging';
import { useXmppReconnect } from './reconnect';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_XMPP_CONFIG: Readonly<XmppClientConfig> = Object.freeze({
  service: 'ws://fabric.flux.local:5280/ws',
  // domain will be extracted from service URL if not provided
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  delayPresence: false,
  reconnect: Object.freeze({
    maxAttempts: 5,
    delayMs: 3000,
    backoffMultiplier: 1.5,
  }),
});

// ============================================================================
// XMPP Client Composition Root
// ============================================================================

/**
 * XMPP Client Composition Root
 *
 * Composes individual XMPP transport concerns into a unified, reactive interface.
 * This is a pure XMPP client that handles connection, authentication, messaging,
 * and reconnection - but NOT game-specific protocols.
 *
 * For game-specific functionality, compose this with server protocol composables
 * at the application level.
 *
 * @param credentials - Reactive credentials reference
 * @param config - Client configuration options
 * @returns Unified XMPP client interface
 */
export function useXmppClient(
  credentials: Ref<XmppCredentials | null>,
  config: Partial<XmppClientConfig> & { service: string } = DEFAULT_XMPP_CONFIG,
  auth = useXmppAuth(credentials),
) {
  // Merge config with defaults
  const mergedConfig = { ...DEFAULT_XMPP_CONFIG, ...config };

  // Connection config derived from credentials
  const connectionConfig = computed(() => {
    const creds = credentials.value;
    if (!creds) return null;

    return {
      service: mergedConfig.service,
      domain: mergedConfig.domain,
      username: creds.username,
      password: creds.password,
    };
  });

  // Connection composable (reactive based on config)
  const connection = computed(() => {
    const config = connectionConfig.value;
    if (!config) return null;
    return useXmppConnection(config);
  });

  // Messaging composable (uses connection client)
  const messaging = computed(() => {
    const conn = connection.value;
    if (!conn) return null;
    return useXmppMessaging(conn.client);
  });

  // Reconnection composable
  const reconnect = useXmppReconnect({
    maxAttempts: mergedConfig.maxReconnectAttempts!,
    delayMs: mergedConfig.reconnectDelay!,
    backoffMultiplier: mergedConfig.reconnect!.backoffMultiplier,
  });

  // Internal state
  const isConnecting = ref(false);

  // Computed unified status
  const status = computed<XmppClientStatus>(() => {
    const conn = connection.value;
    if (!conn) return 'disconnected';

    if (conn.status.value === 'error') {
      return 'error';
    }

    if (reconnect.isReconnecting.value) {
      return 'reconnecting';
    }

    if (conn.status.value === 'connecting') {
      return 'connecting';
    }

    if (conn.status.value === 'online') {
      return 'connected';
    }

    return 'disconnected';
  });

  // Computed ready state (can send messages)
  const ready = computed(() => {
    const conn = connection.value;
    const msg = messaging.value;
    return !!(conn?.status.value === 'online' && msg?.canSend.value);
  });

  // Computed error state
  const error = computed(() => {
    const conn = connection.value;
    return conn?.error.value || auth.error.value || null;
  });

  // Unified client state
  const clientState = computed<XmppClientState>(() => ({
    status: status.value,
    ready: ready.value,
    error: error.value,
    jid: auth.jid.value,
    username: auth.username.value,
    reconnectAttempts: reconnect.attempts.value,
  }));

  /**
   * Connect to XMPP server
   */
  async function connect(): Promise<void> {
    if (isConnecting.value) {
      throw new Error('Connection already in progress');
    }

    const validCredentials = auth.getValidCredentials();
    if (!validCredentials) {
      throw new Error('Valid credentials required for connection');
    }

    const conn = connection.value;
    if (!conn) {
      throw new Error('Connection not available - check credentials');
    }

    try {
      isConnecting.value = true;

      // Reset previous states
      reconnect.reset();

      // Establish connection
      await conn.connect();

      // Connection successful - auth state will be updated by watchers
    } catch (error) {
      isConnecting.value = false;
      throw error;
    }
  }

  /**
   * Disconnect from XMPP server
   */
  async function disconnect(): Promise<void> {
    isConnecting.value = false;
    reconnect.cancelReconnect();

    const conn = connection.value;
    if (conn) {
      await conn.disconnect();
    }
  }

  /**
   * Send an XML message
   */
  async function sendMessage(message: XMLElement): Promise<void> {
    const msg = messaging.value;
    if (!msg) {
      throw new Error('Messaging not available - not connected');
    }
    return msg.sendMessage(message);
  }

  /**
   * Send presence stanza
   */
  async function sendPresence(show?: string, statusText?: string): Promise<void> {
    const msg = messaging.value;
    if (!msg) {
      throw new Error('Messaging not available - not connected');
    }
    return msg.sendPresence(show, statusText);
  }

  /**
   * Initiate reconnection
   */
  async function reconnectNow(): Promise<void> {
    if (!auth.getValidCredentials()) {
      throw new Error('Valid credentials required for reconnection');
    }

    return reconnect.reconnectNow(async () => {
      await connect();
    });
  }

  // Watch connection online status to update auth and send initial presence
  watch(() => connection.value?.status.value, (newStatus) => {
    const conn = connection.value;
    if (newStatus === 'online' && conn?.client.value) {
      // Update auth state with JID from connection
      const address = conn.client.value.jid;
      if (address && auth.hasCredentials.value) {
        auth.setAuthenticated(address.toString());
      }

      // Send initial presence if not delayed
      if (!mergedConfig.delayPresence) {
        sendPresence().catch(() => {
          // Ignore presence send errors during connection
        });
      }

      // Mark connection as complete
      isConnecting.value = false;
      reconnect.reset();
    }
  });

  // Watch for disconnection to handle reconnection
  watch(() => connection.value?.status.value, (newStatus, oldStatus) => {
    if (oldStatus === 'online' && newStatus === 'disconnected') {
      // Unexpected disconnection - attempt reconnection
      if (reconnect.canReconnect.value && auth.hasCredentials.value) {
        reconnect.scheduleReconnect(async () => {
          await connect();
        });
      }
    }
  });

  // Watch for connection errors to handle reconnection
  watch(() => connection.value?.error.value, (error) => {
    if (error && reconnect.canReconnect.value && auth.hasCredentials.value) {
      reconnect.scheduleReconnect(async () => {
        await connect();
      });
    }
  });

  // Watch credentials changes to auto-connect/disconnect
  watch(credentials, async (newCredentials, oldCredentials) => {
    // Disconnect if credentials are removed
    if (!newCredentials && oldCredentials) {
      await disconnect();
      return;
    }

    // Connect if valid credentials are provided and we're disconnected
    if (newCredentials && auth.isValid.value && status.value === 'disconnected') {
      try {
        await connect();
      } catch (error) {
        // Auto-connect failed - error will be reflected in connection state
      }
    }
  }, { immediate: true });

  // Cleanup on unmount
  onUnmounted(async () => {
    await disconnect();
  });

  return {
    // Unified state (spread the computed state)
    ...clientState.value,

    // Raw client access for advanced usage
    client: computed(() => connection.value?.client.value || null),

    // Individual composable access (for advanced usage)
    connection: computed(() => connection.value),
    auth,
    messaging: computed(() => messaging.value),
    reconnect,

    // Main methods
    connect,
    disconnect,
    sendMessage,
    sendPresence,
    reconnectNow,

    // Utility methods (from messaging)
    createMessage: computed(() => messaging.value?.createMessage),
    createPresence: computed(() => messaging.value?.createPresence),
    createIq: computed(() => messaging.value?.createIq),
  };
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

// Re-export individual composables for direct usage
export { useXmppConnection } from './connection';
export { useXmppAuth } from './auth';
export { useXmppMessaging } from './messaging';
export { useXmppReconnect } from './reconnect';

// Re-export types
export type * from '~/types/xmpp';

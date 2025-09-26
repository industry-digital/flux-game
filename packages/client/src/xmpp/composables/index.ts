import { ref, computed, watch, onUnmounted, type Ref } from 'vue';
import type { Element as XMLElement } from '@xmpp/xml';
import type {
  XmppCredentials,
  XmppClientConfig,
  XmppClientState,
  XmppClientStatus,
} from '~/types/xmpp';

// Import individual composables
import { useXmppConnection } from './connection';
import { useXmppAuth } from './auth';
import { useXmppMessaging } from './messaging';
import { useXmppReconnect } from './reconnect';
import { useWorldServerProtocol } from './world-server';

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_XMPP_CONFIG: Readonly<XmppClientConfig> = {
  service: 'ws://fabric.flux.local:5280/ws',
  // domain will be extracted from service URL if not provided
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  delayPresence: false,
  reconnect: {
    maxAttempts: 5,
    delayMs: 3000,
    backoffMultiplier: 1.5,
  },
};


/**
 * Main XMPP client orchestrator composable
 *
 * Composes individual XMPP concerns into a unified, reactive client interface.
 * Handles the coordination between connection, authentication, messaging,
 * reconnection, and world server protocol.
 *
 * @param credentials - Reactive credentials reference
 * @param config - Client configuration options
 * @returns Unified XMPP client interface
 */
export function useXmppClient(
  credentials: Ref<XmppCredentials | null>,
  config: Partial<XmppClientConfig> & { service: string } = DEFAULT_XMPP_CONFIG,
) {
  // Merge config with defaults
  const mergedConfig = { ...DEFAULT_XMPP_CONFIG, ...config };

  // Initialize individual composables
  // Note: Connection needs credentials, so we'll create it reactively
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

  const connection = computed(() => {
    const config = connectionConfig.value;
    if (!config) return null;

    return useXmppConnection(config);
  });

  const auth = useXmppAuth(credentials);

  const messaging = useXmppMessaging(connection.client);

  const reconnect = useXmppReconnect({
    maxAttempts: mergedConfig.maxReconnectAttempts!,
    delayMs: mergedConfig.reconnectDelay!,
    backoffMultiplier: mergedConfig.reconnect!.backoffMultiplier,
  });

  const worldServer = useWorldServerProtocol(connection.client);

  // Internal state
  const isConnecting = ref(false);

  // Computed unified status
  const status = computed<XmppClientStatus>(() => {
    if (connection.status.value === 'error' || worldServer.failed.value) {
      return 'error';
    }

    if (reconnect.isReconnecting.value) {
      return 'reconnecting';
    }

    if (connection.status.value === 'connecting' || worldServer.status.value === 'handshaking') {
      return 'connecting';
    }

    if (connection.online.value && worldServer.ready.value) {
      return 'connected';
    }

    return 'disconnected';
  });

  // Computed ready state (can send messages)
  const ready = computed(() =>
    connection.online.value && messaging.canSend.value
  );

  // Computed error state
  const error = computed(() =>
    connection.error.value || auth.error.value || null
  );

  // Unified client state
  const clientState = computed<XmppClientState>(() => ({
    status: status.value,
    ready: ready.value,
    error: error.value,
    jid: auth.jid.value,
    username: auth.username.value,
    serverFullJid: worldServer.serverJid.value,
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

    try {
      isConnecting.value = true;

      // Reset previous states
      reconnect.reset();
      worldServer.reset();

      // Establish connection
      await connection.connect(validCredentials);

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
    worldServer.reset();
    await connection.disconnect();
  }

  /**
   * Send an XML message
   */
  async function sendMessage(message: XMLElement): Promise<void> {
    return messaging.sendMessage(message);
  }

  /**
   * Send presence stanza
   */
  async function sendPresence(show?: string, status?: string): Promise<void> {
    return messaging.sendPresence(show, status);
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

  // Watch connection online status to update auth and initiate world server handshake
  watch(connection.online, (online) => {
    if (online && connection.client.value) {
      // Update auth state with JID from connection
      const address = connection.client.value.jid;
      if (address && auth.hasCredentials.value) {
        auth.setAuthenticated(address.toString());
      }

      // Send initial presence if not delayed
      if (!mergedConfig.delayPresence) {
        messaging.sendPresence().catch(() => {
          // Ignore presence send errors during connection
        });
      }

      // Initiate world server handshake
      worldServer.initiateHandshake();

      // Mark connection as complete
      isConnecting.value = false;
      reconnect.reset();
    }
  });

  // Watch for disconnection to handle reconnection
  watch(connection.status, (newStatus, oldStatus) => {
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
  watch(connection.error, (error) => {
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
    // Unified state
    ...clientState.value,
    client: connection.client,

    // Individual composable access (for advanced usage)
    connection,
    auth,
    messaging,
    reconnect,
    worldServer,

    // Main methods
    connect,
    disconnect,
    sendMessage,
    sendPresence,
    reconnectNow,

    // Utility methods
    createMessage: messaging.createMessage,
    createPresence: messaging.createPresence,
    createIq: messaging.createIq,
  };
}

// Re-export individual composables for direct usage
export { useXmppConnection } from './connection';
export { useXmppAuth } from './auth';
export { useXmppMessaging } from './messaging';
export { useXmppReconnect } from './reconnect';
export { useWorldServerProtocol } from './world-server';

// Re-export types
export type * from '~/types/xmpp';

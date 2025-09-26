import { ref, computed, onUnmounted, type Ref } from 'vue';
import { client as createClient, type Client as XmppClient } from '@xmpp/client';
import { extractDomainFromService } from '~/xmpp/util';
import type {
  XmppConnectionConfig,
  XmppConnectionState,
  XmppConnectionStatus
} from '~/types/xmpp';

export type XmppClientResolver = (config: XmppConnectionConfig) => XmppClient;

export const DEFAULT_XMPP_CLIENT_RESOLVER: XmppClientResolver = (config) => {
  // Determine domain from service URL if not provided
  const domain = config.domain || extractDomainFromService(config.service);

  return createClient({
    service: config.service,
    domain,
    username: config.username,
    password: config.password,
  });
};

/**
 * Pure XMPP WebSocket connection composable
 *
 * Handles low-level XMPP connection lifecycle without authentication,
 * reconnection, or game-specific protocol logic.
 *
 * @param config - Connection configuration
 * @returns Reactive connection state and control methods
 */
export function useXmppConnection(config: XmppConnectionConfig, resolver: XmppClientResolver = DEFAULT_XMPP_CLIENT_RESOLVER) {
  // Here we need to parse credentials from the config

  // Internal state
  const client = ref<XmppClient | null>(resolver(config));
  const status = ref<XmppConnectionStatus>('disconnected');
  const error = ref<string | null>(null);
  const isConnecting = ref(false);

  // Computed properties
  const online = computed(() => status.value === 'online');
  const canConnect = computed(() =>
    status.value === 'disconnected' && !isConnecting.value
  );

  // Connection state object
  const connectionState = computed<XmppConnectionState>(() => ({
    status: status.value,
    client: client.value,
    error: error.value,
  }));

  /**
   * Establish XMPP connection
   */
  async function connect(): Promise<void> {
    if (!canConnect.value) {
      throw new Error(`Cannot connect when status is ${status.value}`);
    }

    if (!client.value) {
      throw new Error('No XMPP client available');
    }

    try {
      isConnecting.value = true;
      status.value = 'connecting';
      error.value = null;

      const xmppClient = client.value;

      // Set up core event listeners
      xmppClient.on('online', () => {
        status.value = 'online';
        isConnecting.value = false;
        error.value = null;
      });

      xmppClient.on('offline', () => {
        if (status.value === 'online') {
          status.value = 'disconnected';
        }
      });

      xmppClient.on('error', (err) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown XMPP error';
        status.value = 'error';
        error.value = errorMessage;
        isConnecting.value = false;
      });

      xmppClient.on('disconnect', () => {
        status.value = 'disconnected';
        isConnecting.value = false;
      });

      // Start connection (client is already stored)
      await xmppClient.start();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to XMPP server';
      status.value = 'error';
      error.value = errorMessage;
      isConnecting.value = false;
      throw err;
    }
  }

  /**
   * Disconnect from XMPP server
   */
  async function disconnect(): Promise<void> {
    if (!client.value) return;

    try {
      status.value = 'disconnected';
      error.value = null;
      isConnecting.value = false;

      await client.value.stop();
    } catch (err) {
      // Ignore errors during disconnection - should be graceful
    } finally {
      if (client.value) {
        client.value.removeAllListeners();
        client.value = null;
      }
    }
  }

  /**
   * Clean up connection on component unmount
   */
  function cleanup(): void {
    if (client.value) {
      client.value.removeAllListeners();
      client.value.stop().catch(() => {
        // Ignore cleanup errors
      });
      client.value = null;
    }
    status.value = 'disconnected';
    error.value = null;
    isConnecting.value = false;
  }

  // Cleanup on unmount
  onUnmounted(cleanup);

  return {
    // State
    client: client as Ref<XmppClient | null>,
    status,
    error,
    isConnecting,

    // Computed
    online,
    canConnect,
    connectionState,

    // Methods
    connect,
    disconnect,
    cleanup,
  };
}

import { ref, computed, onUnmounted, type Ref } from 'vue';
import { client as createClient, type Client as XmppClient } from '@xmpp/client';
import type {
  XmppConnectionConfig,
  XmppConnectionState,
  XmppConnectionStatus
} from '~/types/xmpp';
import { extractDomainFromService } from '~/types/xmpp';

/**
 * Pure XMPP WebSocket connection composable
 *
 * Handles low-level XMPP connection lifecycle without authentication,
 * reconnection, or game-specific protocol logic.
 *
 * @param config - Connection configuration
 * @returns Reactive connection state and control methods
 */
export function useXmppConnection(config: XmppConnectionConfig) {
  // Internal state
  const client = ref<XmppClient | null>(null);
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
  async function connect(credentials: { username: string; password: string }): Promise<void> {
    if (!canConnect.value) {
      throw new Error(`Cannot connect when status is ${status.value}`);
    }

    try {
      isConnecting.value = true;
      status.value = 'connecting';
      error.value = null;

      // Determine domain from service URL if not provided
      const domain = config.domain || extractDomainFromService(config.service);

      // Create XMPP client
      const xmppClient = createClient({
        service: config.service,
        domain,
        username: credentials.username,
        password: credentials.password,
      });

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

      // Store client reference and start connection
      client.value = xmppClient;
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
      // Log warning but don't throw - disconnection should be graceful
      console.warn('Error during XMPP disconnect:', err);
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

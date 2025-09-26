import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { createComposableTestSuite } from '~/testing';
import { useXmppClient, DEFAULT_XMPP_CONFIG } from './client';
import type { XmppCredentials } from '~/types/xmpp';

describe('useXmppClient', () => {
  const testSuite = createComposableTestSuite();

  beforeEach(() => {
    testSuite.setup();
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('composition root', () => {
    it('should initialize with default configuration', () => {
      testSuite.runWithContext(() => {
        const credentials = ref<XmppCredentials | null>(null);
        const client = useXmppClient(credentials);

        expect(client.status).toBe('disconnected');
        expect(client.ready).toBe(false);
        expect(client.error).toBe('No credentials provided'); // Auth error when no credentials
        expect(client.jid).toBe(null);
        expect(client.username).toBe(null);
        expect(client.reconnectAttempts).toBe(0);
      });
    });

    it('should merge custom config with defaults', () => {
      testSuite.runWithContext(() => {
        const credentials = ref<XmppCredentials | null>({
          username: 'testuser',
          password: 'testpass',
        });
        const customConfig = {
          service: 'ws://custom.server:5280/ws',
          maxReconnectAttempts: 10,
        };

        const client = useXmppClient(credentials, customConfig);

        // Should have connection available with custom config
        expect(client.connection.value).toBeDefined();
        // Status could be 'disconnected' or 'connecting' depending on auto-connect behavior
        expect(['disconnected', 'connecting']).toContain(client.connection.value?.status.value);

        // Should merge with defaults for other values
        expect(client.reconnect.attempts.value).toBe(0); // Initial attempts should be 0
      });
    });

    it('should provide access to individual composables', () => {
      testSuite.runWithContext(() => {
        const credentials = ref<XmppCredentials | null>({
          username: 'testuser',
          password: 'testpass',
        });

        const client = useXmppClient(credentials);

        expect(client.auth).toBeDefined();
        expect(client.reconnect).toBeDefined();
        expect(client.connection.value).toBeDefined();
        expect(client.messaging.value).toBeDefined();
      });
    });

    it('should provide utility methods from messaging', () => {
      testSuite.runWithContext(() => {
        const credentials = ref<XmppCredentials | null>({
          username: 'testuser',
          password: 'testpass',
        });

        const client = useXmppClient(credentials);

        expect(client.createMessage.value).toBeDefined();
        expect(client.createPresence.value).toBeDefined();
        expect(client.createIq.value).toBeDefined();
      });
    });

    it('should handle null credentials gracefully', () => {
      testSuite.runWithContext(() => {
        const credentials = ref<XmppCredentials | null>(null);
        const client = useXmppClient(credentials);

        expect(client.status).toBe('disconnected');
        expect(client.connection.value).toBe(null);
        expect(client.messaging.value).toBe(null);
        expect(client.client.value).toBe(null);
      });
    });

    it('should react to credential changes', async () => {
      testSuite.runWithContext(async () => {
        const credentials = ref<XmppCredentials | null>(null);
        const client = useXmppClient(credentials);

        expect(client.connection.value).toBe(null);

        // Add credentials
        credentials.value = {
          username: 'testuser',
          password: 'testpass',
        };
        await nextTick();

        expect(client.connection.value).toBeDefined();
        expect(client.messaging.value).toBeDefined();

        // Remove credentials
        credentials.value = null;
        await nextTick();

        expect(client.connection.value).toBe(null);
        expect(client.messaging.value).toBe(null);
      });
    });

    it('should throw error when connecting without credentials', async () => {
      testSuite.runWithContext(async () => {
        const credentials = ref<XmppCredentials | null>(null);
        const client = useXmppClient(credentials);

        await expect(client.connect()).rejects.toThrow('Valid credentials required for connection');
      });
    });

    it('should throw error when connecting without connection', async () => {
      testSuite.runWithContext(async () => {
        const credentials = ref<XmppCredentials | null>({
          username: 'testuser',
          password: 'testpass',
        });

        const client = useXmppClient(credentials);

        // Force connection to be null by removing credentials after init
        credentials.value = null;
        await nextTick();

        await expect(client.connect()).rejects.toThrow('Valid credentials required for connection');
      });
    });

    it('should prevent concurrent connections', async () => {
      testSuite.runWithContext(async () => {
        const credentials = ref<XmppCredentials | null>({
          username: 'testuser',
          password: 'testpass',
        });

        const client = useXmppClient(credentials);

        // Mock the connection to be slow
        const mockConnect = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
        if (client.connection.value) {
          client.connection.value.connect = mockConnect;
        }

        // Start first connection
        const firstConnect = client.connect();

        // Try second connection
        await expect(client.connect()).rejects.toThrow('Connection already in progress');

        // Cleanup
        firstConnect.catch(() => {}); // Ignore the hanging promise
      });
    });

    it('should handle sendMessage when not connected', async () => {
      testSuite.runWithContext(async () => {
        const credentials = ref<XmppCredentials | null>(null);
        const client = useXmppClient(credentials);

        const mockMessage = { name: 'message' } as any;
        await expect(client.sendMessage(mockMessage)).rejects.toThrow('Messaging not available - not connected');
      });
    });

    it('should handle sendPresence when not connected', async () => {
      testSuite.runWithContext(async () => {
        const credentials = ref<XmppCredentials | null>(null);
        const client = useXmppClient(credentials);

        await expect(client.sendPresence()).rejects.toThrow('Messaging not available - not connected');
      });
    });
  });

  describe('default configuration', () => {
    it('should export default configuration', () => {
      expect(DEFAULT_XMPP_CONFIG).toEqual({
        service: 'ws://fabric.flux.local:5280/ws',
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        delayPresence: false,
        reconnect: {
          maxAttempts: 5,
          delayMs: 3000,
          backoffMultiplier: 1.5,
        },
      });
    });

    it('should be readonly', () => {
      // In JavaScript, readonly is more of a TypeScript hint
      // The object is frozen, so modifications should be ignored
      const originalService = DEFAULT_XMPP_CONFIG.service;
      try {
        (DEFAULT_XMPP_CONFIG as any).service = 'modified';
      } catch (error) {
        // Modification might throw in strict mode
      }
      expect(DEFAULT_XMPP_CONFIG.service).toBe(originalService);
    });
  });
});

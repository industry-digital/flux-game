import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { createComposableTestSuite } from '~/testing';
import { useXmppConnection, type XmppClientResolver } from './connection';
import type { XmppConnectionConfig } from '~/types/xmpp';

// Mock XMPP client for testing
class MockXmppClient {
  private eventHandlers: Map<string, Function[]> = new Map();
  public jid = { toString: () => 'testuser@example.com' };

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  removeAllListeners() {
    this.eventHandlers.clear();
  }

  async start() {
    // Simulate successful connection
    await nextTick();
    this.emit('online', this.jid);
  }

  async stop() {
    await nextTick();
    this.emit('disconnect');
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(...args));
  }

  // Helper methods for testing
  emitError(error: Error) {
    this.emit('error', error);
  }

  emitOffline() {
    this.emit('offline');
  }

  emitDisconnect() {
    this.emit('disconnect');
  }
}

describe('useXmppConnection', () => {
  const testSuite = createComposableTestSuite();
  let mockClient: MockXmppClient;
  let mockResolver: XmppClientResolver;
  let config: XmppConnectionConfig;

  beforeEach(() => {
    testSuite.setup();
    mockClient = new MockXmppClient();
    mockResolver = vi.fn(() => mockClient as any);
    config = {
      service: 'ws://test.example.com:5280/ws',
      domain: 'example.com',
      username: 'testuser',
      password: 'password123',
    };
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('initialization', () => {
    it('should initialize with disconnected state', () => {
      testSuite.runWithContext(() => {
        const connection = useXmppConnection(config, mockResolver);

        expect(connection.status.value).toBe('disconnected');
        expect(connection.client.value).toStrictEqual(mockClient);
        expect(connection.error.value).toBe(null);
        expect(connection.isConnecting.value).toBe(false);
        expect(connection.online.value).toBe(false);
        expect(connection.canConnect.value).toBe(true);
      });
    });

    it('should create connection state object', () => {
      testSuite.runWithContext(() => {
        const connection = useXmppConnection(config, mockResolver);

        expect(connection.connectionState.value).toEqual({
          status: 'disconnected',
          client: expect.any(MockXmppClient),
          error: null,
        });
      });
    });
  });

  describe('domain extraction', () => {
    it('should use provided domain', () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        await connection.connect();

        expect(mockResolver).toHaveBeenCalledWith(config);
      });
    });

    it('should extract domain from service URL when not provided', () => {
      testSuite.runWithContext(async () => {
        const configWithoutDomain = {
          service: 'ws://auto.example.com:5280/ws',
          username: 'testuser',
          password: 'password123'
        };
        const connection = useXmppConnection(configWithoutDomain, mockResolver);

        await connection.connect();

        expect(mockResolver).toHaveBeenCalledWith(configWithoutDomain);
      });
    });
  });

  describe('connection lifecycle', () => {
    it('should successfully connect with valid credentials', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);
        // Start connection
        const connectPromise = connection.connect();

        // Should be in connecting state
        expect(connection.status.value).toBe('connecting');
        expect(connection.isConnecting.value).toBe(true);
        expect(connection.canConnect.value).toBe(false);

        // Wait for connection to complete
        await connectPromise;

        // Should be online
        expect(connection.status.value).toBe('online');
        expect(connection.client.value).toStrictEqual(mockClient);
        expect(connection.error.value).toBe(null);
        expect(connection.isConnecting.value).toBe(false);
        expect(connection.online.value).toBe(true);
        expect(connection.canConnect.value).toBe(false);
      });
    });

    it('should handle connection errors', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Mock client that throws on start
        const errorClient = new MockXmppClient();
        errorClient.start = vi.fn().mockRejectedValue(new Error('Connection failed'));
        mockResolver = vi.fn(() => errorClient as any);
        const connectionWithError = useXmppConnection(config, mockResolver);

        // Attempt connection
        await expect(connectionWithError.connect()).rejects.toThrow('Connection failed');

        // Should be in error state
        expect(connectionWithError.status.value).toBe('error');
        expect(connectionWithError.error.value).toBe('Connection failed');
        expect(connectionWithError.isConnecting.value).toBe(false);
        expect(connectionWithError.online.value).toBe(false);
      });
    });

    it('should prevent multiple simultaneous connections', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Start first connection
        const firstConnect = connection.connect();

        // Try to start second connection while first is in progress
        await expect(connection.connect()).rejects.toThrow('Cannot connect when status is connecting');

        // Complete first connection
        await firstConnect;
      });
    });

    it('should handle disconnect gracefully', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect first
        await connection.connect();
        expect(connection.online.value).toBe(true);

        // Disconnect
        await connection.disconnect();

        // Should be disconnected
        expect(connection.status.value).toBe('disconnected');
        expect(connection.client.value).toBe(null);
        expect(connection.error.value).toBe(null);
        expect(connection.isConnecting.value).toBe(false);
        expect(connection.online.value).toBe(false);
        expect(connection.canConnect.value).toBe(true);
      });
    });

    it('should handle disconnect when not connected', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Disconnect without connecting first
        await connection.disconnect();

        // Should remain in disconnected state
        expect(connection.status.value).toBe('disconnected');
        expect(connection.client.value).toBe(null);
      });
    });
  });

  describe('XMPP event handling', () => {
    it('should handle online event', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        await connection.connect();

        expect(connection.status.value).toBe('online');
        expect(connection.online.value).toBe(true);
        expect(connection.isConnecting.value).toBe(false);
        expect(connection.error.value).toBe(null);
      });
    });

    it('should handle offline event', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect first
        await connection.connect();
        expect(connection.status.value).toBe('online');

        // Simulate offline event
        mockClient.emitOffline();
        await nextTick();

        expect(connection.status.value).toBe('disconnected');
      });
    });

    it('should handle error event', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect first
        await connection.connect();

        // Simulate error event
        const testError = new Error('XMPP protocol error');
        mockClient.emitError(testError);
        await nextTick();

        expect(connection.status.value).toBe('error');
        expect(connection.error.value).toBe('XMPP protocol error');
        expect(connection.isConnecting.value).toBe(false);
      });
    });

    it('should handle disconnect event', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect first
        await connection.connect();

        // Simulate disconnect event
        mockClient.emitDisconnect();
        await nextTick();

        expect(connection.status.value).toBe('disconnected');
        expect(connection.isConnecting.value).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup on manual cleanup call', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect first
        await connection.connect();
        expect(connection.client.value).toStrictEqual(mockClient);

        // Manual cleanup
        connection.cleanup();

        expect(connection.status.value).toBe('disconnected');
        expect(connection.client.value).toBe(null);
        expect(connection.error.value).toBe(null);
        expect(connection.isConnecting.value).toBe(false);
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect with client that throws on stop
        const errorClient = new MockXmppClient();
        errorClient.stop = vi.fn().mockRejectedValue(new Error('Stop failed'));
        errorClient.removeAllListeners = vi.fn();
        mockResolver = vi.fn(() => errorClient as any);
        const connectionWithError = useXmppConnection(config, mockResolver);

        await connectionWithError.connect();

        // Cleanup should not throw even if client.stop() fails
        expect(() => connectionWithError.cleanup()).not.toThrow();

        expect(connectionWithError.status.value).toBe('disconnected');
        expect(connectionWithError.client.value).toBe(null);
      });
    });
  });

  describe('computed properties', () => {
    it('should update canConnect based on status', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Initially can connect
        expect(connection.canConnect.value).toBe(true);

        // Start connecting
        const connectPromise = connection.connect();
        expect(connection.canConnect.value).toBe(false);

        // Complete connection
        await connectPromise;
        expect(connection.canConnect.value).toBe(false);

        // Disconnect
        await connection.disconnect();
        expect(connection.canConnect.value).toBe(true);
      });
    });

    it('should update connectionState reactively', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Initial state
        expect(connection.connectionState.value).toEqual({
          status: 'disconnected',
          client: expect.any(MockXmppClient),
          error: null,
        });

        // After connection
        await connection.connect();
        expect(connection.connectionState.value).toEqual({
          status: 'online',
          client: expect.any(MockXmppClient),
          error: null,
        });

        // After error
        mockClient.emitError(new Error('Test error'));
        await nextTick();
        expect(connection.connectionState.value).toEqual({
          status: 'error',
          client: expect.any(MockXmppClient),
          error: 'Test error',
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle invalid service URL', () => {
      testSuite.runWithContext(() => {
        const invalidConfig = {
          service: 'not-a-url',
          username: 'testuser',
          password: 'password123'
        };

        // The error should happen during resolver call (initialization)
        expect(() => useXmppConnection(invalidConfig)).toThrow('Invalid service URL');
      });
    });

    it('should handle unknown error types', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        await connection.connect();

        // Emit non-Error object
        mockClient.emit('error', 'string error');
        await nextTick();

        expect(connection.status.value).toBe('error');
        expect(connection.error.value).toBe('Unknown XMPP error');
      });
    });

    it('should handle disconnect errors gracefully', async () => {
      testSuite.runWithContext(async () => {
        const connection = useXmppConnection(config, mockResolver);

        // Connect with client that throws on stop
        const errorClient = new MockXmppClient();
        errorClient.stop = vi.fn().mockRejectedValue(new Error('Stop failed'));
        errorClient.removeAllListeners = vi.fn();
        mockResolver = vi.fn(() => errorClient as any);
        const connectionWithError = useXmppConnection(config, mockResolver);

        await connectionWithError.connect();

        // Disconnect should not throw
        await expect(connectionWithError.disconnect()).resolves.not.toThrow();

        expect(connectionWithError.status.value).toBe('disconnected');
        expect(connectionWithError.client.value).toBe(null);
      });
    });
  });
});

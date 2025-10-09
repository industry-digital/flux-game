import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick, type Ref } from 'vue';
import { xml } from '@xmpp/client';
import { createComposableTestSuite } from '~/testing';
import { useWorldServerProtocol } from './protocol';
import { type Client as XmppClient } from '@xmpp/client';
import type { WorldServerConnectionDependencies } from '~/types/server';

// Mock XMPP client for testing
class MockXmppClient {
  public listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners[event] = [];
    } else {
      this.listeners = {};
    }
  }

  // Helper method to simulate incoming stanzas
  simulateStanza(stanza: any): void {
    const stanzaListeners = this.listeners['stanza'] || [];
    stanzaListeners.forEach(listener => listener(stanza));
  }

  reset(): void {
    this.listeners = {};
  }
}

describe('useWorldServerProtocol', () => {
  const testSuite = createComposableTestSuite();
  let mockClient: MockXmppClient;
  let client: Ref<XmppClient | null>;
  let mockSetTimeout: typeof setTimeout;
  let mockClearTimeout: typeof clearTimeout;
  let mockDeps: WorldServerConnectionDependencies;

  beforeEach(() => {
    testSuite.setup();
    mockClient = new MockXmppClient();
    client = ref<XmppClient | null>(mockClient as unknown as XmppClient);

    // Mock timeout functions
    let timeoutId = 0;
    const activeTimeouts = new Map<number, Function>();

    mockSetTimeout = vi.fn((callback, delay) => {
      const id = ++timeoutId;
      activeTimeouts.set(id, callback);
      return id as any;
    }) as unknown as typeof setTimeout;

    mockClearTimeout = vi.fn((id) => {
      activeTimeouts.delete(id as number);
    }) as unknown as typeof clearTimeout;

    mockDeps = {
      setTimeout: mockSetTimeout,
      clearTimeout: mockClearTimeout,
    };
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('initialization', () => {
    it('should initialize with waiting state', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        expect(protocol.status.value).toBe('waiting');
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.handshakeComplete.value).toBe(false);
        expect(protocol.waiting.value).toBe(true);
        expect(protocol.ready.value).toBe(false);
        expect(protocol.failed.value).toBe(false);
        expect(protocol.handshaking.value).toBe(false);
      });
    });

    it('should create world server state object', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        expect(protocol.worldServerState.value).toEqual({
          status: 'waiting',
          jid: null,
          completed: false,
        });
      });
    });

    it('should handle null client', () => {
      testSuite.runWithContext(() => {
        const nullClient = ref<XmppClient | null>(null);
        const protocol = useWorldServerProtocol(nullClient, mockDeps);

        expect(protocol.status.value).toBe('waiting');
        expect(protocol.worldServerState.value.status).toBe('waiting');
      });
    });
  });

  describe('stanza detection', () => {
    it('should identify world server stanzas', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        const worldServerStanza = xml('presence', { from: 'flux.sys.server@example.com' });
        const regularStanza = xml('presence', { from: 'user@example.com' });

        expect(protocol.isFromWorldServer(worldServerStanza)).toBe(true);
        expect(protocol.isFromWorldServer(regularStanza)).toBe(false);
      });
    });

    it('should identify handshake response stanzas', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        const handshakeResponse = xml('presence', { from: 'flux.sys.server@example.com' });
        const nonPresenceStanza = xml('message', { from: 'flux.sys.server@example.com' });
        const nonWorldServerPresence = xml('presence', { from: 'user@example.com' });

        expect(protocol.isHandshakeResponse(handshakeResponse)).toBe(true);
        expect(protocol.isHandshakeResponse(nonPresenceStanza)).toBe(false);
        expect(protocol.isHandshakeResponse(nonWorldServerPresence)).toBe(false);
      });
    });
  });

  describe('handshake lifecycle', () => {
    it('should initiate handshake successfully', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();

        expect(protocol.status.value).toBe('handshaking');
        expect(protocol.handshakeComplete.value).toBe(false);
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.handshaking.value).toBe(true);
        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
      });
    });

    it('should throw error when initiating handshake without client', () => {
      testSuite.runWithContext(() => {
        const nullClient = ref<XmppClient | null>(null);
        const protocol = useWorldServerProtocol(nullClient, mockDeps);

        expect(() => protocol.initiateHandshake()).toThrow('Cannot initiate handshake: XMPP client not available');
      });
    });

    it('should handle successful handshake response', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();

        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);

        expect(protocol.status.value).toBe('ready');
        expect(protocol.serverJid.value).toBe('flux.sys.server@game.example.com');
        expect(protocol.handshakeComplete.value).toBe(true);
        expect(protocol.ready.value).toBe(true);
        expect(mockClearTimeout).toHaveBeenCalled();
      });
    });

    it('should ignore non-handshake stanzas', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();

        const regularMessage = xml('message', { from: 'user@example.com' });
        protocol.handleHandshakeResponse(regularMessage);

        expect(protocol.status.value).toBe('handshaking');
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.handshakeComplete.value).toBe(false);
      });
    });

    it('should handle handshake via stanza listener', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();

        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        mockClient.simulateStanza(handshakeResponse);

        expect(protocol.status.value).toBe('ready');
        expect(protocol.serverJid.value).toBe('flux.sys.server@game.example.com');
        expect(protocol.handshakeComplete.value).toBe(true);
      });
    });
  });

  describe('timeout handling', () => {
    it('should timeout handshake after configured delay', () => {
      testSuite.runWithContext(() => {
        let timeoutCallback: Function | null = null;
        const mockSetTimeoutWithCapture = vi.fn((callback, delay) => {
          timeoutCallback = callback;
          return 1 as any;
        }) as unknown as typeof setTimeout;

        const protocol = useWorldServerProtocol(client, {
          setTimeout: mockSetTimeoutWithCapture,
          clearTimeout: mockClearTimeout,
        });

        protocol.initiateHandshake();
        expect(protocol.status.value).toBe('handshaking');

        // Execute timeout callback
        timeoutCallback!();

        expect(protocol.status.value).toBe('failed');
        expect(protocol.handshakeComplete.value).toBe(false);
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.failed.value).toBe(true);
      });
    });

    it('should not timeout if handshake completes first', () => {
      testSuite.runWithContext(() => {
        let timeoutCallback: Function | null = null;
        const mockSetTimeoutWithCapture = vi.fn((callback, delay) => {
          timeoutCallback = callback;
          return 1 as any;
        }) as unknown as typeof setTimeout;

        const protocol = useWorldServerProtocol(client, {
          setTimeout: mockSetTimeoutWithCapture,
          clearTimeout: mockClearTimeout,
        });

        protocol.initiateHandshake();

        // Complete handshake before timeout
        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);
        expect(protocol.status.value).toBe('ready');

        // Execute timeout callback (should not change state)
        timeoutCallback!();

        expect(protocol.status.value).toBe('ready');
        expect(protocol.handshakeComplete.value).toBe(true);
      });
    });

    it('should clear timeout on successful handshake', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();
        expect(mockSetTimeout).toHaveBeenCalled();

        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);

        expect(mockClearTimeout).toHaveBeenCalled();
      });
    });
  });

  describe('state management', () => {
    it('should reset state correctly', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        // Set up some state
        protocol.initiateHandshake();
        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);

        expect(protocol.status.value).toBe('ready');

        // Reset
        protocol.reset();

        expect(protocol.status.value).toBe('waiting');
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.handshakeComplete.value).toBe(false);
        expect(mockClearTimeout).toHaveBeenCalled();
      });
    });

    it('should handle disconnect correctly', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        // Set up connected state
        protocol.initiateHandshake();
        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);

        expect(protocol.status.value).toBe('ready');

        // Handle disconnect
        protocol.handleDisconnect();

        expect(protocol.status.value).toBe('waiting');
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.handshakeComplete.value).toBe(false);
      });
    });

    it('should not change state on disconnect if already waiting', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        expect(protocol.status.value).toBe('waiting');

        protocol.handleDisconnect();

        expect(protocol.status.value).toBe('waiting');
      });
    });

    it('should set failed state manually', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();
        expect(protocol.status.value).toBe('handshaking');

        protocol.setFailed('Test reason');

        expect(protocol.status.value).toBe('failed');
        expect(protocol.handshakeComplete.value).toBe(false);
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.failed.value).toBe(true);
        expect(mockClearTimeout).toHaveBeenCalled();
      });
    });
  });

  describe('status messages', () => {
    it('should return correct status messages', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        expect(protocol.getStatusMessage()).toBe('Waiting for XMPP connection');

        protocol.initiateHandshake();
        expect(protocol.getStatusMessage()).toBe('Handshaking with world server...');

        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);
        expect(protocol.getStatusMessage()).toBe('Connected to world server: flux.sys.server@game.example.com');

        protocol.setFailed();
        expect(protocol.getStatusMessage()).toBe('World server handshake failed');
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();
        expect(mockClient.listeners['stanza']).toBeDefined();

        protocol.cleanup();

        expect(mockClient.listeners['stanza']).toEqual([]);
        expect(protocol.status.value).toBe('waiting');
        expect(mockClearTimeout).toHaveBeenCalled();
      });
    });

    it('should handle cleanup when no client', () => {
      testSuite.runWithContext(() => {
        const nullClient = ref<XmppClient | null>(null);
        const protocol = useWorldServerProtocol(nullClient, mockDeps);

        expect(() => protocol.cleanup()).not.toThrow();
      });
    });
  });

  describe('client watching', () => {
    it('should handle client changes', async () => {
      testSuite.runWithContext(async () => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        // Set up state with current client
        protocol.initiateHandshake();
        expect(mockClient.listeners['stanza']).toBeDefined();

        // Change to new client
        const newMockClient = new MockXmppClient();
        client.value = newMockClient as unknown as XmppClient;
        await nextTick();

        // Old client should be cleaned up
        expect(mockClient.listeners['stanza']).toEqual([]);
      });
    });

    it('should handle client disconnection', async () => {
      testSuite.runWithContext(async () => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();
        expect(protocol.status.value).toBe('handshaking');

        // Disconnect client
        client.value = null;
        await nextTick();

        expect(protocol.status.value).toBe('waiting');
        expect(protocol.serverJid.value).toBe(null);
        expect(protocol.handshakeComplete.value).toBe(false);
      });
    });
  });

  describe('computed properties', () => {
    it('should update computed properties reactively', async () => {
      testSuite.runWithContext(async () => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        // Initial state
        expect(protocol.waiting.value).toBe(true);
        expect(protocol.handshaking.value).toBe(false);
        expect(protocol.ready.value).toBe(false);
        expect(protocol.failed.value).toBe(false);

        // Start handshake
        protocol.initiateHandshake();
        await nextTick();

        expect(protocol.waiting.value).toBe(false);
        expect(protocol.handshaking.value).toBe(true);
        expect(protocol.ready.value).toBe(false);
        expect(protocol.failed.value).toBe(false);

        // Complete handshake
        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);
        await nextTick();

        expect(protocol.waiting.value).toBe(false);
        expect(protocol.handshaking.value).toBe(false);
        expect(protocol.ready.value).toBe(true);
        expect(protocol.failed.value).toBe(false);

        // Fail
        protocol.setFailed();
        await nextTick();

        expect(protocol.waiting.value).toBe(false);
        expect(protocol.handshaking.value).toBe(false);
        expect(protocol.ready.value).toBe(false);
        expect(protocol.failed.value).toBe(true);
      });
    });

    it('should update worldServerState reactively', async () => {
      testSuite.runWithContext(async () => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        // Initial state
        expect(protocol.worldServerState.value).toEqual({
          status: 'waiting',
          jid: null,
          completed: false,
        });

        // Start handshake
        protocol.initiateHandshake();
        await nextTick();

        expect(protocol.worldServerState.value).toEqual({
          status: 'handshaking',
          jid: null,
          completed: false,
        });

        // Complete handshake
        const handshakeResponse = xml('presence', { from: 'flux.sys.server@game.example.com' });
        protocol.handleHandshakeResponse(handshakeResponse);
        await nextTick();

        expect(protocol.worldServerState.value).toEqual({
          status: 'ready',
          jid: 'flux.sys.server@game.example.com',
          completed: true,
        });
      });
    });
  });

  describe('dependency injection', () => {
    it('should use default dependencies when not provided', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client);

        protocol.initiateHandshake();

        // Should use real setTimeout (we can't easily test this without mocking globally)
        expect(protocol.status.value).toBe('handshaking');
      });
    });

    it('should use injected dependencies', () => {
      testSuite.runWithContext(() => {
        const protocol = useWorldServerProtocol(client, mockDeps);

        protocol.initiateHandshake();

        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
      });
    });
  });
});

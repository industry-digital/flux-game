import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick, type Ref } from 'vue';
import { xml } from '@xmpp/client';
import { createComposableTestSuite } from '~/testing';
import { useXmppMessaging, type XmppMessagingDependencies } from './messaging';
import { type Client as XmppClient } from '@xmpp/client';

// Mock XMPP client for testing
class MockXmppClient {
  public sentMessages: any[] = [];

  async send(message: any): Promise<void> {
    this.sentMessages.push(message);
  }

  // Helper method to simulate send failure
  failNextSend(error: Error): void {
    const originalSend = this.send;
    this.send = vi.fn().mockRejectedValueOnce(error).mockImplementation(originalSend);
  }

  reset(): void {
    this.sentMessages = [];
  }
}

describe('useXmppMessaging', () => {
  const testSuite = createComposableTestSuite();
  let mockClient: MockXmppClient;
  let client: Ref<XmppClient | null>;
  let mockSetTimeout: typeof setTimeout;
  let mockDeps: XmppMessagingDependencies;

  beforeEach(() => {
    testSuite.setup();
    mockClient = new MockXmppClient();
    client = ref<XmppClient | null>(mockClient as unknown as XmppClient);
    mockSetTimeout = vi.fn((callback, delay) => {
      // Execute immediately for most tests
      callback();
      return 1 as any; // Return a fake timer ID
    }) as unknown as typeof setTimeout;
    mockDeps = {
      setTimeout: mockSetTimeout,
    };
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        expect(messaging.queuedMessages.value).toEqual([]);
        expect(messaging.isSending.value).toBe(false);
        expect(messaging.canSend.value).toBe(true);
        expect(messaging.hasQueuedMessages.value).toBe(false);
      });
    });

    it('should create messaging state object', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        expect(messaging.messagingState.value).toEqual({
          queuedMessages: [],
          canSend: true,
        });
      });
    });

    it('should handle null client', () => {
      testSuite.runWithContext(() => {
        const nullClient = ref<XmppClient | null>(null);
        const messaging = useXmppMessaging(nullClient, mockDeps);

        expect(messaging.canSend.value).toBe(false);
        expect(messaging.messagingState.value.canSend).toBe(false);
      });
    });
  });

  describe('message sending', () => {
    it('should send message when client is available', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);
        const testMessage = xml('message', { to: 'test@example.com' }).c('body').t('Hello');

        await messaging.sendMessage(testMessage);

        expect(mockClient.sentMessages).toHaveLength(1);
        expect(mockClient.sentMessages[0]).toBe(testMessage);
        expect(messaging.isSending.value).toBe(false);
      });
    });

    it('should queue message when client is not available', async () => {
      testSuite.runWithContext(async () => {
        const nullClient = ref<XmppClient | null>(null);
        const messaging = useXmppMessaging(nullClient, mockDeps);
        const testMessage = xml('message', { to: 'test@example.com' }).c('body').t('Hello');

        await expect(messaging.sendMessage(testMessage)).rejects.toThrow('XMPP client not connected - message queued');

        expect(messaging.queuedMessages.value).toHaveLength(1);
        expect(messaging.queuedMessages.value[0].element).toStrictEqual(testMessage);
        expect(messaging.queuedMessages.value[0].queued).toBe(true);
        expect(messaging.hasQueuedMessages.value).toBe(true);
      });
    });

    it('should prevent concurrent sending', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);
        const testMessage1 = xml('message', { to: 'test1@example.com' }).c('body').t('Hello 1');
        const testMessage2 = xml('message', { to: 'test2@example.com' }).c('body').t('Hello 2');

        // Mock client.send to be slow
        let resolveFirstSend: () => void;
        const firstSendPromise = new Promise<void>(resolve => {
          resolveFirstSend = resolve;
        });
        mockClient.send = vi.fn().mockImplementationOnce(() => firstSendPromise);

        // Start first send
        const firstSendCall = messaging.sendMessage(testMessage1);

        // Try to send second message while first is in progress
        await expect(messaging.sendMessage(testMessage2)).rejects.toThrow('Already sending a message');

        // Complete first send
        resolveFirstSend!();
        await firstSendCall;

        expect(mockClient.send).toHaveBeenCalledTimes(1);
      });
    });

    it('should queue message on send failure', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);
        const testMessage = xml('message', { to: 'test@example.com' }).c('body').t('Hello');

        mockClient.failNextSend(new Error('Network error'));

        await expect(messaging.sendMessage(testMessage)).rejects.toThrow('Network error');

        expect(messaging.queuedMessages.value).toHaveLength(1);
        expect(messaging.queuedMessages.value[0].element).toStrictEqual(testMessage);
        expect(messaging.isSending.value).toBe(false);
      });
    });
  });

  describe('presence sending', () => {
    it('should send basic presence', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);

        await messaging.sendPresence();

        expect(mockClient.sentMessages).toHaveLength(1);
        const sentPresence = mockClient.sentMessages[0];
        expect(sentPresence.name).toBe('presence');
      });
    });

    it('should send presence with show and status', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);

        await messaging.sendPresence('away', 'In a meeting');

        expect(mockClient.sentMessages).toHaveLength(1);
        const sentPresence = mockClient.sentMessages[0];
        expect(sentPresence.name).toBe('presence');

        const showElement = sentPresence.getChild('show');
        const statusElement = sentPresence.getChild('status');
        expect(showElement?.getText()).toBe('away');
        expect(statusElement?.getText()).toBe('In a meeting');
      });
    });

    it('should queue presence when client not available', async () => {
      testSuite.runWithContext(async () => {
        const nullClient = ref<XmppClient | null>(null);
        const messaging = useXmppMessaging(nullClient, mockDeps);

        await expect(messaging.sendPresence()).rejects.toThrow('XMPP client not connected - message queued');

        expect(messaging.queuedMessages.value).toHaveLength(1);
        expect(messaging.queuedMessages.value[0].element.name).toBe('presence');
      });
    });
  });

  describe('message queuing', () => {
    it('should manually queue messages', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);
        const testMessage = xml('message', { to: 'test@example.com' }).c('body').t('Hello');

        messaging.queueMessage(testMessage);

        expect(messaging.queuedMessages.value).toHaveLength(1);
        expect(messaging.queuedMessages.value[0].element).toStrictEqual(testMessage);
        expect(messaging.queuedMessages.value[0].queued).toBe(true);
        expect(typeof messaging.queuedMessages.value[0].timestamp).toBe('number');
      });
    });

    it('should send queued messages when client becomes available', async () => {
      testSuite.runWithContext(async () => {
        let timeoutCallback: (() => void) | null = null;
        const mockSetTimeoutWithCapture = vi.fn((callback, delay) => {
          timeoutCallback = callback;
          return 1 as any;
        }) as unknown as typeof setTimeout;

        const nullClient = ref<XmppClient | null>(null);
        const messaging = useXmppMessaging(nullClient, {
          setTimeout: mockSetTimeoutWithCapture,
        });

        const testMessage1 = xml('message', { to: 'test1@example.com' }).c('body').t('Hello 1');
        const testMessage2 = xml('message', { to: 'test2@example.com' }).c('body').t('Hello 2');

        // Queue messages while offline
        messaging.queueMessage(testMessage1);
        messaging.queueMessage(testMessage2);
        expect(messaging.queuedMessages.value).toHaveLength(2);

        // Connect client
        nullClient.value = mockClient as unknown as XmppClient;
        await nextTick();

        // setTimeout should be called but not executed yet

        expect(mockSetTimeoutWithCapture).toHaveBeenCalledWith(expect.any(Function), 1000);

        expect(mockClient.sentMessages).toHaveLength(0);

        // Execute the timeout callback to send messages
        await timeoutCallback!();

        // Messages should now be sent
        expect(mockClient.sentMessages).toHaveLength(2);
        expect(messaging.queuedMessages.value).toHaveLength(0);
      });
    });

    it('should send queued messages manually', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);

        const testMessage1 = xml('message', { to: 'test1@example.com' }).c('body').t('Hello 1');
        const testMessage2 = xml('message', { to: 'test2@example.com' }).c('body').t('Hello 2');

        messaging.queueMessage(testMessage1);
        messaging.queueMessage(testMessage2);

        await messaging.sendQueuedMessages();

        expect(mockClient.sentMessages).toHaveLength(2);
        expect(messaging.queuedMessages.value).toHaveLength(0);
      });
    });

    it('should handle queued message send failures gracefully', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);

        const testMessage1 = xml('message', { to: 'test1@example.com' }).c('body').t('Hello 1');
        const testMessage2 = xml('message', { to: 'test2@example.com' }).c('body').t('Hello 2');

        messaging.queueMessage(testMessage1);
        messaging.queueMessage(testMessage2);

        // Make first message fail
        let callCount = 0;
        mockClient.send = vi.fn().mockImplementation(async (message) => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Network error');
          }
          mockClient.sentMessages.push(message);
        });

        await messaging.sendQueuedMessages();

        // First message should be re-queued, second should be sent
        expect(mockClient.sentMessages).toHaveLength(1);
        expect(messaging.queuedMessages.value).toHaveLength(1);
        expect(messaging.queuedMessages.value[0].element).toStrictEqual(testMessage1);
      });
    });

    it('should clear message queue', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        const testMessage = xml('message', { to: 'test@example.com' }).c('body').t('Hello');
        messaging.queueMessage(testMessage);
        expect(messaging.queuedMessages.value).toHaveLength(1);

        messaging.clearQueue();
        expect(messaging.queuedMessages.value).toHaveLength(0);
        expect(messaging.hasQueuedMessages.value).toBe(false);
      });
    });

    it('should not send queued messages when no client', async () => {
      testSuite.runWithContext(async () => {
        const nullClient = ref<XmppClient | null>(null);
        const messaging = useXmppMessaging(nullClient, mockDeps);

        messaging.queueMessage(xml('message').c('body').t('Hello'));

        await messaging.sendQueuedMessages();

        expect(messaging.queuedMessages.value).toHaveLength(1);
      });
    });
  });

  describe('stanza utilities', () => {
    it('should create message stanza', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        const message = messaging.createMessage('user@example.com', 'Hello World');

        expect(message.name).toBe('message');
        expect(message.attrs.to).toBe('user@example.com');
        expect(message.attrs.type).toBe('chat');

        const bodyElement = message.getChild('body');
        expect(bodyElement).toBeTruthy();
        expect(bodyElement!.getText()).toBe('Hello World');
      });
    });

    it('should create groupchat message stanza', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        const message = messaging.createMessage('room@conference.example.com', 'Hello Room', 'groupchat');

        expect(message.name).toBe('message');
        expect(message.attrs.to).toBe('room@conference.example.com');
        expect(message.attrs.type).toBe('groupchat');

        const bodyElement = message.getChild('body');
        expect(bodyElement).toBeTruthy();
        expect(bodyElement!.getText()).toBe('Hello Room');
      });
    });

    it('should create presence stanza', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        const presence = messaging.createPresence();
        expect(presence.name).toBe('presence');
        expect(Object.keys(presence.attrs)).toHaveLength(0);

        const presenceWithAttrs = messaging.createPresence('user@example.com', 'unavailable');
        expect(presenceWithAttrs.attrs.to).toBe('user@example.com');
        expect(presenceWithAttrs.attrs.type).toBe('unavailable');
      });
    });

    it('should create IQ stanza', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);

        const iq = messaging.createIq('server@example.com', 'get');
        expect(iq.name).toBe('iq');
        expect(iq.attrs.to).toBe('server@example.com');
        expect(iq.attrs.type).toBe('get');
        expect(iq.attrs.id).toBeUndefined();

        const iqWithId = messaging.createIq('server@example.com', 'set', 'request-123');
        expect(iqWithId.attrs.id).toBe('request-123');
      });
    });

    it('should extract stanza text', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);
        const message = xml('message')
          .c('body').t('Hello World').up()
          .c('subject').t('Test Subject').up();

        // Debug: let's see what the structure looks like
        const bodyChild = message.getChild('body');
        const subjectChild = message.getChild('subject');

        expect(bodyChild).toBeTruthy();
        expect(subjectChild).toBeTruthy();
        expect(bodyChild!.getText()).toBe('Hello World');
        expect(subjectChild!.getText()).toBe('Test Subject');

        expect(messaging.getStanzaText(message, 'body')).toBe('Hello World');
        expect(messaging.getStanzaText(message, 'subject')).toBe('Test Subject');
        expect(messaging.getStanzaText(message, 'nonexistent')).toBe(null);
      });
    });

    it('should check stanza JID', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);
        const message = xml('message', { from: 'user@example.com' });

        expect(messaging.isFromJid(message, 'user@example.com')).toBe(true);
        expect(messaging.isFromJid(message, 'other@example.com')).toBe(false);
      });
    });

    it('should check stanza type', () => {
      testSuite.runWithContext(() => {
        const messaging = useXmppMessaging(client, mockDeps);
        const message = xml('message', { type: 'chat' });

        expect(messaging.hasStanzaType(message, 'chat')).toBe(true);
        expect(messaging.hasStanzaType(message, 'groupchat')).toBe(false);
      });
    });
  });

  describe('computed properties', () => {
    it('should update canSend based on client and sending state', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);

        // Initially can send
        expect(messaging.canSend.value).toBe(true);

        // Cannot send when no client
        client.value = null;
        await nextTick();
        expect(messaging.canSend.value).toBe(false);

        // Can send when client is back
        client.value = mockClient as unknown as XmppClient;
        await nextTick();
        expect(messaging.canSend.value).toBe(true);

        // Cannot send while sending
        messaging.isSending.value = true;
        await nextTick();
        expect(messaging.canSend.value).toBe(false);
      });
    });

    it('should update messagingState reactively', async () => {
      testSuite.runWithContext(async () => {
        const messaging = useXmppMessaging(client, mockDeps);

        // Initial state
        expect(messaging.messagingState.value).toEqual({
          queuedMessages: [],
          canSend: true,
        });

        // After queuing message
        const testMessage = xml('message').c('body').t('Hello');
        messaging.queueMessage(testMessage);
        await nextTick();

        expect(messaging.messagingState.value.queuedMessages).toHaveLength(1);
        expect(messaging.messagingState.value.canSend).toBe(true);

        // After client disconnect
        client.value = null;
        await nextTick();

        expect(messaging.messagingState.value.canSend).toBe(false);
      });
    });
  });

  describe('setTimeout dependency injection', () => {
    it('should use injected setTimeout for queued message sending', async () => {
      testSuite.runWithContext(async () => {
        let timeoutCallback: (() => void) | null = null;
        const mockSetTimeoutWithCapture = vi.fn((callback, delay) => {
          timeoutCallback = callback;
          return 1 as any;
        }) as unknown as typeof setTimeout;

        const nullClient = ref<XmppClient | null>(null);
        const messaging = useXmppMessaging(nullClient, {
          setTimeout: mockSetTimeoutWithCapture,
        });

        // Queue a message
        messaging.queueMessage(xml('message').c('body').t('Hello'));

        // Connect client
        nullClient.value = mockClient as unknown as XmppClient;
        await nextTick();

        // setTimeout should be called but not executed yet
        expect(mockSetTimeoutWithCapture).toHaveBeenCalledWith(expect.any(Function), 1000);
        expect(mockClient.sentMessages).toHaveLength(0);

        // Execute the timeout callback
        timeoutCallback!();

        // Now message should be sent
        expect(mockClient.sentMessages).toHaveLength(1);
      });
    });
  });
});

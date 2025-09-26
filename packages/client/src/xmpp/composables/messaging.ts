import { ref, computed, watch, type Ref } from 'vue';
import { xml, type Client as XmppClient } from '@xmpp/client';
import type { Element as XMLElement } from '@xmpp/xml';
import type {
  XmppMessage,
  MessagingState
} from '~/types/xmpp';

/**
 * XMPP messaging composable
 *
 * Handles message sending, queuing when offline, and stanza processing utilities.
 * Does not manage connection or authentication - focuses purely on messaging.
 *
 * @param client - Reactive XMPP client reference
 * @returns Reactive messaging state and methods
 */
export function useXmppMessaging(client: Ref<XmppClient | null>) {
  // Internal state
  const queuedMessages = ref<XmppMessage[]>([]);
  const isSending = ref(false);

  // Computed properties
  const canSend = computed(() =>
    !!client.value && !isSending.value
  );

  const hasQueuedMessages = computed(() =>
    queuedMessages.value.length > 0
  );

  // Messaging state object
  const messagingState = computed<MessagingState>(() => ({
    queuedMessages: queuedMessages.value,
    canSend: canSend.value,
  }));

  /**
   * Send an XML message through the XMPP client
   */
  async function sendMessage(message: XMLElement): Promise<void> {
    if (!client.value) {
      // Queue message for later sending
      queueMessage(message);
      throw new Error('XMPP client not connected - message queued');
    }

    if (isSending.value) {
      throw new Error('Already sending a message');
    }

    try {
      isSending.value = true;
      await client.value.send(message);
    } catch (error) {
      // Queue message on send failure
      queueMessage(message);
      throw error;
    } finally {
      isSending.value = false;
    }
  }

  /**
   * Send presence stanza
   */
  async function sendPresence(show?: string, status?: string): Promise<void> {
    const presence = xml('presence');

    if (show) {
      presence.c('show').t(show);
    }

    if (status) {
      presence.c('status').t(status);
    }

    await sendMessage(presence);
  }

  /**
   * Queue a message for later sending
   */
  function queueMessage(message: XMLElement): void {
    const queuedMessage: XmppMessage = {
      element: message,
      timestamp: Date.now(),
      queued: true,
    };

    queuedMessages.value.push(queuedMessage);
  }

  /**
   * Send all queued messages
   */
  async function sendQueuedMessages(): Promise<void> {
    if (!client.value || queuedMessages.value.length === 0) {
      return;
    }

    const messagesToSend = [...queuedMessages.value];
    queuedMessages.value = [];

    for (const queuedMessage of messagesToSend) {
      try {
        await sendMessage(queuedMessage.element);
      } catch (error) {
        // If sending fails, the message will be re-queued by sendMessage
        console.warn('Failed to send queued message:', error);
      }
    }
  }

  /**
   * Clear all queued messages
   */
  function clearQueue(): void {
    queuedMessages.value = [];
  }

  /**
   * Create a message stanza
   */
  function createMessage(to: string, body: string, type: 'chat' | 'groupchat' = 'chat'): XMLElement {
    return xml('message', { to, type })
      .c('body')
      .t(body);
  }

  /**
   * Create a presence stanza
   */
  function createPresence(to?: string, type?: string): XMLElement {
    const attrs: Record<string, string> = {};
    if (to) attrs.to = to;
    if (type) attrs.type = type;

    return xml('presence', attrs);
  }

  /**
   * Create an IQ stanza
   */
  function createIq(to: string, type: 'get' | 'set' | 'result' | 'error', id?: string): XMLElement {
    const attrs: Record<string, string> = { to, type };
    if (id) attrs.id = id;

    return xml('iq', attrs);
  }

  /**
   * Extract text content from a stanza
   */
  function getStanzaText(stanza: XMLElement, tagName: string): string | null {
    const element = stanza.getChild(tagName);
    return element?.getText() || null;
  }

  /**
   * Check if stanza is from a specific JID
   */
  function isFromJid(stanza: XMLElement, jid: string): boolean {
    return stanza.attrs.from === jid;
  }

  /**
   * Check if stanza has a specific type
   */
  function hasStanzaType(stanza: XMLElement, type: string): boolean {
    return stanza.attrs.type === type;
  }

  // Watch client changes to send queued messages when connected
  watch(client, (newClient) => {
    if (newClient && hasQueuedMessages.value) {
      // Send queued messages after a short delay to ensure connection is stable
      setTimeout(() => {
        sendQueuedMessages().catch(console.error);
      }, 1000);
    }
  });

  return {
    // State
    queuedMessages,
    isSending,

    // Computed
    canSend,
    hasQueuedMessages,
    messagingState,

    // Methods
    sendMessage,
    sendPresence,
    queueMessage,
    sendQueuedMessages,
    clearQueue,

    // Stanza utilities
    createMessage,
    createPresence,
    createIq,
    getStanzaText,
    isFromJid,
    hasStanzaType,
  };
}

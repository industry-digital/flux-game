import type { Client as XmppClient } from '@xmpp/client';
import type { Element as XMLElement } from '@xmpp/xml';

// ============================================================================
// Connection Types
// ============================================================================

export type XmppConnectionStatus = 'disconnected' | 'connecting' | 'online' | 'error';

export interface XmppConnectionConfig {
  service: string;
  domain?: string;
  username: string;
  password: string;
  timeout?: number;
}

export type XmppConnectionState = {
  status: XmppConnectionStatus;
  client: XmppClient | null;
  error: string | null;
};

// ============================================================================
// Authentication Types
// ============================================================================

export type XmppCredentials = {
  username: string;
  password: string;
};

export type XmppAuthState = {
  jid: string | null;
  username: string | null;
  authenticated: boolean;
  error: string | null;
};

// ============================================================================
// Reconnection Types
// ============================================================================

export interface ReconnectConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export type ReconnectState = {
  attempts: number;
  isReconnecting: boolean;
  nextAttemptAt: number | null;
};

// ============================================================================
// World Server Types
// ============================================================================

export type WorldServerStatus = 'waiting' | 'handshaking' | 'ready' | 'failed';

export type WorldServerState = {
  status: WorldServerStatus;
  serverJid: string | null;
  handshakeComplete: boolean;
};

// ============================================================================
// Messaging Types
// ============================================================================

export type XmppMessage = {
  element: XMLElement;
  timestamp: number;
  queued?: boolean;
};

export type MessagingState = {
  queuedMessages: XmppMessage[];
  canSend: boolean;
};

// ============================================================================
// Error Types
// ============================================================================

export type XmppErrorType =
  | { type: 'connection'; cause: 'network' | 'timeout' | 'service' }
  | { type: 'auth'; cause: 'credentials' | 'sasl' | 'forbidden' }
  | { type: 'protocol'; cause: 'handshake' | 'stanza' | 'version' }
  | { type: 'world-server'; cause: 'timeout' | 'rejection' | 'protocol' };

export type XmppError = {
  error: XmppErrorType;
  message: string;
  timestamp: number;
}

// ============================================================================
// Main Client Types
// ============================================================================

export type XmppClientStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type XmppClientConfig = {
  service: string;
  domain?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  delayPresence?: boolean;
  reconnect?: ReconnectConfig;
}

export type XmppClientState = {
  /**
   * The current connection status of the XMPP client
   */
  status: XmppClientStatus;

  /**
   * Whether the client is ready to send messages (WebSocket is open and XMPP is online)
   */
  ready: boolean;

  /**
   * The current error state of the XMPP client
   */
  error: string | null;

  /**
   * The fully qualified JID of the connected XMPP client
   */
  jid: string | null;

  /**
   * The local part of the connected XMPP client's JID
   */
  username: string | null;

  /**
   * The fully qualified JID of the World Server that is handling the XMPP client's requests
   */
  serverFullJid: string | null;

  /**
   * The number of reconnection attempts made by the XMPP client
   */
  reconnectAttempts: number;
};

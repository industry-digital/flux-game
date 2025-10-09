import { describe, it, expect, beforeEach } from 'vitest';
import { ref, nextTick, type Ref } from 'vue';
import { useXmppAuth } from './auth';
import type { XmppCredentials } from '~/types/xmpp';

describe('useXmppAuth', () => {
  let credentials: Ref<XmppCredentials | null>;

  beforeEach(() => {
    credentials = ref<XmppCredentials | null>(null);
  });

  describe('credential validation', () => {
    it('should validate empty credentials', () => {
      const auth = useXmppAuth(credentials);

      expect(auth.hasCredentials.value).toBe(false);
      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('No credentials provided');
    });

    it('should validate missing username', () => {
      credentials.value = { username: '', password: 'password123' };
      const auth = useXmppAuth(credentials);

      expect(auth.hasCredentials.value).toBe(false);
      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('Username and password are required');
    });

    it('should validate missing password', () => {
      credentials.value = { username: 'testuser', password: '' };
      const auth = useXmppAuth(credentials);

      expect(auth.hasCredentials.value).toBe(false);
      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('Username and password are required');
    });

    it('should reject username with @ symbol', () => {
      credentials.value = { username: 'test@domain.com', password: 'password123' };
      const auth = useXmppAuth(credentials);

      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('Username should not include domain (@)');
    });

    it('should reject overly long username', () => {
      const longUsername = 'a'.repeat(65);
      credentials.value = { username: longUsername, password: 'password123' };
      const auth = useXmppAuth(credentials);

      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('Username too long (max 64 characters)');
    });

    it('should accept valid credentials', () => {
      credentials.value = { username: 'testuser', password: 'password123' };
      const auth = useXmppAuth(credentials);

      expect(auth.hasCredentials.value).toBe(true);
      expect(auth.isValid.value).toBe(true);
      expect(auth.error.value).toBe(null);
    });
  });

  describe('JID generation', () => {
    it('should generate JID from username and domain', () => {
      const auth = useXmppAuth(credentials);
      const jid = auth.generateJid('testuser', 'example.com');

      expect(jid).toBe('testuser@example.com');
    });
  });

  describe('authentication state management', () => {
    it('should set authenticated state', () => {
      const auth = useXmppAuth(credentials);

      auth.setAuthenticated('testuser@example.com');

      expect(auth.jid.value).toBe('testuser@example.com');
      expect(auth.username.value).toBe('testuser');
      expect(auth.authenticated.value).toBe(true);
      expect(auth.error.value).toBe(null);
    });

    it('should set auth error state', () => {
      const auth = useXmppAuth(credentials);

      auth.setAuthError('Authentication failed');

      expect(auth.jid.value).toBe(null);
      expect(auth.username.value).toBe(null);
      expect(auth.authenticated.value).toBe(false);
      expect(auth.error.value).toBe('Authentication failed');
    });

    it('should clear auth state', () => {
      const auth = useXmppAuth(credentials);

      // Set some state first
      auth.setAuthenticated('testuser@example.com');

      // Then clear it
      auth.clearAuth();

      expect(auth.jid.value).toBe(null);
      expect(auth.username.value).toBe(null);
      expect(auth.authenticated.value).toBe(false);
      expect(auth.error.value).toBe(null);
    });
  });

  describe('reactive credential watching', () => {
    it('should react to credential changes', async () => {
      const auth = useXmppAuth(credentials);

      // Initially no credentials
      expect(auth.hasCredentials.value).toBe(false);

      // Add valid credentials
      credentials.value = { username: 'testuser', password: 'password123' };

      // Wait for reactivity to update
      await nextTick();

      expect(auth.hasCredentials.value).toBe(true);
      expect(auth.isValid.value).toBe(true);
      expect(auth.error.value).toBe(null);

      // Remove credentials
      credentials.value = null;

      // Wait for reactivity to update
      await nextTick();

      expect(auth.hasCredentials.value).toBe(false);
      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('No credentials provided');
    });

    it('should validate credentials reactively', async () => {
      const auth = useXmppAuth(credentials);

      // Set invalid credentials
      credentials.value = { username: 'test@domain.com', password: 'password123' };

      // Wait for reactivity to update
      await nextTick();

      expect(auth.isValid.value).toBe(false);
      expect(auth.error.value).toBe('Username should not include domain (@)');

      // Fix credentials
      credentials.value = { username: 'testuser', password: 'password123' };

      // Wait for reactivity to update
      await nextTick();

      expect(auth.isValid.value).toBe(true);
      expect(auth.error.value).toBe(null);
    });
  });

  describe('getValidCredentials', () => {
    it('should return null for invalid credentials', () => {
      credentials.value = { username: '', password: 'password123' };
      const auth = useXmppAuth(credentials);

      const validCreds = auth.getValidCredentials();

      expect(validCreds).toBe(null);
      expect(auth.error.value).toBe('Username and password are required');
    });

    it('should return credentials for valid input', () => {
      credentials.value = { username: 'testuser', password: 'password123' };
      const auth = useXmppAuth(credentials);

      const validCreds = auth.getValidCredentials();

      expect(validCreds).toEqual({ username: 'testuser', password: 'password123' });
      expect(auth.error.value).toBe(null);
    });
  });
});

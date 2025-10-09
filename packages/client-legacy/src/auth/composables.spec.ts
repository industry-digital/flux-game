import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import { useAuth } from './composables';
import { createComposableTestSuite } from '~/testing';

describe('useAuth', () => {
  const testSuite = createComposableTestSuite();

  beforeEach(() => {
    testSuite.setup();
  });

  afterEach(() => {
    testSuite.teardown();
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with null values when no JWT provided', () => {
      testSuite.runWithContext(() => {
        const jwt = ref<string | null>(null);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.jwt.value).toBe(null);
        expect(auth.username.value).toBe(null);
        expect(auth.jid.value).toBe(null);
        expect(auth.authError.value).toBe('');
        expect(auth.isAuthenticated.value).toBe(false);
      });
    });

    it('should process valid JWT and extract auth information', () => {
      testSuite.runWithContext(() => {
        const payload = { actor: 'flux:actor:pc:alice' };
        const encodedPayload = btoa(JSON.stringify(payload));
        const validJwt = `header.${encodedPayload}.signature`;

        const jwt = ref(validJwt);
        const auth = useAuth(jwt, { xmppDomain: 'game.example.com' });

        expect(auth.jwt.value).toBe(validJwt);
        expect(auth.username.value).toBe('flux:actor:pc:alice');
        expect(auth.jid.value).toBe('flux:actor:pc:alice@game.example.com');
        expect(auth.authError.value).toBe('');
        expect(auth.isAuthenticated.value).toBe(true);
      });
    });

    it('should use default XMPP domain from config', () => {
      testSuite.runWithContext(() => {
        const payload = { actor: 'flux:actor:pc:bob' };
        const encodedPayload = btoa(JSON.stringify(payload));
        const validJwt = `header.${encodedPayload}.signature`;

        const jwt = ref(validJwt);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.jid.value).toBe('flux:actor:pc:bob@test.example.com');
      });
    });
  });

  describe('reactive updates', () => {
    it('should update state when JWT changes', () => {
      testSuite.runWithContext(() => {
        const jwt = ref<string | null>(null);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        // Initially null
        expect(auth.isAuthenticated.value).toBe(false);

        // Set valid JWT
        const payload = { actor: 'flux:actor:pc:charlie' };
        const encodedPayload = btoa(JSON.stringify(payload));
        const validJwt = `header.${encodedPayload}.signature`;

        jwt.value = validJwt;

        expect(auth.username.value).toBe('flux:actor:pc:charlie');
        expect(auth.isAuthenticated.value).toBe(true);
        expect(auth.authError.value).toBe('');

        // Clear JWT
        jwt.value = null;

        expect(auth.username.value).toBe(null);
        expect(auth.jid.value).toBe(null);
        expect(auth.isAuthenticated.value).toBe(false);
        expect(auth.authError.value).toBe('');
      });
    });

    it('should handle JWT validation errors reactively', () => {
      testSuite.runWithContext(() => {
        const jwt = ref<string | null>(null);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        // Set invalid JWT
        jwt.value = 'invalid.jwt.token';

        expect(auth.username.value).toBe(null);
        expect(auth.jid.value).toBe(null);
        expect(auth.isAuthenticated.value).toBe(false);
        expect(auth.authError.value).toBe('Invalid JWT');

        // Set valid JWT to clear error
        const payload = { actor: 'flux:actor:pc:diana' };
        const encodedPayload = btoa(JSON.stringify(payload));
        const validJwt = `header.${encodedPayload}.signature`;

        jwt.value = validJwt;

        expect(auth.username.value).toBe('flux:actor:pc:diana');
        expect(auth.authError.value).toBe('');
        expect(auth.isAuthenticated.value).toBe(true);
      });
    });
  });

  describe('isMyActor functionality', () => {
    it('should correctly identify current actor', () => {
      testSuite.runWithContext(() => {
        const payload = { actor: 'flux:actor:pc:eve' };
        const encodedPayload = btoa(JSON.stringify(payload));
        const validJwt = `header.${encodedPayload}.signature`;

        const jwt = ref(validJwt);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.isMyActor.value('flux:actor:pc:eve')).toBe(true);
        expect(auth.isMyActor.value('flux:actor:pc:alice')).toBe(false);
        expect(auth.isMyActor.value(undefined)).toBe(false);
      });
    });

    it('should return false when not authenticated', () => {
      testSuite.runWithContext(() => {
        const jwt = ref<string | null>(null);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.isMyActor.value('flux:actor:pc:anyone')).toBe(false);
      });
    });

    it('should update when authentication changes', () => {
      testSuite.runWithContext(() => {
        const jwt = ref<string | null>(null);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        // Initially false
        expect(auth.isMyActor.value('flux:actor:pc:frank')).toBe(false);

        // Set JWT for frank
        const payload = { actor: 'flux:actor:pc:frank' };
        const encodedPayload = btoa(JSON.stringify(payload));
        const validJwt = `header.${encodedPayload}.signature`;

        jwt.value = validJwt;

        expect(auth.isMyActor.value('flux:actor:pc:frank')).toBe(true);
        expect(auth.isMyActor.value('flux:actor:pc:grace')).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle JWT without actor claim', () => {
      testSuite.runWithContext(() => {
        const payload = { sub: 'user123', iat: Date.now() };
        const encodedPayload = btoa(JSON.stringify(payload));
        const jwtWithoutActor = `header.${encodedPayload}.signature`;

        const jwt = ref(jwtWithoutActor);
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.username.value).toBe(null);
        expect(auth.jid.value).toBe(null);
        expect(auth.isAuthenticated.value).toBe(false);
        expect(auth.authError.value).toBe('Invalid JWT');
      });
    });

    it('should handle malformed JWT gracefully', () => {
      testSuite.runWithContext(() => {
        const jwt = ref('completely.invalid.jwt');
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.username.value).toBe(null);
        expect(auth.jid.value).toBe(null);
        expect(auth.isAuthenticated.value).toBe(false);
        expect(auth.authError.value).toBe('Invalid JWT');
      });
    });

    it('should handle empty JWT string', () => {
      testSuite.runWithContext(() => {
        const jwt = ref('');
        const auth = useAuth(jwt, { xmppDomain: 'test.example.com' });

        expect(auth.username.value).toBe(null);
        expect(auth.jid.value).toBe(null);
        expect(auth.isAuthenticated.value).toBe(false);
        expect(auth.authError.value).toBe(''); // Empty string is treated as no JWT
      });
    });
  });
});

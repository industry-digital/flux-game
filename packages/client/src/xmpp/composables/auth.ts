import { ref, computed, watch, type Ref } from 'vue';
import type {
  XmppCredentials,
  XmppAuthState
} from '~/types/xmpp';

/**
 * XMPP authentication flow composable
 *
 * Manages authentication state and JID resolution.
 * Works with credentials reactively and provides auth-specific error handling.
 *
 * @param credentials - Reactive credentials reference
 * @returns Reactive authentication state
 */
export function useXmppAuth(credentials: Ref<XmppCredentials | null>) {
  // Internal state
  const jid = ref<string | null>(null);
  const username = ref<string | null>(null);
  const authenticated = ref(false);
  const error = ref<string | null>(null);

  // Computed properties
  const hasCredentials = computed(() =>
    !!(credentials.value?.username && credentials.value?.password)
  );

  const isValid = computed(() =>
    hasCredentials.value && !error.value
  );

  // Auth state object
  const authState = computed<XmppAuthState>(() => ({
    jid: jid.value,
    username: username.value,
    authenticated: authenticated.value,
    error: error.value,
  }));

  /**
   * Validate credentials format
   */
  function validateCredentials(creds: XmppCredentials | null): string | null {
    if (!creds) {
      return 'No credentials provided';
    }

    if (!creds.username || !creds.password) {
      return 'Username and password are required';
    }

    if (creds.username.trim().length === 0) {
      return 'Username cannot be empty';
    }

    if (creds.password.trim().length === 0) {
      return 'Password cannot be empty';
    }

    // Basic username validation (no @ symbol, reasonable length)
    if (creds.username.includes('@')) {
      return 'Username should not include domain (@)';
    }

    if (creds.username.length > 64) {
      return 'Username too long (max 64 characters)';
    }

    return null;
  }

  /**
   * Generate JID from username and domain
   */
  function generateJid(username: string, domain: string): string {
    return `${username}@${domain}`;
  }

  /**
   * Set authentication success state
   */
  function setAuthenticated(userJid: string): void {
    const localPart = userJid.split('@')[0];

    jid.value = userJid;
    username.value = localPart;
    authenticated.value = true;
    error.value = null;
  }

  /**
   * Set authentication error state
   */
  function setAuthError(errorMessage: string): void {
    jid.value = null;
    username.value = null;
    authenticated.value = false;
    error.value = errorMessage;
  }

  /**
   * Clear authentication state
   */
  function clearAuth(): void {
    jid.value = null;
    username.value = null;
    authenticated.value = false;
    error.value = null;
  }

  /**
   * Get current credentials if valid
   */
  function getValidCredentials(): XmppCredentials | null {
    if (!credentials.value) return null;

    const validationError = validateCredentials(credentials.value);
    if (validationError) {
      setAuthError(validationError);
      return null;
    }

    return credentials.value;
  }

  // Watch credentials changes and validate
  watch(credentials, (newCredentials) => {
    if (!newCredentials) {
      jid.value = null;
      username.value = null;
      authenticated.value = false;
      error.value = 'No credentials provided';
      return;
    }

    const validationError = validateCredentials(newCredentials);
    if (validationError) {
      setAuthError(validationError);
    } else {
      // Clear error when credentials become valid
      error.value = null;
    }
  }, { immediate: true });

  return {
    // State
    jid,
    username,
    authenticated,
    error,

    // Computed
    hasCredentials,
    isValid,
    authState,

    // Methods
    validateCredentials,
    generateJid,
    setAuthenticated,
    setAuthError,
    clearAuth,
    getValidCredentials,
  };
}

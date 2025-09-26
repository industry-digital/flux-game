import { ref, computed, watch, type Ref } from 'vue';
import type { ActorURN } from '@flux/core';
import { extractActorFromJwt } from './util';

/**
 * Authentication state interface
 */
export interface AuthState {
  jwt: string | null;
  authError: string;
  username: ActorURN | null;
  jid: string | null;
}

/**
 * Authentication composable options
 */
export interface AuthConfig {
  xmppDomain?: string;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  xmppDomain: import.meta?.env?.VITE_XMPP_DOMAIN || 'fabric.flux.local',
};

/**
 * Vue composable for authentication state management
 *
 * Manages JWT tokens, extracts actor information, and provides
 * XMPP JID generation for the MUD client authentication flow.
 *
 * @param jwt - Reactive JWT token reference
 * @param config - Configuration options including XMPP domain
 * @returns Reactive authentication state
 */
export function useAuth(
  jwt: Ref<string | null>,
  config: AuthConfig = DEFAULT_AUTH_CONFIG,
) {

  // Internal reactive state
  const authError = ref<string>('');
  const username = ref<ActorURN | null>(null);
  const jid = ref<string | null>(null);

  // Watch JWT changes and update derived state
  watch(jwt, (newJwt) => {
    if (!newJwt) {
      username.value = null;
      jid.value = null;
      authError.value = '';
      return;
    }

    try {
      const extractedUsername = extractActorFromJwt(newJwt);
      const generatedJid = `${extractedUsername}@${config.xmppDomain}`;

      username.value = extractedUsername;
      jid.value = generatedJid;
      authError.value = '';
    } catch (error) {
      username.value = null;
      jid.value = null;
      authError.value = error instanceof Error ? error.message : 'Invalid JWT';
    }
  }, { immediate: true, flush: 'sync' });

  // Computed properties for convenience
  const isAuthenticated = computed(() => !!jwt.value && !!username.value);
  const isMyActor = computed(() => (actorUrn?: ActorURN): boolean => {
    return actorUrn === username.value;
  });

  return {
    // State
    jwt: jwt,
    authError: authError,
    username: username,
    jid: jid,

    // Computed
    isAuthenticated,
    isMyActor,
  };
}

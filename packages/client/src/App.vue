<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEnvironment } from '~/infrastructure/environment/composables';
import { useTheme } from '~/infrastructure/theme/composables';
import { useAuth } from '~/auth/composables';
import { useXmppClient } from '~/xmpp/composables/client';
import { useWorldServerProtocol } from '~/server/composables/protocol';
import { AuthForm } from '~/auth/components';
import { GameTerminal } from '~/terminal/components';

// ============================================================================
// COMPOSITION ROOT - Environment Configuration
// ============================================================================
// ONLY place that accesses import.meta.env
const env = useEnvironment();

// ============================================================================
// COMPOSITION ROOT - Theme Configuration
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _theme = useTheme('dark'); // Auto-applies theme via watchEffect

// ============================================================================
// COMPOSITION ROOT - Application State
// ============================================================================
const jwt = ref<string | null>(env.VITE_TEST_JWTS.split(' ')[0] || null);

// ============================================================================
// COMPOSITION ROOT - Authentication Layer (JWT → Actor + JID)
// ============================================================================
const auth = useAuth(jwt, { xmppDomain: env.VITE_XMPP_DOMAIN });

// ============================================================================
// COMPOSITION ROOT - XMPP Credentials Bridge (Actor + JWT → XMPP credentials)
// ============================================================================
const xmppCredentials = computed(() => {
  if (!auth.username.value || !auth.jwt.value) return null;
  return {
    username: auth.username.value,
    password: auth.jwt.value  // JWT as password
  };
});

// ============================================================================
// COMPOSITION ROOT - XMPP Transport Layer
// ============================================================================
const xmppClient = useXmppClient(xmppCredentials, {
  service: env.VITE_XMPP_SERVICE,
  domain: env.VITE_XMPP_DOMAIN
});

// ============================================================================
// COMPOSITION ROOT - Game Protocol Layer
// ============================================================================
const worldServer = useWorldServerProtocol(computed(() => xmppClient.client.value));

// ============================================================================
// COMPOSITION ROOT - Application State
// ============================================================================
const appReady = computed(() =>
  auth.isAuthenticated.value &&
  xmppClient.connection.value?.status?.value == 'online' &&
  worldServer.ready.value
);

const isConnecting = computed(() =>
  auth.isAuthenticated.value &&
  (xmppClient.status === 'connecting' || worldServer.handshaking.value)
);

const connectionError = computed(() =>
  auth.authError.value ||
  xmppClient.error ||
  (worldServer.failed.value ? 'World server connection failed' : '')
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================
const handleAuthSubmit = (submittedJwt: string) => {
  if (!submittedJwt.trim()) {
    return;
  }
  jwt.value = submittedJwt;
};
</script>

<template>
  <div class="app">
    <!-- Authentication Screen -->
    <div v-if="!auth.isAuthenticated.value" class="auth-screen">
      <div class="auth-container">
        <AuthForm
          :test-jwt="env.VITE_TEST_JWTS.split(' ')[0]"
          :test-jwts="env.VITE_TEST_JWTS"
          :is-loading="isConnecting"
          :error="connectionError"
          @submit="handleAuthSubmit"
        />

        <!-- Connection Status -->
        <div v-if="isConnecting" class="connection-status">
          <div v-if="xmppClient.status === 'connecting'" class="status-message connecting">
            Connecting to XMPP server...
          </div>
          <div v-if="xmppClient.status === 'reconnecting'" class="status-message reconnecting">
            Reconnecting... (attempt {{ xmppClient.reconnectAttempts }})
          </div>
          <div v-if="worldServer.handshaking.value" class="status-message handshaking">
            Handshaking with world server...
          </div>
        </div>
      </div>
    </div>

    <!-- Game Screen -->
    <div v-else-if="appReady" class="game-screen">
      <GameTerminal
        :current-actor="auth.username.value"
        :xmpp-client="xmppClient"
        :world-server="worldServer"
      />
    </div>

    <!-- Loading Screen -->
    <div v-else class="loading-screen">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-message">
          <div v-if="xmppClient.status !== 'connected'">Connecting to XMPP...</div>
          <div v-else-if="!worldServer.ready.value">Connecting to world server...</div>
          <div v-else>Initializing game...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================================ */
/* APP LAYOUT */
/* ============================================================================ */
.app {
  background-color: var(--color-background);
  color: var(--color-text);
  min-height: 100vh;
  font-family: monospace;
}

/* ============================================================================ */
/* AUTHENTICATION SCREEN */
/* ============================================================================ */
.auth-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--color-background);
}

.auth-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 32rem;
  width: 100%;
  padding: 2rem;
}

.connection-status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: center;
}

.status-message {
  font-size: 0.875rem;
  font-family: monospace;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.status-message.connecting {
  color: var(--color-info);
  background-color: rgba(59, 130, 246, 0.1);
}

.status-message.reconnecting {
  color: var(--color-warning);
  background-color: rgba(245, 158, 11, 0.1);
}

.status-message.handshaking {
  color: var(--color-primary);
  background-color: rgba(16, 185, 129, 0.1);
}

/* ============================================================================ */
/* GAME SCREEN */
/* ============================================================================ */
.game-screen {
  height: 100vh;
  background-color: var(--color-background);
}

/* ============================================================================ */
/* LOADING SCREEN */
/* ============================================================================ */
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--color-background);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  color: var(--color-text-secondary);
  font-family: monospace;
  font-size: 0.875rem;
  text-align: center;
}
</style>

<style>
/* ============================================================================ */
/* GLOBAL STYLES */
/* ============================================================================ */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: monospace;
  background-color: var(--color-background);
  color: var(--color-text);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

#app {
  min-height: 100vh;
}
</style>

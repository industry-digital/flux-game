<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEnvironment } from '~/infrastructure/environment/composables';
import { useAuth } from '~/auth/composables';
import { useXmppClient } from '~/xmpp/composables/client';
import { useWorldServerProtocol } from '~/server/composables/protocol';

// ============================================================================
// COMPOSITION ROOT - Environment Configuration
// ============================================================================
// ONLY place that accesses import.meta.env
const env = useEnvironment();

// ============================================================================
// COMPOSITION ROOT - Application State
// ============================================================================
const jwt = ref<string | null>(env.VITE_TEST_JWT || null);

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
  xmppClient.connected.value &&
  worldServer.ready.value
);

const isConnecting = computed(() =>
  auth.isAuthenticated.value &&
  (xmppClient.connecting.value || worldServer.handshaking.value)
);

const connectionError = computed(() =>
  auth.authError.value ||
  xmppClient.error.value ||
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
          :test-jwt="env.VITE_TEST_JWT"
          :test-jwts="env.VITE_TEST_JWTS"
          :is-loading="isConnecting"
          :error="connectionError"
          @submit="handleAuthSubmit"
        />

        <!-- Connection Status -->
        <div v-if="isConnecting" class="connection-status">
          <div v-if="xmppClient.connecting.value" class="status-message connecting">
            Connecting to XMPP server...
          </div>
          <div v-if="xmppClient.reconnecting.value" class="status-message reconnecting">
            Reconnecting... (attempt {{ xmppClient.reconnectAttempts.value }})
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
          <div v-if="!xmppClient.connected.value">Connecting to XMPP...</div>
          <div v-else-if="!worldServer.ready.value">Connecting to world server...</div>
          <div v-else>Initializing game...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logo.vite:hover {
  filter: drop-shadow(0 0 2em #747bff);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #249b73);
}

</style>
<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: 0.75s;
}

.logo.tauri:hover {
  filter: drop-shadow(0 0 2em #24c8db);
}

.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }
  button:active {
    background-color: #0f0f0f69;
  }
}

</style>

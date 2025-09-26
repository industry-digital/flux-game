<template>
  <div class="game-terminal">
    <!-- Terminal Header -->
    <div class="terminal-header">
      <div class="status-bar">
        <div class="connection-status">
          <span class="status-indicator connected"></span>
          <span class="status-text">Connected</span>
        </div>
        <div class="actor-info">
          <span class="actor-label">Actor:</span>
          <span class="actor-name">{{ formatActorName(currentActor) }}</span>
        </div>
      </div>
    </div>

    <!-- Terminal Content -->
    <div class="terminal-content">
      <div class="welcome-message">
        <div class="ascii-art">
          <pre>
 ███████╗██╗     ██╗   ██╗██╗  ██╗
 ██╔════╝██║     ██║   ██║╚██╗██╔╝
 █████╗  ██║     ██║   ██║ ╚███╔╝
 ██╔══╝  ██║     ██║   ██║ ██╔██╗
 ██║     ███████╗╚██████╔╝██╔╝ ██╗
 ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝
          </pre>
        </div>
        <div class="welcome-text">
          <p>Welcome to the Flux Game Client</p>
          <p>Connected as: <strong>{{ formatActorName(currentActor) }}</strong></p>
          <p>XMPP Status: <span class="status-connected">Connected</span></p>
          <p>World Server: <span class="status-connected">Ready</span></p>
        </div>
      </div>

      <!-- Command Input Area -->
      <div class="command-area">
        <div class="command-prompt">
          <span class="prompt-symbol">&gt;</span>
          <input
            v-model="commandInput"
            type="text"
            class="command-input"
            placeholder="Enter command..."
            @keyup.enter="handleCommand"
          />
        </div>
      </div>

      <!-- Debug Info -->
      <div class="debug-info">
        <details>
          <summary>Debug Information</summary>
          <div class="debug-content">
            <div><strong>Current Actor:</strong> {{ currentActor }}</div>
            <div><strong>XMPP Client:</strong> {{ xmppClient ? 'Connected' : 'Not Connected' }}</div>
            <div><strong>World Server:</strong> {{ worldServer ? 'Connected' : 'Not Connected' }}</div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ActorURN } from '@flux/core';

interface Props {
  currentActor: ActorURN | null;
  xmppClient: any; // TODO: Type this properly when XMPP client types are available
  worldServer: any; // TODO: Type this properly when world server types are available
}

const props = defineProps<Props>();

// Local state
const commandInput = ref('');

/**
 * Format actor name for display (strip flux.actor. prefix)
 */
function formatActorName(actor: ActorURN | null): string {
  if (!actor) return 'Unknown';
  return actor.replace(/^flux\.actor\./, '');
}

/**
 * Handle command input
 */
function handleCommand() {
  if (!commandInput.value.trim()) return;

  // TODO: Implement command handling
  console.log('Command entered:', commandInput.value);

  // Clear input
  commandInput.value = '';
}
</script>

<style scoped>
.game-terminal {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: monospace;
}

/* ============================================================================ */
/* TERMINAL HEADER */
/* ============================================================================ */
.terminal-header {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0.75rem 1rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-success);
}

.status-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.actor-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.actor-label {
  color: var(--color-text-secondary);
}

.actor-name {
  color: var(--color-primary);
  font-weight: bold;
}

/* ============================================================================ */
/* TERMINAL CONTENT */
/* ============================================================================ */
.terminal-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.ascii-art {
  color: var(--color-primary);
  font-size: 0.75rem;
  line-height: 1;
}

.ascii-art pre {
  margin: 0;
}

.welcome-text {
  text-align: center;
  color: var(--color-text-secondary);
}

.welcome-text p {
  margin: 0.25rem 0;
}

.welcome-text strong {
  color: var(--color-text);
}

.status-connected {
  color: var(--color-success);
  font-weight: bold;
}

/* ============================================================================ */
/* COMMAND AREA */
/* ============================================================================ */
.command-area {
  margin-top: auto;
}

.command-prompt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  padding: 0.5rem;
}

.prompt-symbol {
  color: var(--color-primary);
  font-weight: bold;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-family: monospace;
  font-size: 1rem;
}

.command-input::placeholder {
  color: var(--color-text-secondary);
}

/* ============================================================================ */
/* DEBUG INFO */
/* ============================================================================ */
.debug-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.debug-info details {
  color: var(--color-text-secondary);
}

.debug-info summary {
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.debug-info summary:hover {
  color: var(--color-text);
}

.debug-content {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--color-surface);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.debug-content div {
  margin: 0.25rem 0;
}

.debug-content strong {
  color: var(--color-text);
}
</style>

<template>
  <div class="auth-form">
    <div class="auth-header">
      <h1 class="auth-title">XMPP Game Client</h1>
      <p class="auth-subtitle">
        {{ showJwtSelection ? 'Select an actor to connect' : 'Enter your JWT to connect' }}
      </p>
    </div>

    <!-- JWT Selection Menu -->
    <div v-if="showJwtSelection" class="jwt-selection">
      <label class="field-label">Available Actors</label>
      <div class="actor-grid">
        <button
          v-for="(option, index) in jwtOptions"
          :key="index"
          class="actor-button"
          :disabled="isLoading"
          @click="handleJwtSelect(option.token)"
        >
          {{ option.displayName }}
        </button>
      </div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <!-- Fallback JWT Input Form -->
    <form v-else class="jwt-input-form" @submit.prevent="handleSubmit">
      <div class="field-group">
        <label for="jwt" class="field-label">JWT Token</label>
        <div class="input-group">
          <input
            id="jwt"
            v-model="jwt"
            type="password"
            placeholder="Enter your JWT token"
            class="jwt-input"
            :disabled="isLoading"
          />
          <button
            type="button"
            class="paste-button"
            :disabled="isLoading"
            @click="handlePaste"
          >
            Paste
          </button>
        </div>
      </div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      <button
        type="submit"
        class="submit-button"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Connecting...' : 'Connect' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { extractActorFromJwt } from '~/auth/util';

interface JwtOption {
  token: string;
  actor: string;
  displayName: string;
}

interface Props {
  testJwt?: string;
  testJwts?: string;
  isLoading?: boolean;
  error?: string;
}

interface Emits {
  (e: 'submit', jwt: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  testJwt: '',
  testJwts: '',
  isLoading: false,
  error: '',
});

const emit = defineEmits<Emits>();

// Local state
const jwt = ref<string>(props.testJwt || '');

/**
 * Parse JWT and extract actor claim, returning null if invalid
 */
function parseJwtActor(jwt: string): string | null {
  try {
    return extractActorFromJwt(jwt);
  } catch (error) {
    console.warn('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Format actor name for display (strip flux.actor. prefix)
 */
function formatActorName(actor: string): string {
  return actor.replace(/^flux\.actor\./, '');
}

// Parse available JWT options from props
const jwtOptions = computed((): JwtOption[] => {
  if (!props.testJwts) return [];

  const tokens = props.testJwts.trim().split(/\s+/).filter(Boolean);
  const options: JwtOption[] = [];

  for (const token of tokens) {
    const actor = parseJwtActor(token);
    if (actor) {
      options.push({
        token,
        actor,
        displayName: formatActorName(actor)
      });
    }
  }

  return options;
});

// Show JWT selection if we have options, otherwise show input field
const showJwtSelection = computed(() => jwtOptions.value.length > 0);

const handleSubmit = () => {
  emit('submit', jwt.value);
};

const handleJwtSelect = (selectedJwt: string) => {
  emit('submit', selectedJwt);
};

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText();
    jwt.value = text;
  } catch (err) {
    console.error('Failed to read clipboard:', err);
  }
};
</script>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.auth-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auth-title {
  font-size: 1.5rem;
  font-family: monospace;
  font-weight: bold;
  color: #10b981;
  margin: 0;
}

.auth-subtitle {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.jwt-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-family: monospace;
  color: white;
  margin-bottom: 0.5rem;
}

.actor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.actor-button {
  padding: 0.75rem 1rem;
  background-color: #374151;
  color: white;
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.actor-button:hover:not(:disabled) {
  background-color: #4b5563;
  border-color: #6b7280;
}

.actor-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.jwt-input-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.jwt-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: #1f2937;
  color: white;
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  font-family: monospace;
}

.jwt-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.jwt-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.paste-button {
  padding: 0.75rem 1rem;
  background-color: #374151;
  color: white;
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.2s;
}

.paste-button:hover:not(:disabled) {
  background-color: #4b5563;
  border-color: #6b7280;
}

.paste-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-button {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-family: monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #059669;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  font-family: monospace;
}
</style>

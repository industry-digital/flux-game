<template>
  <div class="command-input">
    <div class="command-input__container">
      <!-- Input field -->
      <div class="command-input__field-wrapper">
        <input
          ref="inputRef"
          v-model="currentInput"
          @keydown="handleKeydown"
          @input="handleInput"
          class="command-input__field"
          :placeholder="placeholder"
          :disabled="disabled"
          autocomplete="off"
          spellcheck="false"
        />

        <!-- Submit button -->
        <button
          @click="submitCommand"
          :disabled="disabled || !canSubmit"
          class="command-input__submit"
          title="Submit Command (Enter)"
        >
          ⚡
        </button>
      </div>

      <!-- Command suggestions -->
      <div
        v-if="showSuggestions && suggestions.length > 0"
        class="command-input__suggestions"
      >
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          @click="applySuggestion(suggestion)"
          class="command-input__suggestion"
          :class="{ 'command-input__suggestion--highlighted': index === selectedSuggestionIndex }"
        >
          <CommandSyntax :command="suggestion.command" />
          <span class="command-input__suggestion-desc">{{ suggestion.description }}</span>
        </div>
      </div>
    </div>

    <!-- Command history -->
    <div v-if="showHistory && history.length > 0" class="command-input__history">
      <h4 class="command-input__history-title">Recent Commands</h4>
      <div class="command-input__history-list">
        <button
          v-for="(command, index) in recentHistory"
          :key="index"
          @click="applyHistoryCommand(command)"
          class="command-input__history-item"
        >
          <MonoText>{{ command }}</MonoText>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { CommandSyntax, MonoText } from '@flux/ui';

interface CommandSuggestion {
  command: string;
  description: string;
  category?: string;
}

interface Props {
  placeholder?: string;
  disabled?: boolean;
  maxHistory?: number;
  showSuggestions?: boolean;
  showHistory?: boolean;
}

interface Emits {
  (e: 'command-submitted', command: string): void;
  (e: 'input-changed', input: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Enter command (e.g., "attack bob", "defend", "move north")',
  disabled: false,
  maxHistory: 10,
  showSuggestions: true,
  showHistory: false,
});

const emit = defineEmits<Emits>();

// Reactive state
const inputRef = ref<HTMLInputElement>();
const currentInput = ref('');
const history = ref<string[]>([]);
const selectedSuggestionIndex = ref(-1);

// Command suggestions based on Universal Intent System
const baseSuggestions: CommandSuggestion[] = [
  { command: 'attack [target]', description: 'Attack a target with your weapon', category: 'combat' },
  { command: 'defend', description: 'Take a defensive stance', category: 'combat' },
  { command: 'move [direction/distance]', description: 'Move to a new position', category: 'movement' },
  { command: 'advance [distance]', description: 'Move forward towards enemies', category: 'movement' },
  { command: 'retreat [distance]', description: 'Move away from enemies', category: 'movement' },
  { command: 'target [actor]', description: 'Select a target for attacks', category: 'targeting' },
  { command: 'reload', description: 'Reload your weapon', category: 'equipment' },
  { command: 'ready [weapon]', description: 'Ready a different weapon', category: 'equipment' },
  { command: 'wait', description: 'Skip your turn', category: 'utility' },
  { command: 'help', description: 'Show available commands', category: 'utility' },
];

// Computed properties
const canSubmit = computed(() => {
  return currentInput.value.trim().length > 0;
});

const suggestions = computed(() => {
  if (!currentInput.value.trim()) {
    return baseSuggestions.slice(0, 5); // Show top 5 when empty
  }

  const input = currentInput.value.toLowerCase().trim();
  return baseSuggestions.filter(suggestion =>
    suggestion.command.toLowerCase().includes(input) ||
    suggestion.description.toLowerCase().includes(input)
  ).slice(0, 8); // Show up to 8 filtered suggestions
});

const recentHistory = computed(() => {
  return history.value.slice(-props.maxHistory).reverse();
});

// Methods
const submitCommand = () => {
  const command = currentInput.value.trim();
  if (!command || props.disabled) return;

  // Add to history (avoid duplicates)
  if (!history.value.includes(command)) {
    history.value.push(command);

    // Keep history within limits
    if (history.value.length > props.maxHistory) {
      history.value = history.value.slice(-props.maxHistory);
    }
  }

  // Emit the command
  emit('command-submitted', command);

  // Clear input
  currentInput.value = '';
  selectedSuggestionIndex.value = -1;

  // Focus input for next command
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const applySuggestion = (suggestion: CommandSuggestion) => {
  currentInput.value = suggestion.command.replace(/\[.*?\]/g, ''); // Remove placeholder brackets
  selectedSuggestionIndex.value = -1;

  nextTick(() => {
    inputRef.value?.focus();
    // Position cursor at end
    const input = inputRef.value;
    if (input) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
};

const applyHistoryCommand = (command: string) => {
  currentInput.value = command;
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const handleInput = () => {
  selectedSuggestionIndex.value = -1;
  emit('input-changed', currentInput.value);
};

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      if (selectedSuggestionIndex.value >= 0 && suggestions.value.length > 0) {
        applySuggestion(suggestions.value[selectedSuggestionIndex.value]);
      } else {
        submitCommand();
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (suggestions.value.length > 0) {
        selectedSuggestionIndex.value = selectedSuggestionIndex.value <= 0
          ? suggestions.value.length - 1
          : selectedSuggestionIndex.value - 1;
      }
      break;

    case 'ArrowDown':
      event.preventDefault();
      if (suggestions.value.length > 0) {
        selectedSuggestionIndex.value = selectedSuggestionIndex.value >= suggestions.value.length - 1
          ? 0
          : selectedSuggestionIndex.value + 1;
      }
      break;

    case 'Escape':
      event.preventDefault();
      selectedSuggestionIndex.value = -1;
      currentInput.value = '';
      break;

    case 'Tab':
      event.preventDefault();
      if (selectedSuggestionIndex.value >= 0 && suggestions.value.length > 0) {
        applySuggestion(suggestions.value[selectedSuggestionIndex.value]);
      } else if (suggestions.value.length > 0) {
        applySuggestion(suggestions.value[0]);
      }
      break;
  }
};

// Focus input on mount
onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus();
  });
});

// Keyboard shortcuts
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // Focus input when user starts typing (if not already focused)
  if (
    !props.disabled &&
    event.target !== inputRef.value &&
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    inputRef.value?.focus();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.command-input {
  position: relative;
  width: 100%;
}

.command-input__container {
  position: relative;
}

.command-input__field-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.command-input__field {
  flex: 1;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 1rem;
  font-family: 'Inconsolata', 'Courier New', monospace;
  transition: border-color 0.2s ease;
}

.command-input__field:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(169, 182, 101, 0.1);
}

.command-input__field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.command-input__field::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.command-input__submit {
  padding: 12px 16px;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  color: var(--color-text-on-primary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.command-input__submit:hover:not(:disabled) {
  background: var(--color-accent);
  transform: translateY(-1px);
}

.command-input__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.command-input__suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.command-input__suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.command-input__suggestion:last-child {
  border-bottom: none;
}

.command-input__suggestion:hover,
.command-input__suggestion--highlighted {
  background: var(--color-hover);
}

.command-input__suggestion-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-left: 12px;
}

.command-input__history {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-secondary);
  border-radius: 8px;
}

.command-input__history-title {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.command-input__history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.command-input__history-item {
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.command-input__history-item:hover {
  background: var(--color-hover);
  border-color: var(--color-border-focus);
}
</style>

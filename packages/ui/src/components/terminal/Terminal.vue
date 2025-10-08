<template>
  <div
    :class="terminalClasses"
    class="terminal"
  >
    <!-- Terminal Header Slot -->
    <div v-if="$slots.header" class="terminal__header">
      <slot name="header" />
    </div>

    <!-- Terminal Viewport -->
    <div
      ref="viewportRef"
      class="terminal__viewport"
      :style="{ height: `${viewportHeight}px` }"
      @scroll="handleScroll"
    >
      <!-- Virtual Content Container -->
      <div
        class="terminal__content"
        :style="{
          height: `${contentHeight}px`,
          paddingTop: `${offsetTop}px`
        }"
      >
        <!-- Visible Terminal Entries -->
        <div
          v-for="(entry, index) in visibleEntries"
          :key="entry.id"
          class="terminal__entry"
          :class="getEntryClasses(entry)"
          :style="getEntryStyle(entry, index)"
        >
          <!-- Timestamp (if enabled) -->
          <div
            v-if="showTimestamps"
            class="terminal__timestamp"
          >
            {{ formatTimestamp(entry.timestamp) }}
          </div>

          <!-- Text Entry -->
          <div
            v-if="entry.type === 'text'"
            class="terminal__text"
          >
            {{ entry.content }}
          </div>

          <!-- Element Entry -->
          <component
            v-else-if="entry.type === 'element'"
            :is="entry.content"
            class="terminal__element"
          />
        </div>
      </div>
    </div>

    <!-- Terminal Footer Slot -->
    <div v-if="$slots.footer" class="terminal__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useTerminal } from './composables/useTerminal';
import { useVirtualizedList } from './composables/useVirtualizedList';
import { useTheme } from '../../infrastructure/theme/composables';
import type { TerminalEntry, TerminalConfig } from './composables/useTerminal';
import type { VirtualizationConfig } from './composables/useVirtualizedList';

interface Props {
  config?: TerminalConfig;
  virtualizationConfig?: VirtualizationConfig;
  themeName?: string;
  viewportHeight?: number;
}

interface Emits {
  (e: 'terminal-ready', terminal: ReturnType<typeof useTerminal>): void;
  (e: 'scroll', event: { scrollTop: number; scrollHeight: number; clientHeight: number }): void;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  virtualizationConfig: () => ({}),
  themeName: 'dark',
  viewportHeight: 400,
});

const emit = defineEmits<Emits>();

// Refs
const viewportRef = ref<HTMLElement>();

// Setup dependencies
const theme = useTheme(props.themeName as any);
const virtualization = useVirtualizedList<TerminalEntry>([], {
  viewportHeight: props.viewportHeight,
  ...props.virtualizationConfig,
});
const terminal = useTerminal(props.config, virtualization, theme);

// Computed properties
const terminalClasses = computed(() => [
  ...terminal.terminalClasses.value,
  'terminal--virtualized'
]);

const showTimestamps = computed(() => terminal.config.showTimestamps);

const visibleEntries = computed(() => virtualization.visibleItems.value);

const contentHeight = computed(() => virtualization.contentHeight.value);

const offsetTop = computed(() => {
  const { start } = virtualization.visibleRange.value;
  const itemHeight = props.virtualizationConfig.itemHeight || 24;

  if (typeof itemHeight === 'number') {
    return start * itemHeight;
  }

  // Dynamic height calculation
  let offset = 0;
  for (let i = 0; i < start; i++) {
    offset += itemHeight(i);
  }
  return offset;
});

// Methods
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  virtualization.scrollTop.value = target.scrollTop;
  virtualization.containerHeight.value = target.clientHeight;

  emit('scroll', {
    scrollTop: target.scrollTop,
    scrollHeight: target.scrollHeight,
    clientHeight: target.clientHeight,
  });
};

const getEntryClasses = (entry: TerminalEntry) => [
  `terminal__entry--${entry.type}`,
  {
    'terminal__entry--with-timestamp': showTimestamps.value,
  }
];

const getEntryStyle = (entry: TerminalEntry, index: number) => {
  const itemHeight = props.virtualizationConfig.itemHeight || 24;

  if (typeof itemHeight === 'number') {
    return { height: `${itemHeight}px` };
  }

  const { start } = virtualization.visibleRange.value;
  const actualIndex = start + index;
  return { height: `${itemHeight(actualIndex)}px` };
};

// Lifecycle
onMounted(async () => {
  await nextTick();

  // Sync viewport dimensions
  if (viewportRef.value) {
    virtualization.containerHeight.value = viewportRef.value.clientHeight;
  }

  // Emit terminal instance for parent access
  emit('terminal-ready', terminal);
});

// Expose terminal methods for template refs
defineExpose({
  terminal,
  virtualization,
  theme,
});
</script>

<style scoped>
.terminal {
  --terminal-bg: var(--color-surface);
  --terminal-text: var(--color-text);
  --terminal-border: var(--color-border);
  --terminal-timestamp: var(--color-text-secondary);
  --terminal-font-family: 'Inconsolata', 'Courier New', monospace;
  --terminal-font-size: 14px;
  --terminal-line-height: 1.4;

  display: flex;
  flex-direction: column;
  background: var(--terminal-bg);
  color: var(--terminal-text);
  font-family: var(--terminal-font-family);
  font-size: var(--terminal-font-size);
  border: 1px solid var(--terminal-border);
  border-radius: 4px;
  overflow: hidden;
}

.terminal--dark {
  --terminal-bg: #1e1e1e;
  --terminal-text: #d4d4d4;
  --terminal-border: #3e3e3e;
  --terminal-timestamp: #808080;
}

.terminal__header,
.terminal__footer {
  flex-shrink: 0;
  padding: 0.5rem;
  background: var(--color-surface-variant, var(--terminal-bg));
  border-bottom: 1px solid var(--terminal-border);
}

.terminal__footer {
  border-bottom: none;
  border-top: 1px solid var(--terminal-border);
}

.terminal__viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.terminal__content {
  position: relative;
  width: 100%;
}

.terminal__entry {
  display: flex;
  align-items: flex-start;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid transparent;
  min-height: 24px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.terminal__entry--with-timestamp {
  padding-left: 5rem; /* Space for timestamp */
}

.terminal__timestamp {
  position: absolute;
  left: 0.5rem;
  top: 0.25rem;
  width: 4rem;
  font-size: 0.75rem;
  color: var(--terminal-timestamp);
  user-select: none;
}

.terminal__text {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: var(--terminal-line-height);
}

.terminal__element {
  flex: 1;
  /* Allow elements to define their own styling */
}

/* Scrollbar styling for webkit browsers */
.terminal__viewport::-webkit-scrollbar {
  width: 8px;
}

.terminal__viewport::-webkit-scrollbar-track {
  background: var(--terminal-bg);
}

.terminal__viewport::-webkit-scrollbar-thumb {
  background: var(--terminal-border);
  border-radius: 4px;
}

.terminal__viewport::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary, #666);
}

/* Auto-scroll indicator */
.terminal--auto-scroll .terminal__viewport {
  scroll-behavior: smooth;
}
</style>

<template>
  <div class="combat-log">
    <!-- Header with controls -->
    <div class="combat-log__header">
      <h3 class="combat-log__title">Combat Log</h3>

      <div class="combat-log__controls">
        <!-- Filter dropdown -->
        <select
          v-model="selectedFilter"
          @change="updateFilter"
          class="combat-log__filter"
        >
          <option value="">All Events</option>
          <option value="combat">Combat</option>
          <option value="movement">Movement</option>
          <option value="system">System</option>
          <option value="narrative">Narrative</option>
        </select>

        <!-- Clear button -->
        <button
          @click="clearLog"
          class="combat-log__clear"
          title="Clear Log"
        >
          🗑️
        </button>

        <!-- Auto-scroll toggle -->
        <button
          @click="toggleAutoScroll"
          class="combat-log__auto-scroll"
          :class="{ 'combat-log__auto-scroll--active': autoScroll }"
          title="Toggle Auto-scroll"
        >
          📜
        </button>
      </div>
    </div>

    <!-- Log entries -->
    <div
      ref="logContainer"
      class="combat-log__container"
      @scroll="handleScroll"
    >
      <CleanList
        v-if="displayedEntries.length > 0"
        class="combat-log__list"
      >
        <div
          v-for="entry in displayedEntries"
          :key="entry.id"
          @click="selectEntry(entry)"
          class="combat-log__entry"
          :class="{
            'combat-log__entry--selected': selectedEntry?.id === entry.id,
            [`combat-log__entry--${getCategoryFromType(entry.type)}`]: true
          }"
        >
          <!-- Timestamp -->
          <div class="combat-log__timestamp">
            {{ formatTimestamp(entry.ts) }}
          </div>

          <!-- Event type badge -->
          <div class="combat-log__type-badge">
            {{ entry.type }}
          </div>

          <!-- Main content -->
          <div class="combat-log__content">
            <!-- Narrative (if available) -->
            <div
              v-if="'narrative' in entry && entry.narrative"
              class="combat-log__narrative"
            >
              {{ entry.narrative }}
            </div>

            <!-- Technical details -->
            <div class="combat-log__details">
              <MonoText>{{ entry.type }}: {{ formatEventData(entry) }}</MonoText>
            </div>

            <!-- Actors involved -->
            <div
              v-if="entry.actor"
              class="combat-log__actors"
            >
              <span
                class="combat-log__actor-tag"
              >
                {{ getActorName(entry.actor) }}
              </span>
            </div>
          </div>
        </div>
      </CleanList>

      <!-- Empty state -->
      <div v-else class="combat-log__empty">
        <p class="combat-log__empty-text">No combat events yet</p>
        <p class="combat-log__empty-hint">
          Events will appear here as combat progresses
        </p>
      </div>
    </div>

    <!-- Entry details panel (when entry selected) -->
    <div
      v-if="selectedEntry && showDetails"
      class="combat-log__details-panel"
    >
      <div class="combat-log__details-header">
        <h4>Event Details</h4>
        <button
          @click="selectedEntry = null"
          class="combat-log__details-close"
        >
          ✕
        </button>
      </div>

      <div class="combat-log__details-content">
        <div class="combat-log__detail-row">
          <label>Type:</label>
          <MonoText>{{ selectedEntry.type }}</MonoText>
        </div>

        <div class="combat-log__detail-row">
          <label>Time:</label>
          <span>{{ formatFullTimestamp(selectedEntry.ts) }}</span>
        </div>

        <div class="combat-log__detail-row">
          <label>Category:</label>
          <span>{{ getCategoryFromType(selectedEntry.type) }}</span>
        </div>

         <div v-if="selectedEntry.actor" class="combat-log__detail-row">
           <label>Actor:</label>
           <span>{{ getActorName(selectedEntry.actor) }}</span>
         </div>

        <div class="combat-log__detail-row">
          <label>Raw Data:</label>
          <pre class="combat-log__raw-data">{{ JSON.stringify(selectedEntry, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { CleanList, MonoText } from '@flux/ui';
import type { CombatLogEntry } from '../types';

interface Props {
  entries: CombatLogEntry[];
  maxEntries?: number;
  showDetails?: boolean;
  autoScroll?: boolean;
}

interface Emits {
  (e: 'entry-clicked', entry: CombatLogEntry): void;
  (e: 'filter-changed', filter: string): void;
  (e: 'clear-requested'): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxEntries: 1000,
  showDetails: true,
  autoScroll: true,
});

const emit = defineEmits<Emits>();

// Reactive state
const logContainer = ref<HTMLElement>();
const selectedEntry = ref<CombatLogEntry | null>(null);
const selectedFilter = ref('');
const autoScroll = ref(props.autoScroll);
const userHasScrolled = ref(false);

// Computed properties
const displayedEntries = computed(() => {
  let filtered = props.entries;

  // Apply filter
  if (selectedFilter.value) {
    filtered = filtered.filter(entry =>
      entry.type.toLowerCase().includes(selectedFilter.value.toLowerCase())
    );
  }

  // Apply max entries limit
  if (filtered.length > props.maxEntries) {
    filtered = filtered.slice(-props.maxEntries);
  }

  return filtered;
});

// Methods
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatFullTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const formatEventData = (entry: CombatLogEntry): string => {
  // Extract key information from the event data
  const data = entry.payload || {};
  const parts: string[] = [];

  if ('damage' in data && data.damage) parts.push(`${data.damage} damage`);
  if ('target' in data && data.target) parts.push(`target: ${data.target}`);
  if ('weapon' in data && data.weapon) parts.push(`weapon: ${data.weapon}`);
  if ('position' in data && data.position) parts.push(`pos: ${JSON.stringify(data.position)}`);
  if ('distance' in data && data.distance) parts.push(`distance: ${data.distance}`);

  return parts.length > 0 ? parts.join(', ') : JSON.stringify(data);
};

const getActorName = (actorId: string): string => {
  // This would ideally come from a prop or store
  // For now, return a formatted version of the ID
  return actorId.split(':').pop() || actorId;
};

const getCategoryFromType = (eventType: string): string => {
  // Categorize events based on their type
  if (eventType.includes('combat') || eventType.includes('attack') || eventType.includes('defend')) {
    return 'combat';
  }
  if (eventType.includes('move') || eventType.includes('position')) {
    return 'movement';
  }
  if (eventType.includes('system') || eventType.includes('session') || eventType.includes('round') || eventType.includes('turn')) {
    return 'system';
  }
  return 'narrative';
};

const selectEntry = (entry: CombatLogEntry) => {
  selectedEntry.value = selectedEntry.value?.id === entry.id ? null : entry;
  emit('entry-clicked', entry);
};

const updateFilter = () => {
  emit('filter-changed', selectedFilter.value);
};

const clearLog = () => {
  selectedEntry.value = null;
  emit('clear-requested');
};

const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
  userHasScrolled.value = false;

  if (autoScroll.value) {
    scrollToBottom();
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

const handleScroll = () => {
  if (!logContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold

  if (!isAtBottom) {
    userHasScrolled.value = true;
  } else {
    userHasScrolled.value = false;
  }
};

// Watch for new entries and auto-scroll if enabled
watch(
  () => props.entries.length,
  () => {
    if (autoScroll.value && !userHasScrolled.value) {
      scrollToBottom();
    }
  }
);

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.target && (event.target as HTMLElement).tagName === 'INPUT') {
    return; // Don't interfere with input fields
  }

  switch (event.key) {
    case 'c':
      if (event.ctrlKey || event.metaKey) return; // Don't interfere with copy
      clearLog();
      break;
    case 'f':
      if (event.ctrlKey || event.metaKey) return; // Don't interfere with find
      // Focus filter dropdown
      const filterSelect = document.querySelector('.combat-log__filter') as HTMLSelectElement;
      filterSelect?.focus();
      break;
    case 'End':
      scrollToBottom();
      break;
    case 'Home':
      if (logContainer.value) {
        logContainer.value.scrollTop = 0;
      }
      break;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  scrollToBottom();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.combat-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.combat-log__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-secondary);
  border-bottom: 1px solid var(--color-border);
}

.combat-log__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.combat-log__controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.combat-log__filter {
  padding: 4px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.875rem;
}

.combat-log__clear,
.combat-log__auto-scroll {
  padding: 6px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.combat-log__clear:hover,
.combat-log__auto-scroll:hover {
  background: var(--color-hover);
}

.combat-log__auto-scroll--active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.combat-log__container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.combat-log__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.combat-log__entry {
  padding: 8px 12px;
  background: var(--color-background);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.combat-log__entry:hover {
  background: var(--color-hover);
  border-color: var(--color-border);
}

.combat-log__entry--selected {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
}

.combat-log__entry--combat {
  border-left: 3px solid var(--color-error);
}

.combat-log__entry--movement {
  border-left: 3px solid var(--color-info);
}

.combat-log__entry--system {
  border-left: 3px solid var(--color-warning);
}

.combat-log__entry--narrative {
  border-left: 3px solid var(--color-success);
}

.combat-log__timestamp {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.combat-log__type-badge {
  display: inline-block;
  padding: 2px 6px;
  background: var(--color-secondary);
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.combat-log__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.combat-log__narrative {
  font-style: italic;
  color: var(--color-text);
  line-height: 1.4;
}

.combat-log__details {
  font-size: 0.875rem;
  opacity: 0.8;
}

.combat-log__actors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.combat-log__actor-tag {
  padding: 2px 6px;
  background: var(--color-accent);
  color: var(--color-text-on-primary);
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
}

.combat-log__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);
  text-align: center;
}

.combat-log__empty-text {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.combat-log__empty-hint {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.7;
}

.combat-log__details-panel {
  border-top: 1px solid var(--color-border);
  background: var(--color-secondary);
  max-height: 300px;
  overflow-y: auto;
}

.combat-log__details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.combat-log__details-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.combat-log__details-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
}

.combat-log__details-close:hover {
  color: var(--color-text);
}

.combat-log__details-content {
  padding: 16px;
}

.combat-log__detail-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: flex-start;
}

.combat-log__detail-row label {
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 80px;
  font-size: 0.875rem;
}

.combat-log__raw-data {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px;
  font-size: 0.75rem;
  color: var(--color-text);
  overflow-x: auto;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
</style>

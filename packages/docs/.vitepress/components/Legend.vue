<template>
  <div class="legend">
    <h4 class="legend-title">{{ title }}</h4>
    <CleanList :items="items" class="legend-list">
      <template #default="{ item }">
        <div class="legend-item">
          <div class="legend-symbol">
            <!-- Render CombatantGlyph if symbol is an object -->
            <CombatantGlyph
              v-if="typeof item.symbol === 'object'"
              :name="item.symbol.name"
              :team="item.symbol.team"
              :facing="item.symbol.facing"
              :currentActor="item.symbol.currentActor"
              :colorScheme="item.symbol.colorScheme"
              :subjectTeam="item.symbol.subjectTeam"
              :subscript="item.symbol.subscript"
            />
            <!-- Render string symbol in code block -->
            <code v-else>{{ item.symbol }}</code>
          </div>
          <span class="legend-description">{{ item.description }}</span>
        </div>
      </template>
    </CleanList>
  </div>
</template>

<script setup>
import { CleanList, CombatantGlyph } from '@flux/ui';

const props = defineProps({
  title: {
    type: String,
    default: 'Legend'
  },
  items: {
    type: Array,
    required: true,
    validator: (items) => {
      return items.every(item => {
        const symbolValid = typeof item.symbol === 'string' ||
          (typeof item.symbol === 'object' && typeof item.symbol.name === 'string')
        return symbolValid && typeof item.description === 'string'
      })
    }
  }
})
</script>

<style scoped>
.legend {
  margin: 1rem 0;
  padding: 1rem;
  background-color: var(--gruvbox-bg1);
  border-left: 4px solid var(--gruvbox-aqua);
  border-radius: 6px;
  border: 1px solid var(--gruvbox-bg3);
}

.legend-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--gruvbox-fg0);
  font-style: italic;
  font-family: 'Zilla Slab', serif;
}

.legend-list {
  font-size: 0.9rem;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
  gap: 0.5rem;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-symbol {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
}

.legend-symbol code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  background-color: var(--gruvbox-bg2);
  color: var(--gruvbox-orange);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: 500;
}

.legend-description {
  color: var(--gruvbox-fg1);
  font-family: 'Zilla Slab', serif;
}
</style>

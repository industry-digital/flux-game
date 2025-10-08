<template>
  <div
    class="combatant-card"
    :class="{
      'combatant-card--active': isActive,
      'combatant-card--dead': !isAlive,
      'combatant-card--ai-controlled': isAIControlled
    }"
  >
    <!-- Header with name and status -->
    <div class="combatant-card__header">
      <CombatantGlyph
        :name="actor.name"
        :size="32"
        class="combatant-card__glyph"
      />
      <div class="combatant-card__info">
        <h3 class="combatant-card__name">{{ actor.name }}</h3>
        <div class="combatant-card__status">
          <span v-if="isAIControlled" class="combatant-card__ai-badge">AI</span>
          <span v-if="!isAlive" class="combatant-card__death-badge">DEAD</span>
        </div>
      </div>

      <!-- AI Toggle -->
      <button
        v-if="isAlive"
        @click="toggleAI"
        class="combatant-card__ai-toggle"
        :class="{ 'combatant-card__ai-toggle--active': isAIControlled }"
        :title="isAIControlled ? 'Disable AI Control' : 'Enable AI Control'"
      >
        🤖
      </button>
    </div>

    <!-- Health and Action Points -->
    <div class="combatant-card__vitals">
      <div class="combatant-card__vital">
        <label class="combatant-card__vital-label">HP</label>
        <div class="combatant-card__vital-bar">
          <div
            class="combatant-card__vital-fill combatant-card__vital-fill--hp"
            :style="{ width: `${hpPercentage}%` }"
          ></div>
          <span class="combatant-card__vital-text">
            {{ currentHP }} / {{ maxHP }}
          </span>
        </div>
      </div>

      <div class="combatant-card__vital">
        <label class="combatant-card__vital-label">AP</label>
        <div class="combatant-card__vital-bar">
          <div
            class="combatant-card__vital-fill combatant-card__vital-fill--ap"
            :style="{ width: `${apPercentage}%` }"
          ></div>
          <span class="combatant-card__vital-text">
            {{ currentAP }} / {{ maxAP }}
          </span>
        </div>
      </div>
    </div>

    <!-- Weapon Information -->
    <div v-if="weaponSchema" class="combatant-card__weapon">
      <MonoText>{{ weaponSchema.name }}</MonoText>
      <span class="combatant-card__weapon-damage">
        {{ weaponSchema.damage }}dmg
      </span>
    </div>

    <!-- Action Buttons -->
    <div v-if="isActive && isAlive" class="combatant-card__actions">
      <button
        @click="selectAsTarget"
        class="combatant-card__action-btn combatant-card__action-btn--target"
      >
        Target
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CombatantGlyph, MonoText } from '@flux/ui';
import type { Actor, WeaponSchema } from '@flux/core';

interface Props {
  actor: Actor;
  combatant?: {
    currentHP: number;
    maxHP: number;
    currentAP: number;
    maxAP: number;
  };
  isActive?: boolean;
  isAIControlled?: boolean;
  weaponSchema?: WeaponSchema;
}

interface Emits {
  (e: 'ai-toggle', actorId: string): void;
  (e: 'target-selected', actorId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  isAIControlled: false,
});

const emit = defineEmits<Emits>();

// Computed properties
const isAlive = computed(() => {
  return props.combatant ? props.combatant.currentHP > 0 : true;
});

const currentHP = computed(() => props.combatant?.currentHP ?? 100);
const maxHP = computed(() => props.combatant?.maxHP ?? 100);
const currentAP = computed(() => props.combatant?.currentAP ?? 10);
const maxAP = computed(() => props.combatant?.maxAP ?? 10);

const hpPercentage = computed(() => {
  return maxHP.value > 0 ? (currentHP.value / maxHP.value) * 100 : 0;
});

const apPercentage = computed(() => {
  return maxAP.value > 0 ? (currentAP.value / maxAP.value) * 100 : 0;
});

// Event handlers
const toggleAI = () => {
  emit('ai-toggle', props.actor.id);
};

const selectAsTarget = () => {
  emit('target-selected', props.actor.id);
};
</script>

<style scoped>
.combatant-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  min-width: 280px;
}

.combatant-card--active {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-primary);
}

.combatant-card--dead {
  opacity: 0.6;
  background: var(--color-secondary);
}

.combatant-card--ai-controlled {
  border-left: 4px solid var(--color-info);
}

.combatant-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.combatant-card__glyph {
  flex-shrink: 0;
}

.combatant-card__info {
  flex: 1;
  min-width: 0;
}

.combatant-card__name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.combatant-card__status {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.combatant-card__ai-badge,
.combatant-card__death-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.combatant-card__ai-badge {
  background: var(--color-info);
  color: var(--color-text-on-primary);
}

.combatant-card__death-badge {
  background: var(--color-error);
  color: var(--color-text-on-primary);
}

.combatant-card__ai-toggle {
  background: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.combatant-card__ai-toggle:hover {
  background: var(--color-hover);
}

.combatant-card__ai-toggle--active {
  background: var(--color-info);
  border-color: var(--color-info);
}

.combatant-card__vitals {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.combatant-card__vital {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.combatant-card__vital-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.combatant-card__vital-bar {
  position: relative;
  height: 24px;
  background: var(--color-secondary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.combatant-card__vital-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: width 0.3s ease;
}

.combatant-card__vital-fill--hp {
  background: linear-gradient(90deg, var(--color-error) 0%, var(--color-warning) 50%, var(--color-success) 100%);
}

.combatant-card__vital-fill--ap {
  background: var(--color-accent);
}

.combatant-card__vital-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  z-index: 1;
}

.combatant-card__weapon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-secondary);
  border-radius: 6px;
  margin-bottom: 16px;
}

.combatant-card__weapon-damage {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-warning);
}

.combatant-card__actions {
  display: flex;
  gap: 8px;
}

.combatant-card__action-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.combatant-card__action-btn:hover {
  background: var(--color-hover);
  border-color: var(--color-border-focus);
}

.combatant-card__action-btn--target {
  background: var(--color-accent);
  color: var(--color-text-on-primary);
  border-color: var(--color-accent);
}

.combatant-card__action-btn--target:hover {
  opacity: 0.9;
}
</style>

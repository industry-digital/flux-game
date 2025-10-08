<template>
  <div
    class="actor-setup-form"
    :class="{
      'actor-setup-form--alpha': actor.team === Team.ALPHA,
      'actor-setup-form--bravo': actor.team === Team.BRAVO
    }"
  >
    <!-- Header with name and AI toggle -->
    <div class="actor-setup-form__header">
      <div class="actor-setup-form__info">
        <h3 class="actor-setup-form__name">{{ actor.name }}</h3>
        <div class="actor-setup-form__team-badge">
          {{ actor.team === Team.ALPHA ? 'Team Alpha' : 'Team Bravo' }}
        </div>
      </div>

      <div class="actor-setup-form__controls">
        <!-- AI Toggle -->
        <label class="actor-setup-form__ai-toggle">
          <input
            type="checkbox"
            :checked="actor.isAI"
            @change="handleAIToggle"
          />
          <span class="actor-setup-form__ai-label">
            🤖 AI Control
          </span>
        </label>

        <!-- Remove button (if allowed) -->
        <button
          v-if="actor.canRemove"
          @click="handleRemove"
          class="actor-setup-form__remove-btn"
          title="Remove actor"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="actor-setup-form__section">
      <h4 class="actor-setup-form__section-title">Stats</h4>
      <div class="actor-setup-form__stats-grid">
        <div class="actor-setup-form__stat">
          <label for="pow">POW</label>
          <input
            id="pow"
            type="number"
            :value="getCurrentShellStat('pow')"
            @input="handleStatChange('pow', $event)"
            min="1"
            max="20"
            class="actor-setup-form__stat-input"
          />
          <span class="actor-setup-form__stat-help">Power - damage & health</span>
        </div>

        <div class="actor-setup-form__stat">
          <label for="fin">FIN</label>
          <input
            id="fin"
            type="number"
            :value="getCurrentShellStat('fin')"
            @input="handleStatChange('fin', $event)"
            min="1"
            max="20"
            class="actor-setup-form__stat-input"
          />
          <span class="actor-setup-form__stat-help">Finesse - speed & accuracy</span>
        </div>

        <div class="actor-setup-form__stat">
          <label for="res">RES</label>
          <input
            id="res"
            type="number"
            :value="getCurrentShellStat('res')"
            @input="handleStatChange('res', $event)"
            min="1"
            max="20"
            class="actor-setup-form__stat-input"
          />
          <span class="actor-setup-form__stat-help">Resilience - defense & stamina</span>
        </div>

        <div class="actor-setup-form__stat">
          <label for="int">INT</label>
          <input
            id="int"
            type="number"
            :value="actor.stats.int?.eff || 10"
            @input="handleStatChange('int', $event)"
            min="1"
            max="20"
            class="actor-setup-form__stat-input"
          />
          <span class="actor-setup-form__stat-help">Intelligence - learning</span>
        </div>

        <div class="actor-setup-form__stat">
          <label for="per">PER</label>
          <input
            id="per"
            type="number"
            :value="actor.stats.per?.eff || 10"
            @input="handleStatChange('per', $event)"
            min="1"
            max="20"
            class="actor-setup-form__stat-input"
          />
          <span class="actor-setup-form__stat-help">Perception - awareness</span>
        </div>

        <div class="actor-setup-form__stat">
          <label for="mem">MEM</label>
          <input
            id="mem"
            type="number"
            :value="actor.stats.mem?.eff || 10"
            @input="handleStatChange('mem', $event)"
            min="1"
            max="20"
            class="actor-setup-form__stat-input"
          />
          <span class="actor-setup-form__stat-help">Memory - abilities</span>
        </div>
      </div>
    </div>

    <!-- Weapon Section -->
    <div class="actor-setup-form__section">
      <h4 class="actor-setup-form__section-title">Weapon</h4>
      <select
        :value="actor.weaponUrn"
        @change="handleWeaponChange"
        class="actor-setup-form__weapon-select"
      >
        <option
          v-for="weapon in availableWeapons"
          :key="weapon.urn"
          :value="weapon.urn"
        >
          {{ weapon.name }}
        </option>
      </select>
    </div>

    <!-- Skills Section -->
    <div class="actor-setup-form__section">
      <h4 class="actor-setup-form__section-title">Skills</h4>
      <div class="actor-setup-form__skills">
        <div
          v-for="(skillState, skillUrn) in actor.skills"
          :key="skillUrn"
          class="actor-setup-form__skill"
        >
          <label>{{ formatSkillName(skillUrn) }}</label>
          <input
            type="number"
            :value="skillState?.rank || 1"
            @input="handleSkillChange(skillUrn, $event)"
            min="1"
            max="10"
            class="actor-setup-form__skill-input"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Team, type WeaponSchema } from '../types';
import type { ActorSetupData } from '../types';

interface Props {
  actor: ActorSetupData;
  availableWeapons: WeaponSchema[];
}

interface Emits {
  (e: 'stat-change', actorId: string, stat: string, value: number): void;
  (e: 'weapon-change', actorId: string, weaponUrn: string): void;
  (e: 'skill-change', actorId: string, skillUrn: string, value: number): void;
  (e: 'ai-toggle', actorId: string, isAI: boolean): void;
  (e: 'remove', actorId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Event handlers
const handleStatChange = (stat: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = parseInt(target.value, 10);
  if (!isNaN(value)) {
    emit('stat-change', props.actor.id, stat, value);
  }
};

const handleWeaponChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('weapon-change', props.actor.id, target.value);
};

const handleSkillChange = (skillUrn: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = parseInt(target.value, 10);
  if (!isNaN(value)) {
    emit('skill-change', props.actor.id, skillUrn, value);
  }
};

const handleAIToggle = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('ai-toggle', props.actor.id, target.checked);
};

const handleRemove = () => {
  emit('remove', props.actor.id);
};

const getCurrentShellStat = (stat: string): number => {
  // Get stat from current shell (POW, FIN, RES are shell stats)
  const currentShell = props.actor.shells[props.actor.currentShell];
  if (currentShell && currentShell.stats) {
    const statKey = stat as keyof typeof currentShell.stats;
    const statAttr = currentShell.stats[statKey];
    if (statAttr) {
      return statAttr.eff || 10;
    }
  }
  return 10; // Default value
};

const formatSkillName = (skillUrn: string): string => {
  // Convert URN to readable name
  return skillUrn.split(':').pop()?.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || skillUrn;
};
</script>

<style scoped>
.actor-setup-form {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.actor-setup-form--alpha {
  border-color: var(--color-info);
}

.actor-setup-form--bravo {
  border-color: var(--color-error);
}

.actor-setup-form__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.actor-setup-form__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.actor-setup-form__name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.actor-setup-form__team-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  text-transform: uppercase;
}

.actor-setup-form--alpha .actor-setup-form__team-badge {
  background: var(--color-info);
  color: var(--color-text-on-primary);
}

.actor-setup-form--bravo .actor-setup-form__team-badge {
  background: var(--color-error);
  color: var(--color-text-on-primary);
}

.actor-setup-form__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actor-setup-form__ai-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.actor-setup-form__ai-toggle input[type="checkbox"] {
  margin: 0;
}

.actor-setup-form__remove-btn {
  background: var(--color-error);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s ease;
}

.actor-setup-form__remove-btn:hover {
  opacity: 0.8;
}

.actor-setup-form__section {
  margin-bottom: 16px;
}

.actor-setup-form__section:last-child {
  margin-bottom: 0;
}

.actor-setup-form__section-title {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.actor-setup-form__stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.actor-setup-form__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.actor-setup-form__stat label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  text-transform: uppercase;
}

.actor-setup-form__stat-input {
  padding: 6px 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.875rem;
  width: 100%;
}

.actor-setup-form__stat-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.actor-setup-form__stat-help {
  font-size: 0.625rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.actor-setup-form__weapon-select {
  width: 100%;
  padding: 8px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.875rem;
}

.actor-setup-form__weapon-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.actor-setup-form__skills {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actor-setup-form__skill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.actor-setup-form__skill label {
  font-size: 0.875rem;
  color: var(--color-text);
  flex: 1;
}

.actor-setup-form__skill-input {
  padding: 4px 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.875rem;
  width: 60px;
}

.actor-setup-form__skill-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>

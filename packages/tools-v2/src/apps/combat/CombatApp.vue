<template>
  <div class="combat-app">
    <!-- Header with session info -->
    <div class="combat-app__header">
      <div class="combat-app__session-info">
        <h2 class="combat-app__title">Combat Sandbox</h2>
        <div v-if="session" class="combat-app__status">
          <span class="combat-app__status-badge" :class="`combat-app__status--${session.phase}`">
            {{ session.phase.toUpperCase() }}
          </span>
          <span v-if="isInActiveCombat" class="combat-app__round-info">
            Round {{ currentRound }}, Turn {{ currentTurn }}
          </span>
          <span v-if="currentActorId" class="combat-app__current-actor">
            Current: {{ getCombatantName(currentActorId) }}
          </span>
        </div>
      </div>

      <div class="combat-app__controls">
        <!-- Session controls -->
        <button
          v-if="!session"
          @click="handleStartSession"
          class="combat-app__btn combat-app__btn--primary"
        >
          Start Combat
        </button>

        <template v-else>
          <button
            v-if="isInSetupPhase"
            @click="handleBeginCombat"
            class="combat-app__btn combat-app__btn--success"
            :disabled="combatantCount < 2"
          >
            Begin Combat
          </button>

          <button
            v-if="isInActiveCombat"
            @click="pauseCombat"
            class="combat-app__btn combat-app__btn--warning"
          >
            Pause
          </button>

          <button
            v-if="isInPausedCombat"
            @click="resumeCombat"
            class="combat-app__btn combat-app__btn--success"
          >
            Resume
          </button>

          <button
            @click="endSession"
            class="combat-app__btn combat-app__btn--danger"
          >
            End Session
          </button>
        </template>
      </div>
    </div>

    <!-- Main combat interface -->
    <div v-if="session" class="combat-app__main">
      <!-- Left panel: Battlefield and controls -->
      <div class="combat-app__left-panel">
        <!-- Battlefield notation -->
        <div class="combat-app__battlefield-section">
          <div class="combat-app__battlefield-container">
            <h3 class="combat-app__battlefield-title">Battlefield (300m)</h3>
            <BattlefieldNotation
              v-if="battlefieldCombatants.length > 0 && session && (isInActiveCombat || isInPausedCombat) && battlefieldCombatants.every(c => c && c.name && typeof c.name === 'string')"
              :combatants="battlefieldCombatants"
              :current-actor="currentActorId || ''"
              :subject-team="'alpha'"
              :color-scheme="'gruvbox'"
              :show-controls="false"
            />
            <div v-else class="combat-app__battlefield-empty">
              <p>No combatants on battlefield</p>
              <p>Debug: battlefieldCombatants.length = {{ battlefieldCombatants.length }}</p>
              <p>Debug: session = {{ !!session }}</p>
              <p>Debug: isInActiveCombat = {{ isInActiveCombat }}</p>
              <p>Debug: battlefieldCombatants = {{ JSON.stringify(battlefieldCombatants) }}</p>
            </div>
          </div>
        </div>

        <!-- Command input -->
        <div class="combat-app__command-section">
          <CommandInput
            :placeholder="commandPlaceholder"
            :disabled="!isInActiveCombat"
            @command-submitted="handleCommand"
          />
        </div>
      </div>

      <!-- Right panel: Combatants and log -->
      <div class="combat-app__right-panel">
        <!-- Combatants list -->
        <div class="combat-app__combatants-section">
          <h3 class="combat-app__section-title">Combatants</h3>
          <div class="combat-app__combatants-grid">
            <CombatantCard
              v-for="combatant in currentCombatants"
              :key="combatant.actorId"
              :actor="getMockActor(combatant)"
              :combatant="{
                currentHP: 100,
                maxHP: 100,
                currentAP: combatant.ap?.eff?.cur || 0,
                maxAP: combatant.ap?.eff?.max || 10
              }"
              :is-active="combatant.actorId === currentActorId"
              :is-ai-controlled="false"
              :weapon-schema="undefined"
              @ai-toggle="(actorId) => handleAIToggle(actorId, true)"
              @target-selected="(actorId) => handleTargetSelect(actorId, '')"
            />
          </div>
        </div>

        <!-- Combat log -->
        <div class="combat-app__log-section">
          <CombatLog
            :entries="session.log"
            :max-entries="1000"
            :show-details="true"
            :auto-scroll="true"
            @entry-clicked="handleLogEntryClick"
            @filter-changed="handleLogFilter"
            @clear-requested="handleLogClear"
          />
        </div>
      </div>
    </div>

    <!-- Setup screen (when no session or in setup phase) -->
    <div v-else-if="!session || isInSetupPhase" class="combat-app__setup">
      <div class="combat-app__setup-header">
        <h3>Combat Sandbox Setup</h3>
        <p>Configure combatants, weapons, and stats before starting combat.</p>

        <!-- Scenario selection -->
        <div class="combat-app__scenario-selection">
          <label for="scenario-select">Choose Scenario:</label>
          <select
            id="scenario-select"
            v-model="selectedScenario"
            class="combat-app__scenario-select"
            @change="handleScenarioChange"
          >
            <option value="">Custom Setup</option>
            <option
              v-for="scenario in availableScenarios"
              :key="scenario.id"
              :value="scenario.id"
            >
              {{ scenario.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Actor Setup Grid -->
      <div class="combat-app__setup-grid">
        <!-- Team Alpha -->
        <div class="combat-app__team-section">
          <div class="combat-app__team-header">
            <h4 class="combat-app__team-title combat-app__team-title--alpha">Team Alpha</h4>
            <button
              @click="handleAddCombatant(Team.ALPHA)"
              class="combat-app__add-btn"
              :disabled="getTeamActorCount(Team.ALPHA) >= 3"
            >
              + Add Combatant
            </button>
          </div>

          <div class="combat-app__actors-list">
            <ActorSetupForm
              v-for="actor in getTeamActors(Team.ALPHA)"
              :key="actor.id"
              :actor="actor"
              :available-weapons="availableWeapons"
              @update-stat="handleUpdateActorStat"
              @update-weapon="handleUpdateActorWeapon"
              @update-skill="handleUpdateActorSkill"
              @toggle-ai="handleToggleActorAI"
              @remove="handleRemoveCombatant"
            />
          </div>
        </div>

        <!-- Team Bravo -->
        <div class="combat-app__team-section">
          <div class="combat-app__team-header">
            <h4 class="combat-app__team-title combat-app__team-title--bravo">Team Bravo</h4>
            <button
              @click="handleAddCombatant(Team.BRAVO)"
              class="combat-app__add-btn"
              :disabled="getTeamActorCount(Team.BRAVO) >= 3"
            >
              + Add Combatant
            </button>
          </div>

          <div class="combat-app__actors-list">
            <ActorSetupForm
              v-for="actor in getTeamActors(Team.BRAVO)"
              :key="actor.id"
              :actor="actor"
              :available-weapons="availableWeapons"
              @update-stat="handleUpdateActorStat"
              @update-weapon="handleUpdateActorWeapon"
              @update-skill="handleUpdateActorSkill"
              @toggle-ai="handleToggleActorAI"
              @remove="handleRemoveCombatant"
            />
          </div>
        </div>
      </div>

      <!-- Setup Actions -->
      <div class="combat-app__setup-actions">
        <button
          @click="handleStartSession"
          class="combat-app__btn combat-app__btn--primary"
          :disabled="setupActors.length < 2"
        >
          Start Combat Session
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { BattlefieldNotation } from '@flux/ui';
import CombatantCard from './components/CombatantCard.vue';
import CommandInput from './components/CommandInput.vue';
import CombatLog from './components/CombatLog.vue';
import ActorSetupForm from './components/ActorSetupForm.vue';
import { useCombatSession } from './composables/useCombatSession';
import { useCombatScenario } from './composables/useCombatScenario';
import { useActorSetup } from './composables/useActorSetup';
import { SessionStatus, EntityType, Team } from '@flux/core';
import type {
  CombatScenario,
  CombatLogEntry
} from './types';

// Composables
const {
  session,
  context,
  startSession,
  beginCombat: beginCombatSession,
  endSession,
  pauseSession,
  resumeSession,
  executeCommand,
  clearLog
} = useCombatSession();

const {
  availableScenarios,
  selectedScenario
} = useCombatScenario();

const {
  availableWeapons,
  createDefaultActors,
  updateActorStat,
  updateActorWeapon,
  updateActorSkill,
  toggleActorAI,
  createAdditionalActor
} = useActorSetup();

// Local state
const logFilter = ref('');
const setupActors = ref<any[]>([]); // Actors being configured in setup phase

// Computed properties
const isInSetupPhase = computed(() => session.value?.phase === 'setup');
const isInActiveCombat = computed(() => session.value?.status === SessionStatus.RUNNING);
const isInPausedCombat = computed(() => session.value?.status === SessionStatus.PAUSED);

const currentCombatants = computed(() => {
  if (!session.value?.data.combatants) return [];
  return Array.from(session.value.data.combatants.values());
});

const combatantCount = computed(() => currentCombatants.value.length);

const currentActorId = computed(() => {
  if (!session.value?.data.rounds?.current?.turns?.current) return null;
  return session.value.data.rounds.current.turns.current.actor;
});

const currentRound = computed(() => session.value?.data.rounds?.current?.number || 1);

const currentTurn = computed(() => session.value?.data.rounds?.current?.turns?.current?.number || 1);

const commandPlaceholder = computed(() => {
  if (!session.value) return 'No active session';
  if (!isInActiveCombat.value) return 'Combat not active';

  const actorId = currentActorId.value;
  if (actorId) {
    return `Enter command for ${getCombatantName(actorId)}...`;
  }

  return 'Enter combat command...';
});

// Setup phase computed properties
const getTeamActors = (team: Team) => {
  return setupActors.value.filter(actor => actor.team === team);
};

const getTeamActorCount = (team: Team) => {
  return getTeamActors(team).length;
};

// Transform combatants for BattlefieldNotation component
const battlefieldCombatants = computed(() => {
  console.log('=== battlefieldCombatants computed ===');
  console.log('currentCombatants.value:', currentCombatants.value);
  console.log('context.value:', context.value);

  if (!currentCombatants.value?.length) {
    console.log('No combatants, returning empty array');
    return [];
  }

  const result = [];
  for (let i = 0; i < currentCombatants.value.length; i++) {
    const c = currentCombatants.value[i];
    console.log(`Processing combatant ${i}:`, c);

    if (!c.actorId || !c.position || !c.position?.coordinate) {
      console.log(`Skipping combatant ${i} - invalid data`);
      continue;
    }

    // Get actor name from context or fallback to ID parsing
    const contextName = context.value?.world?.actors?.[c.actorId]?.name;
    const idPart = c.actorId.split(':').pop();
    const actorName = contextName || idPart || 'Unknown';

    console.log(`Actor name resolution for ${c.actorId}:`, {
      contextName,
      idPart,
      finalName: actorName
    });

    // Safety check - never pass undefined names
    if (!actorName || typeof actorName !== 'string' || actorName.length === 0) {
      console.error('Invalid actor name for combatant:', c.actorId, 'skipping');
      continue;
    }

    const combatantData = {
      name: actorName,
      position: Math.round(c.position.coordinate),
      facing: c.position.facing === 1 ? 'right' : 'left',
      team: (c.team || 'neutral').toLowerCase()
    };

    console.log(`Adding combatant data:`, combatantData);
    result.push(combatantData);
  }

  console.log('Final result:', result);
  return result;
});

// Methods
const getCombatantName = (actorId: string): string => {
  // Get actor name from context or fallback to ID parsing
  const actorName = context.value?.world?.actors?.[actorId]?.name;
  return actorName || actorId.split(':').pop() || 'Unknown';
};

const getMockActor = (combatant: any) => {
  // Create a mock Actor object for the CombatantCard component
  return {
    id: combatant.actorId,
    name: getCombatantName(combatant.actorId),
    type: EntityType.ACTOR,
    // Add other required Actor properties as needed
  } as any; // TODO: Create proper Actor object with all required properties
};

const getScenario = (scenarioId: string): CombatScenario | undefined => {
  return availableScenarios.value.find((s: any) => s.id === scenarioId);
};

// Setup phase methods
const handleScenarioChange = () => {
  if (selectedScenario.value) {
    const scenario = getScenario(selectedScenario.value);
    if (scenario) {
      setupActors.value = [...scenario.actors];
    }
  } else {
    // Reset to default actors for custom setup
    setupActors.value = createDefaultActors();
  }
};

const handleAddCombatant = (team: Team) => {
  if (getTeamActorCount(team) >= 3) return;

  // Generate a unique name for the new combatant
  const teamName = team === Team.ALPHA ? 'Alpha' : 'Bravo';
  const existingCount = getTeamActorCount(team);
  const combatantNames = ['Charlie', 'David', 'Eve', 'Frank', 'Grace'];
  const newName = combatantNames[existingCount] || `${teamName}${existingCount + 1}`;

  const newActor = createAdditionalActor(newName, team);
  setupActors.value.push(newActor);
};

const handleRemoveCombatant = (actorId: string) => {
  setupActors.value = setupActors.value.filter(actor => actor.id !== actorId);
};

const handleUpdateActorStat = (actorId: string, stat: any, value: number) => {
  const actor = setupActors.value.find(a => a.id === actorId);
  if (actor) {
    updateActorStat(actor, stat, value);
  }
};

const handleUpdateActorWeapon = (actorId: string, weaponUrn: string) => {
  const actor = setupActors.value.find(a => a.id === actorId);
  if (actor) {
    updateActorWeapon(actor, weaponUrn);
  }
};

const handleUpdateActorSkill = (actorId: string, skillUrn: string, rank: number) => {
  const actor = setupActors.value.find(a => a.id === actorId);
  if (actor) {
    updateActorSkill(actor, skillUrn, rank);
  }
};

const handleToggleActorAI = (actorId: string, isAI: boolean) => {
  const actor = setupActors.value.find(a => a.id === actorId);
  if (actor) {
    toggleActorAI(actor, isAI);
  }
};

const handleStartSession = async () => {
  try {
    if (setupActors.value.length < 2) {
      console.warn('Need at least 2 combatants to start combat');
      return;
    }

    // Create battlefield configuration
    const battlefield = {
      length: 300,
      margin: 100,
      cover: [],
      width: 800,
      height: 600,
      gridSize: 40
    };

    await startSession(setupActors.value, battlefield);
  } catch (error) {
    console.error('Failed to start combat session:', error);
    // TODO: Show error notification
  }
};

const handleBeginCombat = async () => {
  if (!session.value) return;

  try {
    await beginCombatSession();
  } catch (error) {
    console.error('Failed to begin combat:', error);
  }
};

const pauseCombat = async () => {
  if (!session.value) return;
  await pauseSession();
};

const resumeCombat = async () => {
  if (!session.value) return;
  await resumeSession();
};

const handleCommand = async (command: string) => {
  if (!session.value || !isInActiveCombat.value) return;

  try {
    await executeCommand(command);
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
};

// Removed position click handling - battlefield is display-only

// Removed actor selection handling - battlefield is display-only

const handleAIToggle = (combatantId: string, isAI: boolean) => {
  // TODO: Implement AI toggle through session API
  console.log(`Toggle AI for ${combatantId}: ${isAI}`);
};

const handleTargetSelect = (combatantId: string, targetId: string) => {
  // TODO: Implement target selection through session API
  console.log(`Set target for ${combatantId}: ${targetId}`);
};

const handleLogEntryClick = (entry: CombatLogEntry) => {
  // Could show detailed event information or jump to related combatant
  console.log('Log entry clicked:', entry);
};

const handleLogFilter = (filter: string) => {
  logFilter.value = filter;
};

const handleLogClear = () => {
  if (session.value) {
    clearLog();
  }
};

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.target && (event.target as HTMLElement).tagName === 'INPUT') {
    return; // Don't interfere with input fields
  }

  switch (event.key) {
    case ' ':
      if (isInActiveCombat.value) {
        event.preventDefault();
        // Focus command input
        const commandInput = document.querySelector('.command-input__field') as HTMLInputElement;
        commandInput?.focus();
      }
      break;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  // Initialize with default actors for setup
  setupActors.value = createDefaultActors();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.combat-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-background);
  color: var(--color-text);
}

.combat-app__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.combat-app__session-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.combat-app__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.combat-app__status {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
}

.combat-app__status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.combat-app__status--preparing {
  background: var(--color-warning);
  color: var(--color-text-on-primary);
}

.combat-app__status--active {
  background: var(--color-success);
  color: var(--color-text-on-primary);
}

.combat-app__status--paused {
  background: var(--color-info);
  color: var(--color-text-on-primary);
}

.combat-app__status--ended {
  background: var(--color-secondary);
  color: var(--color-text);
}

.combat-app__round-info,
.combat-app__current-actor {
  color: var(--color-text-secondary);
}

.combat-app__controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.combat-app__btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.combat-app__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.combat-app__btn--primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.combat-app__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.combat-app__btn--success {
  background: var(--color-success);
  color: var(--color-text-on-primary);
}

.combat-app__btn--warning {
  background: var(--color-warning);
  color: var(--color-text-on-primary);
}

.combat-app__btn--danger {
  background: var(--color-error);
  color: var(--color-text-on-primary);
}

.combat-app__main {
  display: flex;
  flex: 1;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.combat-app__left-panel {
  display: flex;
  flex-direction: column;
  flex: 2;
  gap: 16px;
  min-width: 0;
}

.combat-app__battlefield-section {
  flex: 1;
  min-height: 200px;
}

.combat-app__battlefield-container {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.combat-app__battlefield-title {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.combat-app__battlefield-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-text-secondary);
  font-style: italic;
}

.combat-app__command-section {
  flex-shrink: 0;
}

.combat-app__right-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 16px;
  min-width: 300px;
  max-width: 400px;
}

.combat-app__combatants-section {
  flex-shrink: 0;
}

.combat-app__section-title {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.combat-app__combatants-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.combat-app__log-section {
  flex: 1;
  min-height: 200px;
}

.combat-app__setup {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.combat-app__setup-header {
  margin-bottom: 32px;
}

.combat-app__setup-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
}

.combat-app__setup-header p {
  margin: 0 0 24px 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.combat-app__setup-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.combat-app__team-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.combat-app__team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-border);
}

.combat-app__team-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.combat-app__team-title--alpha {
  color: var(--color-primary);
}

.combat-app__team-title--bravo {
  color: var(--color-error);
}

.combat-app__add-btn {
  padding: 8px 16px;
  background: var(--color-success);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.combat-app__add-btn:hover:not(:disabled) {
  background: var(--color-success-hover);
}

.combat-app__add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.combat-app__actors-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.combat-app__setup-actions {
  display: flex;
  justify-content: center;
  padding-top: 24px;
  border-top: 2px solid var(--color-border);
}

.combat-app__scenario-selection {
  margin-bottom: 24px;
}

.combat-app__scenario-selection label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--color-text);
}

.combat-app__scenario-select {
  width: 100%;
  padding: 12px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 1rem;
}

.combat-app__scenario-preview {
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  text-align: left;
}

.combat-app__scenario-preview h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.combat-app__scenario-preview p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

/* Responsive design */
@media (max-width: 1024px) {
  .combat-app__main {
    flex-direction: column;
  }

  .combat-app__right-panel {
    max-width: none;
    flex-direction: row;
  }

  .combat-app__combatants-section,
  .combat-app__log-section {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .combat-app__header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .combat-app__controls {
    justify-content: center;
  }

  .combat-app__right-panel {
    flex-direction: column;
  }
}
</style>

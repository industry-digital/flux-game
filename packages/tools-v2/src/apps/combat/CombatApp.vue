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
          @click="handleBeginCombat"
          class="combat-app__btn combat-app__btn--success"
          :disabled="setupActors.length < 2"
        >
          Begin Combat
        </button>

        <template v-else>

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

    <!-- Terminal Combat Interface (only shown when combat is active) -->
    <div v-if="session && (isInActiveCombat || isInPausedCombat)" class="combat-terminal">
      <Terminal
        :config="{
          maxEntries: 1000,
          autoScroll: true,
          showTimestamps: false,
        }"
        :virtualization-config="{
          itemHeight: 24,
          overscan: 5,
          viewportHeight: 600,
        }"
        theme-name="dark"
        :viewport-height="600"
        @terminal-ready="handleTerminalReady"
        class="combat-terminal__main"
      >
        <template #header>
          <div class="terminal-header">
            <span class="terminal-title">FLUX COMBAT TERMINAL v2.0</span>
            <span class="terminal-session">Session: {{ session.id }}</span>
            <span v-if="currentActorId" class="terminal-current-turn">
              Round {{ currentRound }} | {{ getCombatantName(currentActorId) }}'s Turn
            </span>
          </div>
        </template>

        <template #footer>
          <div class="terminal-input">
            <div v-if="currentActorId" class="turn-indicator">
              ── {{ getCombatantName(currentActorId).toUpperCase() }}'S TURN ──
            </div>
            <CommandInput
              :placeholder="currentActorId ? `[${getCombatantName(currentActorId)}] > ` : '> '"
              :disabled="!isInActiveCombat"
              class="terminal-command-input"
              @command-submitted="handleCommand"
            />
          </div>
        </template>
      </Terminal>
    </div>

    <!-- Setup screen (when no session) -->
    <div v-else-if="!session" class="combat-app__setup">
      <div class="combat-app__setup-header">
        <h3>Combat Sandbox Setup</h3>
        <p>Configure combatants, weapons, and stats before starting combat.</p>

        <!-- Scenario selection removed - now using persistent custom setup -->
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
        <p class="combat-app__setup-hint">
          Configure your combatants above, then click "Begin Combat" to start the battle.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue';
import CommandInput from './components/CommandInput.vue';
import ActorSetupForm from './components/ActorSetupForm.vue';
import { useCombatSession } from './composables/useCombatSession';
import { useCombatScenario } from './composables/useCombatScenario';
import { useActorSetup } from './composables/useActorSetup';
import { useTransformerContext } from './composables/useTransformerContext';
import { SessionStatus, Team, TransformerContext, WorldEvent, executeIntent, NarrativeRecipient } from '@flux/core';
import { Terminal, useTerminal, useVirtualizedList, useTheme, useLogger } from '@flux/ui';
import { useNarration } from '../../composables/narrative';

const log = useLogger('CombatSimulator');

// Composables
const transformerContext = useTransformerContext();

const {
  session,
  context,
  startSession,
  beginCombat: beginCombatSession,
  endSession,
  pauseSession,
  resumeSession
} = useCombatSession();

const {
  actorConfig,
  getBattlefieldConfig,
  saveSetup
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

// Terminal setup
const theme = useTheme('dark');
const virtualization = useVirtualizedList<any>([], {
  itemHeight: 24,
  overscan: 5,
  viewportHeight: 600,
});
const terminal = useTerminal({
  maxEntries: 1000,
  autoScroll: true,
  showTimestamps: false,
}, virtualization as any, theme);

// Narrative generation
const narration = useNarration(transformerContext.context.value as TransformerContext);

// Local state - initialize from localStorage or defaults
const setupActors = ref<any[]>([]);

// Computed properties
const isInActiveCombat = computed(() => session.value?.status === SessionStatus.RUNNING);
const isInPausedCombat = computed(() => session.value?.status === SessionStatus.PAUSED);

const currentActorId = computed(() => {
  if (!session.value?.data.rounds?.current?.turns?.current) return null;
  return session.value.data.rounds.current.turns.current.actor;
});

const currentRound = computed(() => session.value?.data.rounds?.current?.number || 1);

const currentTurn = computed(() => session.value?.data.rounds?.current?.turns?.current?.number || 1);

// Setup phase computed properties
const getTeamActors = (team: Team) => {
  return setupActors.value.filter(actor => actor.team === team);
};

const getTeamActorCount = (team: Team) => {
  return getTeamActors(team).length;
};

// Note: battlefieldCombatants removed - will be recreated when we integrate actual BattlefieldNotation

// Terminal integration - convert WorldEvents to terminal entries
const convertEventToTerminalEntries = (event: WorldEvent) => {
  try {
    // Generate narrative text using the core narrative system
    const narrativeText = narration.narrateEvent(event, 'flux:actor:observer' as NarrativeRecipient);
    terminal.print(`narrative-${event.id}`, narrativeText);
  } catch (error) {
    // Fallback to technical details if narrative generation fails
    log.warn(`Narrative generation failed for ${event.type}:`, error);
    const eventDetails = `${event.type}: ${JSON.stringify(event.payload || {})}`;
    terminal.print(`event-${event.id}`, eventDetails);
  }

  // Add battlefield visualization for all events (simplified for now)
  const battlefieldComponent = h('div', { class: 'terminal-battlefield' }, [
    h('div', { class: 'battlefield-label' }, 'Battlefield State:'),
    // TODO: Add actual BattlefieldNotation component here
    h('div', { class: 'battlefield-placeholder' }, '[Battlefield visualization would go here]')
  ]);

  terminal.render(`battlefield-${event.id}`, battlefieldComponent);
};

// Watch for new log entries and convert them to terminal entries
const lastProcessedLogLength = ref(0);
const syncLogToTerminal = () => {
  if (!session.value?.log) return;

  const currentLogLength = session.value.log.length;
  if (currentLogLength > lastProcessedLogLength.value) {
    // Process new entries
    const newEntries = session.value.log.slice(lastProcessedLogLength.value);
    newEntries.forEach(convertEventToTerminalEntries);
    lastProcessedLogLength.value = currentLogLength;
  }
};

// Methods
const getCombatantName = (actorId: string): string => {
  // Get actor name from context or fallback to ID parsing
  const actorName = context.value?.world?.actors?.[actorId]?.name;
  return actorName || actorId.split(':').pop() || 'Unknown';
};

// Note: getMockActor removed - no longer needed with new terminal UI

// Setup phase methods

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

// handleStartSession removed - now handled directly in handleBeginCombat

const handleBeginCombat = async () => {
  try {
    if (setupActors.value.length < 2) {
      log.warn('Need at least 2 combatants to start combat');
      return;
    }

    // If no session exists, create it first
    if (!session.value) {
      // Get battlefield configuration from composable
      const battlefield = getBattlefieldConfig();
      await startSession(setupActors.value, battlefield);
    }

    // Now begin combat
    await beginCombatSession();
  } catch (error) {
    log.error('Failed to begin combat:', error);
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

const handleCommand = (intentText: string) => {
  if (!session.value || !isInActiveCombat.value || !transformerContext.context.value) return;

  const actorId = currentActorId.value;
  if (!actorId) {
    log.warn('No current actor for command execution');
    return;
  }


  try {
    // Use the properly designed transformer context (already markRaw'd)
    // No need for toRaw() since useTransformerContext handles this correctly
    const rawContext = transformerContext.context.value as TransformerContext;
    const errorsBefore = rawContext.getDeclaredErrors();

    // Use proper intent execution from @flux/core
    executeIntent(rawContext, actorId, intentText);

    // The context is mutated in-place by @flux/core, but we need to sync event count
    transformerContext.syncEventCount();

    const errorsAfter = rawContext.getDeclaredErrors();

    // Check for new errors that occurred during intent execution
    if (errorsAfter.length > errorsBefore.length) {
      const newErrors = errorsAfter.slice(errorsBefore.length);
      newErrors.forEach(error => {
        log.error('Intent execution error:', error.error || error);
      });
    }
  } catch (error) {
    log.error('Failed to execute intent:', error);
  }
};

// Removed position click handling - battlefield is display-only

// Removed actor selection handling - battlefield is display-only

// Note: handleAIToggle and handleTargetSelect removed - not needed with new terminal UI

const handleTerminalReady = (terminalInstance: any) => {
  // Terminal is ready, we can use it if needed
  log.info('Terminal ready:', terminalInstance);
};

// Note: handleLogClear removed - log clearing handled differently in new terminal UI

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

// Watch for log changes and sync to terminal
watch(() => session.value?.log, () => {
  syncLogToTerminal();
}, { deep: true });

// Watch for setup actor changes and persist to localStorage
watch(setupActors, (newActors) => {
  saveSetup(newActors);
}, { deep: true });

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  // Initialize with persisted actors or defaults
  if (actorConfig.value.length > 0) {
    setupActors.value = [...actorConfig.value];
  } else {
    setupActors.value = createDefaultActors();
    saveSetup(setupActors.value); // Save defaults to localStorage
  }
  // Sync any existing log entries to terminal
  syncLogToTerminal();
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

.combat-app__setup-hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-style: italic;
  text-align: center;
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

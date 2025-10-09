<template>
  <div class="combat-app">
    <!-- Setup Phase -->
    <div v-if="!isInCombat" class="setup-phase">
      <h2>Combat Simulator Setup</h2>

      <div class="actor-setup">
        <ActorSetupForm
          v-for="actor in actors"
          :key="actor.id"
          :actor="actor"
          :available-weapons="availableWeapons"
          @weapon-change="(actorId: string, weaponUrn: string) => updateActorWeapon(actors.find((a: any) => a.id === actorId)!, weaponUrn)"
        />
      </div>

        <button
        @click="beginCombat"
        :disabled="!canStartCombat"
        class="begin-combat-btn"
          >
            Begin Combat
          </button>
    </div>

    <!-- Combat Phase -->
    <div v-if="isInCombat" class="combat-phase">
      <Terminal
        :entries="terminalEntries"
        :config="terminalConfig"
        class="combat-terminal"
      />

          <CommandInput
        v-if="currentActor"
        :placeholder="`${currentActor.name}'s turn - Enter command...`"
        @command-submitted="executeCommand"
        class="command-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from 'vue';
import {
  createTransformerContext,
  executeIntent,
  SessionStatus,
  type WorldEvent
} from '@flux/core';
import { Terminal } from '@flux/ui';
import ActorSetupForm from './components/ActorSetupForm.vue';
import CommandInput from './components/CommandInput.vue';
import { useCombatSession } from './composables/useCombatSession';
import { useActorSetup } from './composables/useActorSetup';
import { useActorEquipment } from './composables/useActorEquipment';
import { createReactiveContext, type ReactiveTransformerContext } from './types/ReactiveTransformerContext';

// =============================================================================
// REACTIVE TRIGGER PATTERN: Manual Reactivity with Zero Proxy Pollution
// =============================================================================

// ✅ Single reactive trigger - the ONLY reactive thing
const updateTrigger = ref(0);

// ✅ Batched updates: Prevent multiple rapid re-renders
let updateQueued = false;
const forceUpdate = () => {
  if (updateQueued) return; // Already queued, batch this update

  updateQueued = true;
  queueMicrotask(() => {
    updateTrigger.value++;
    updateQueued = false;
  });
};

// ✅ Non-reactive context - pure plain objects (markRaw prevents Vue Proxies)
let baseContext = markRaw(createTransformerContext());

// ✅ Enhanced context with reactive trigger capability
let context: ReactiveTransformerContext = createReactiveContext(baseContext, forceUpdate);

// ✅ Auto-update on WorldEvents: Listen for core state changes
const setupEventListener = () => {
  let lastEventCount = 0;

  // Check for new events periodically
  const checkForEvents = () => {
    const currentEventCount = baseContext.getDeclaredEvents().length;
    if (currentEventCount > lastEventCount) {
      lastEventCount = currentEventCount;
      forceUpdate(); // Trigger UI update when new events arrive
    }
  };

  // Poll for events (could be replaced with event emitter if available)
  setInterval(checkForEvents, 100);
};

setupEventListener();

// =============================================================================
// COMPOSABLES: Pass non-reactive context, get reactive views
// =============================================================================

const { createDefaultActors, availableWeapons, updateActorWeapon } = useActorSetup(context);

// ✅ Register weapon schemas BEFORE creating actors
const { registerWeaponSchemas } = useActorEquipment(context);
registerWeaponSchemas(availableWeapons.value);

// ✅ Non-reactive actors - plain objects only (now schemas are registered)
let actors = createDefaultActors();

// Create sessionId for useCombatSession
let sessionId: string | null = null;
const contextRef = ref(baseContext);
const sessionIdRef = ref(sessionId);
const { startSession, beginCombat: beginCombatSession } = useCombatSession(contextRef, sessionIdRef);

// =============================================================================
// COMPUTED VIEWS: Depend on reactive trigger for UI updates
// =============================================================================

// Remove unused world computed - we access context.world directly

const currentSession = computed(() => {
  updateTrigger.value; // Create dependency on trigger
  return Object.values(baseContext.world.sessions)[0] || null;
});

const currentActorId = computed(() => {
  updateTrigger.value; // Create dependency on trigger
  // TODO: Get current actor from session when implemented
  const actorIds = Object.keys(baseContext.world.actors);
  return currentSession.value && actorIds.length > 0 ? actorIds[0] as `flux:actor:${string}` : null;
});

// =============================================================================
// UI STATE: Computed properties for template binding
// =============================================================================

const isInCombat = computed(() => {
  updateTrigger.value; // Create dependency on trigger
  return currentSession.value?.status === SessionStatus.RUNNING;
});

const canStartCombat = computed(() => {
  updateTrigger.value; // Create dependency on trigger
  return actors.length >= 2;
});

const currentActor = computed(() => {
  updateTrigger.value; // Create dependency on trigger
  if (!currentActorId.value) return null;
  return baseContext.world.actors[currentActorId.value] || null;
});

// =============================================================================
// TERMINAL: Event Display
// =============================================================================

// Terminal configuration
const terminalConfig = {
  showTimestamps: true,
  autoScroll: true,
  theme: 'dark' as const
};

const terminalEntries = computed(() => {
  updateTrigger.value; // Create dependency on trigger
  if (!currentSession.value) return [];

  // Access log from the session (assuming it has a log property)
  const sessionLog = (currentSession.value as any).log || [];
  return sessionLog.map((event: WorldEvent) => ({
    id: event.id,
    timestamp: new Date(event.ts),
    content: formatEventForTerminal(event),
    type: 'event' as const
  }));
});

// =============================================================================
// MANUAL UPDATE FUNCTIONS: Core operations + trigger UI updates
// =============================================================================

// =============================================================================
// ACTIONS: Combat Flow
// =============================================================================

const beginCombat = async () => {
  try {
    // Step 1: Create the session with actors and weapons
    await startSession(actors, {}, availableWeapons.value);

    // Step 2: Actually start the combat (this sets status to RUNNING)
    await beginCombatSession();

    // Explicitly trigger UI update after combat starts
    forceUpdate();

    // Debug session state
    const session = Object.values(baseContext.world.sessions)[0];
    console.log('[CombatApp] Combat session started:', {
      sessionExists: !!session,
      sessionStatus: session?.status,
      isRunning: session?.status === SessionStatus.RUNNING,
      sessionId: session?.id
    });
  } catch (error) {
    console.error('Failed to begin combat:', error);
  }
};

const executeCommand = (intentText: string) => {
  if (!currentActorId.value) {
    console.warn('No current actor for command execution');
    return;
  }

  try {
    // Core receives plain objects (no Proxies!)
    executeIntent(baseContext, currentActorId.value, intentText);

    // WorldEvents from executeIntent will trigger forceUpdate() automatically
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
};

// =============================================================================
// UTILITIES: Event Formatting
// =============================================================================

const formatEventForTerminal = (event: WorldEvent): string => {
  // Simple event formatting - can be enhanced later
  const actor = event.actor ? baseContext.world.actors[event.actor]?.name || 'Unknown' : '';
  const prefix = actor ? `[${actor}] ` : '';

  // Simple event formatting based on event type string
  if (event.type.includes('session:started')) {
    return 'Combat begins!';
  } else if (event.type.includes('turn:started')) {
    return `${prefix}Turn started`;
  } else if (event.type.includes('attack')) {
    return `${prefix}Attacks!`;
  } else {
    return `${prefix}${event.type}`;
  }
};
</script>

<style scoped>
.combat-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.setup-phase {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.actor-setup {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.begin-combat-btn {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background: #4ade80;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

.begin-combat-btn:disabled {
  background: #6b7280;
  cursor: not-allowed;
}

.combat-phase {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.combat-terminal {
    flex: 1;
  min-height: 0;
}

.command-input {
  flex-shrink: 0;
}
</style>

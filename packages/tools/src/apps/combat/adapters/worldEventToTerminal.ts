import type { WorldEvent, ActorURN, TransformerContext } from '@flux/core';
import { EventType, getTemplatesForLanguage, Language } from '@flux/core';
import type { TerminalEntry } from '@flux/ui';

const OBSERVER_ID: ActorURN = 'flux:actor:observer';

/**
 * Generates narrative text from a WorldEvent using the narrative system
 * Always generates observer perspective for the CombatTool
 */
function generateNarrativeFromEvent(
  context: TransformerContext,
  event: WorldEvent,
  language: Language = Language.en_US
): string {
  const templates = getTemplatesForLanguage(language);
  const templateFunction = templates[event.type];

  if (!templateFunction) {
    return formatEventFallback(event);
  }

  try {
    // Cast to any to work around the strict typing - the template function will handle the specific event type
    const narrative = (templateFunction as any)(context, event, OBSERVER_ID);

    // Handle both string and NarrativeSequence outputs
    if (typeof narrative === 'string') {
      return narrative;
    }

    // For NarrativeSequence, join the text parts
    if (Array.isArray(narrative)) {
      return narrative.map((item: any) => item.text).join(' ');
    }

    return formatEventFallback(event);
  } catch (error) {
    console.warn('Failed to generate narrative for event:', event.type, error);
    return formatEventFallback(event);
  }
}

/**
 * Transforms a WorldEvent into a TerminalEntry using the narrative generation system
 * Always generates observer perspective for the CombatTool
 */
export function worldEventToTerminalEntry(
  context: TransformerContext,
  event: WorldEvent
): TerminalEntry {
  // Generate narrative content using the narrative system (always observer perspective)
  const narrativeContent = generateNarrativeFromEvent(context, event);

  return {
    id: event.id,
    type: 'text',
    content: narrativeContent,
    timestamp: event.ts,
    metadata: {
      actor: event.actor,
      trace: event.trace,
      eventType: event.type,
      location: event.location,
    },
  };
}

/**
 * Formats a WorldEvent as a fallback when no narrative is available
 */
function formatEventFallback(event: WorldEvent): string {
  const timestamp = new Date(event.ts).toLocaleTimeString('en-US', {
    hour12: false,
    minute: '2-digit',
    second: '2-digit'
  });

  // Format based on event type for better readability
  switch (event.type) {
    case EventType.COMBATANT_DID_ATTACK:
      return `[${timestamp}] ${event.actor} attacks ${(event.payload as any)?.target || 'unknown target'}`;

    case EventType.COMBATANT_DID_DEFEND:
      return `[${timestamp}] ${event.actor} defends`;

    case EventType.COMBATANT_DID_MOVE:
      return `[${timestamp}] ${event.actor} moves in combat`;

    case EventType.COMBAT_SESSION_DID_START:
      return `[${timestamp}] ⚔️ Combat begins!`;

    case EventType.COMBAT_TURN_DID_START:
      return `[${timestamp}] 🎯 ${(event.payload as any)?.actor || 'Unknown'}'s turn begins`;

    case EventType.COMBAT_ROUND_DID_START:
      return `[${timestamp}] 🔄 Round ${(event.payload as any)?.roundNumber || '?'} begins`;

    default:
      // Generic fallback
      const payload = event.payload ? JSON.stringify(event.payload) : '';
      return `[${timestamp}] ${event.type}${event.actor ? ` - ${event.actor}` : ''}${payload ? `: ${payload}` : ''}`;
  }
}

/**
 * Creates a combat system message entry
 */
export function createCombatSystemEntry(
  id: string,
  message: string,
  metadata?: Record<string, any>
): TerminalEntry {
  return {
    id,
    type: 'system',
    content: message,
    timestamp: Date.now(),
    metadata: {
      source: 'combat-tool',
      ...metadata,
    },
  };
}

/**
 * Creates a combat error message entry
 */
export function createCombatErrorEntry(
  id: string,
  error: string,
  context?: any
): TerminalEntry {
  return {
    id,
    type: 'error',
    content: error,
    timestamp: Date.now(),
    metadata: {
      source: 'combat-tool',
      context,
    },
  };
}

/**
 * Creates a player input entry for the terminal
 */
export function createCombatInputEntry(
  id: string,
  command: string,
  actor?: ActorURN
): TerminalEntry {
  return {
    id,
    type: 'input',
    content: command,
    timestamp: Date.now(),
    metadata: {
      actor,
      source: 'player-input',
    },
  };
}

/**
 * Batch converts multiple WorldEvents to TerminalEntries
 * Optimized for performance with large event lists
 * Always generates observer perspective for the CombatTool
 */
export function worldEventsToTerminalEntries(
  context: TransformerContext,
  events: WorldEvent[],
  maxEntries?: number
): TerminalEntry[] {
  const entries = events.map(event =>
    worldEventToTerminalEntry(context, event)
  );

  // Apply max entries limit if specified
  return maxEntries ? entries.slice(-maxEntries) : entries;
}

/**
 * Creates welcome message for combat terminal
 */
export function createCombatWelcomeEntries(): TerminalEntry[] {
  return [
    createCombatSystemEntry(
      'welcome-title',
      '⚔️ Combat Terminal Ready'
    ),
    createCombatSystemEntry(
      'welcome-instructions',
      'Enter commands to control your character: attack, defend, move, etc.'
    ),
    createCombatSystemEntry(
      'welcome-tip',
      'Type "help" for available commands or start combat to begin!'
    ),
  ];
}

/**
 * Creates setup phase message entries
 */
export function createSetupPhaseEntries(): TerminalEntry[] {
  return [
    createCombatSystemEntry(
      'setup-title',
      '🛠️ Combat Setup Phase'
    ),
    createCombatSystemEntry(
      'setup-instructions',
      'Configure your teams and adjust actor settings.'
    ),
    createCombatSystemEntry(
      'setup-ready',
      'Click "Start Combat" when ready to begin the battle!'
    ),
  ];
}

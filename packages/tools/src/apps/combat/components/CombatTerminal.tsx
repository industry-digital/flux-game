import { useCallback, useEffect, useMemo } from 'react';
import { Terminal, useTerminal } from '../../../shared/terminal';
import { createCombatInputEntry, createCombatErrorEntry, createSetupPhaseEntries, createCombatWelcomeEntries, worldEventsToTerminalEntries } from '../adapters/worldEventToTerminal';
import type { TerminalEntry } from '@flux/ui';
import type { WorldEvent, ActorURN } from '@flux/core';

export interface CombatTerminalProps {
  events: WorldEvent[];
  onCommand?: (command: string) => void;
  currentActor?: ActorURN;
  maxEntries?: number;
  isSetupPhase?: boolean;
  showWelcomeMessage?: boolean;
  className?: string;
}

export function CombatTerminal({
  events,
  onCommand,
  currentActor,
  maxEntries = 1000,
  isSetupPhase = false,
  showWelcomeMessage = true,
  className,
}: CombatTerminalProps) {

  // Memoize terminal config to prevent recreation on every render
  const terminalConfig = useMemo(() => ({
    maxEntries,
    autoScroll: true,
    showTimestamps: false, // We handle timestamps in narratives/formatting
    gameMode: true, // Enable Zilla Slab and comfortable styling
  }), [maxEntries]);

  // Initialize terminal with game mode enabled for proportional fonts
  const terminal = useTerminal(terminalConfig, 'dark');

  // Extract stable methods to avoid infinite loops
  const { clear, addEntry } = terminal;

  // Update terminal when events change
  useEffect(() => {
    console.log('🖥️ CombatTerminal useEffect - events received:', {
      eventsLength: events.length,
      events: events.slice(-3).map(e => ({ type: e.type, actor: e.actor, id: e.id })), // Show last 3 events
      isSetupPhase,
      showWelcomeMessage
    });

    // Clear and repopulate terminal efficiently
    clear();

    // Add welcome/setup messages if needed (only when there are no events)
    if (showWelcomeMessage && events.length === 0) {
      if (isSetupPhase) {
        createSetupPhaseEntries().forEach((entry: TerminalEntry) => addEntry(entry));
      } else {
        createCombatWelcomeEntries().forEach((entry: TerminalEntry) => addEntry(entry));
      }
    }

    // Convert and add events
    const eventEntries = worldEventsToTerminalEntries(events, currentActor);
    console.log('🔄 WorldEvents converted to TerminalEntries:', {
      originalEventsCount: events.length,
      convertedEntriesCount: eventEntries.length,
      sampleEntries: eventEntries.slice(-3).map(e => ({ id: e.id, type: e.type, content: e.content.toString().substring(0, 50) + '...' }))
    });

    eventEntries.forEach((entry: TerminalEntry) => {
      console.log('➕ Adding entry to terminal:', { id: entry.id, type: entry.type, content: entry.content.toString().substring(0, 100) });
      addEntry(entry);
    });

    console.log('📊 Terminal state after adding entries:', {
      totalEntries: terminal.entries.length,
      visibleEntries: terminal.visibleEntries.length,
      lastFewEntries: terminal.entries.slice(-3).map(e => ({ id: e.id, type: e.type }))
    });
  }, [events, currentActor, isSetupPhase, showWelcomeMessage, clear, addEntry]);

  // Handle command input with proper error handling
  const handleCommand = useCallback((command: string) => {
    if (!command.trim()) return;

    try {
      // Add input entry to terminal for immediate feedback
      const inputEntry = createCombatInputEntry(
        `input-${Date.now()}`,
        command,
        currentActor
      );

      terminal.addEntry(inputEntry);

      // Execute command through parent handler
      onCommand?.(command);
    } catch (error: any) {
      // Add error entry if command execution fails
      const errorEntry = createCombatErrorEntry(
        `error-${Date.now()}`,
        `Command failed: ${error.message}`,
        { command, actor: currentActor }
      );

      terminal.addEntry(errorEntry);
    }
  }, [onCommand, currentActor, terminal]);

  return (
    <div
      className={`combat-terminal ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0, // Important for flex child to shrink
        backgroundColor: '#282828',
        border: '1px solid #504945',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Terminal Display - takes remaining space */}
      <div
        ref={terminal.parentRef} // Move the ref to the actual scroll container
        style={{
          flex: 1,
          minHeight: 0, // Important for flex child to shrink
          overflow: 'auto', // This container should handle scrolling
          height: '100%', // Explicit height for TanStack Virtual
        }}
      >
        <Terminal
          terminal={terminal}
          virtualizer={terminal.virtualizer}
          entries={terminal.entries}
        />
      </div>

      {/* Command Input - fixed height at bottom */}
      {onCommand && !isSetupPhase && (
        <div
          className="combat-terminal__input"
          style={{
            flexShrink: 0, // Don't shrink the input
            padding: '0.75rem',
            borderTop: '1px solid #504945',
            backgroundColor: '#3c3836',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              color: '#b8bb26',
              fontWeight: 'bold',
              fontFamily: 'Zilla Slab, serif'
            }}>
              {'>'}
            </span>
            <input
              type="text"
              placeholder="Enter combat command..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ebdbb2',
                fontFamily: 'Zilla Slab, serif',
                fontSize: '16px',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  if (input.value.trim()) {
                    handleCommand(input.value.trim());
                    input.value = '';
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

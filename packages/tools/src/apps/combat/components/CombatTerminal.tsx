import { useMemo, useCallback, useEffect } from 'react';
import { Terminal, useVirtualizedList, createHeightCalculator, DEFAULT_HEIGHT_CONFIG } from '@flux/ui';
import { useTerminal } from '../hooks/useTerminal';
import {
  worldEventsToTerminalEntries,
  createCombatInputEntry,
  createCombatWelcomeEntries,
  createSetupPhaseEntries,
  createCombatErrorEntry
} from '../adapters/worldEventToTerminal';
import type { WorldEvent, ActorURN } from '@flux/core';
import type { TerminalEntry } from '@flux/ui';

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

  // Convert WorldEvents to TerminalEntries using adapter pattern
  const terminalEntries = useMemo(() => {
    const entries: TerminalEntry[] = [];

    // Add welcome/setup messages if needed
    if (showWelcomeMessage) {
      if (isSetupPhase) {
        entries.push(...createSetupPhaseEntries());
      } else {
        entries.push(...createCombatWelcomeEntries());
      }
    }

    // Convert events to terminal entries
    entries.push(...worldEventsToTerminalEntries(events, currentActor));

    return entries;
  }, [events, currentActor, isSetupPhase, showWelcomeMessage]);

  // Create dynamic height calculator based on terminal entries
  const heightCalculator = useMemo(() => {
    const config = {
      ...DEFAULT_HEIGHT_CONFIG,
      baseLineHeight: 22, // Slightly larger for Zilla Slab readability
      charactersPerLine: 70, // Conservative estimate for terminal width
      minHeight: 36, // Minimum height for game mode
      entryPadding: 16, // Account for our CSS padding and margins
    };
    return createHeightCalculator(terminalEntries, config);
  }, [terminalEntries]);

  // Create virtualization for performance with dynamic sizing
  const virtualization = useVirtualizedList<TerminalEntry>([], {
    itemHeight: heightCalculator, // Use dynamic height calculation
    viewportHeight: 400,
    overscan: 10, // Good buffer for smooth scrolling
  });

  // Initialize terminal with game mode enabled for proportional fonts
  const terminal = useTerminal(
    {
      maxEntries,
      autoScroll: true,
      showTimestamps: false, // We handle timestamps in narratives/formatting
      gameMode: true, // Enable Zilla Slab and comfortable styling
    },
    {
      itemHeight: heightCalculator, // Use dynamic height calculation
      viewportHeight: 400,
      overscan: 10,
    },
    'dark'
  );


  // Update terminal when entries change - use effect for proper timing
  useEffect(() => {
    // Clear and repopulate terminal efficiently
    terminal.clear();
    terminalEntries.forEach(entry => {
      terminal.addEntry(entry);
    });
  }, [terminalEntries, terminal]);

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
      <div style={{
        flex: 1,
        minHeight: 0, // Important for flex child to shrink
        overflow: 'hidden'
      }}>
        <Terminal
          terminal={terminal}
          virtualization={virtualization}
          itemHeight={heightCalculator} // Use dynamic height calculation
          // Remove fixed viewportHeight to let it fill parent
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

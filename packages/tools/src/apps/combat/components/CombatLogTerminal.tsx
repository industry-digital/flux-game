import { useEffect, useMemo } from 'react';
import type { WorldEvent } from '@flux/core';
import { Terminal, useVirtualizedList } from '@flux/ui';
import { useTerminal } from '../hooks/useTerminal';

// Format timestamp for display
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    minute: '2-digit',
    second: '2-digit'
  });
};

// Format entry content for terminal display
const formatEntry = (entry: WorldEvent): string => {
  const timestamp = formatTimestamp(entry.ts);
  const payload = JSON.stringify(entry.payload);
  return `[${timestamp}] ${entry.type} - ${entry.actor}: ${payload}`;
};

export interface CombatLogTerminalProps {
  entries: WorldEvent[];
  maxEntries?: number;
}

export function CombatLogTerminal({
  entries,
  maxEntries = 10_000
}: CombatLogTerminalProps) {

  // Create virtualization hook
  const virtualization = useVirtualizedList([], {
    itemHeight: 24,
    viewportHeight: 400
  });

  // Initialize terminal using the concrete combat terminal hook
  const terminal = useTerminal(
    {
      maxEntries,
      autoScroll: true,
      showTimestamps: false // We handle timestamps in the content
    },
    {
      itemHeight: 24,
      viewportHeight: 400
    },
    'dark'
  );

  // Limit entries to prevent memory issues - memoized for performance
  const displayEntries = useMemo(() =>
    entries.slice(-maxEntries),
    [entries, maxEntries]
  );

  // Update terminal when entries change
  useEffect(() => {
    // Clear existing entries
    terminal.clear();

    // Add all entries
    displayEntries.forEach((entry, index) => {
      const formattedContent = formatEntry(entry);
      terminal.print(`entry-${entry.id}-${index}`, formattedContent);
    });
  }, [displayEntries, terminal]);

  // Show empty state if no entries
  useEffect(() => {
    if (displayEntries.length === 0) {
      terminal.clear();
      terminal.print('empty-state', 'No combat actions yet. Enter a command to begin!');
    }
  }, [displayEntries.length, terminal]);

  return (
    <div className="combat-log-terminal">
      {/* Header */}
      <div className="combat-log-terminal__header" style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #504945',
        backgroundColor: '#3c3836'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#ebdbb2'
        }}>
          Combat Log
        </h3>
        <p style={{
          margin: '0.25rem 0 0 0',
          fontSize: '0.75rem',
          color: '#a89984'
        }}>
          {displayEntries.length} entries
          {entries.length > maxEntries && ` (showing last ${maxEntries})`}
        </p>
      </div>

      {/* Terminal */}
      <Terminal
        terminal={terminal}
        virtualization={virtualization}
        itemHeight={24}
        viewportHeight={400}
      />

      {/* Legend */}
      <div className="combat-log-terminal__legend" style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid #504945',
        backgroundColor: '#3c3836',
        display: 'flex',
        gap: '1rem',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#83a598',
            borderRadius: '50%'
          }}></div>
          <span style={{ color: '#a89984' }}>Turn Start</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#fabd2f',
            borderRadius: '50%'
          }}></div>
          <span style={{ color: '#a89984' }}>Action</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#fb4934',
            borderRadius: '50%'
          }}></div>
          <span style={{ color: '#a89984' }}>Attack</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#928374',
            borderRadius: '50%'
          }}></div>
          <span style={{ color: '#a89984' }}>Miss</span>
        </div>
      </div>
    </div>
  );
}

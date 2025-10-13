import { useEffect, useRef } from 'react';
import type { WorldEvent } from '@flux/core';

export interface CombatLogProps {
  entries: WorldEvent[];
  maxEntries?: number;
}

/**
 * Combat log component that displays world events with auto-scrolling
 * and proper theming through CSS custom properties
 */
export function CombatLog({ entries, maxEntries = 10_000 }: CombatLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Limit entries to prevent memory issues
  const displayEntries = entries.slice(-maxEntries);

  return (
    <div
      className="combat-log flex-1 rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)'
      }}
    >
      <div
        className="p-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h3 style={{
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family-heading)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          margin: 0
        }}>
          Combat Log ({displayEntries.length})
        </h3>
      </div>

      <div
        ref={logRef}
        className="h-48 overflow-y-auto p-3"
        style={{
          fontFamily: 'var(--font-family-mono)',
          fontSize: 'var(--font-size-xs)',
          lineHeight: 'var(--line-height-normal)'
        }}
      >
        {displayEntries.length === 0 ? (
          <p style={{
            color: 'var(--color-text-secondary)',
            margin: 0,
            fontStyle: 'italic'
          }}>
            No events yet...
          </p>
        ) : (
          displayEntries.map((event, index) => (
            <div
              key={event.id || `${event.timestamp}-${index}`}
              style={{
                color: 'var(--color-text)',
                marginBottom: '0.25rem',
                padding: '0.125rem 0',
                borderBottom: index < displayEntries.length - 1 ? '1px solid var(--color-border)' : 'none',
                paddingBottom: index < displayEntries.length - 1 ? '0.25rem' : '0.125rem'
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>
                [{formatTimestamp(event.timestamp)}]
              </span>
              {' '}
              <span style={{
                color: 'var(--color-accent)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {event.type}
              </span>
              {': '}
              <span>{JSON.stringify(event.payload || {}, null, 0)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

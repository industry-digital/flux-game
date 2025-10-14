import React, { useEffect } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { TerminalEntry } from '../../types/terminal';
import type { TerminalHook } from '~/types/terminal';

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    minute: '2-digit',
    second: '2-digit'
  });
};

interface TerminalProps {
  terminal: TerminalHook;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  entries: TerminalEntry[];
  onTerminalReady?: (terminal: TerminalHook) => void;
  onScroll?: (event: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }) => void;
}

export function Terminal({
  terminal,
  virtualizer,
  entries,
  onTerminalReady,
}: TerminalProps) {

  const virtualItems = virtualizer.getVirtualItems();

  // Entry styling helpers
  const getEntryClasses = (entry: TerminalEntry): string[] => {
    const classes = [
      'terminal__entry',
      `terminal__entry--${entry.type}`,
    ];

    // Add conditional classes
    if (terminal.terminalClasses.some(cls =>
      typeof cls === 'object' && cls['terminal--show-timestamps']
    )) {
      classes.push('terminal__entry--with-timestamp');
    }

    return classes;
  };

  // TanStack Virtual handles scroll element connection automatically

  useEffect(() => {
    onTerminalReady?.(terminal);
  }, [terminal, onTerminalReady]);

  return (
    <div
      className={terminal.terminalClasses.join(' ')}
      style={{
        height: virtualizer.getTotalSize(),
        width: '100%',
        position: 'relative',
      }}
    >
        {virtualItems.map((virtualItem) => {
          const entry = entries[virtualItem.index];
          if (!entry) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={(el) => {
                if (el) {
                  virtualizer.measureElement(el);
                }
              }}
              className={getEntryClasses(entry).join(' ')}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {/* Timestamp */}
              {terminal.terminalClasses.some(cls =>
                typeof cls === 'object' && cls['terminal--show-timestamps']
              ) && (
                <div className="terminal__timestamp">
                  {formatTimestamp(entry.timestamp)}
                </div>
              )}

              {/* Entry Content */}
              {entry.type === 'text' && (
                <div className="terminal__text">
                  {entry.content as string}
                </div>
              )}
              {entry.type === 'input' && (
                <div className="terminal__input">
                  <span className="terminal__input-prompt">{'>'}</span>
                  <span className="terminal__input-text">{entry.content as string}</span>
                </div>
              )}
              {entry.type === 'system' && (
                <div className="terminal__system">
                  {entry.content as string}
                </div>
              )}
              {entry.type === 'error' && (
                <div className="terminal__error">
                  {entry.content as string}
                </div>
              )}
              {entry.type === 'element' && (
                <div className="terminal__element">
                  {entry.content as React.ReactNode}
                </div>
              )}
            </div>
          );
        })}
      </div>
  );
}

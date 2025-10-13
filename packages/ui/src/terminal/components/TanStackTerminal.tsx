import React, { useRef, useEffect, useCallback } from 'react';
import type { TerminalEntry } from '../../types/terminal';
import type { ListVirtualizationHook } from '../../types/list';
import type { TerminalHook } from '../types/terminal';

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    minute: '2-digit',
    second: '2-digit'
  });
};

interface TerminalProps {
  terminal: TerminalHook;
  virtualization: ListVirtualizationHook<TerminalEntry>;
  onTerminalReady?: (terminal: TerminalHook) => void;
  onScroll?: (event: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }) => void;
}

export function Terminal({
  terminal,
  virtualization,
  onTerminalReady,
  onScroll,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get TanStack Virtual specific internals
  const { virtualizer, parentRef } = virtualization.__internal as any;

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    onScroll?.({
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
    });
  }, [onScroll]);

  // Entry styling helpers
  const getEntryClasses = (entry: TerminalEntry) => [
    'terminal__entry',
    `terminal__entry--${entry.type}`,
    {
      'terminal__entry--with-timestamp': terminal.terminalClasses.some(cls =>
        typeof cls === 'object' && cls['terminal--show-timestamps']
      ),
    }
  ].filter(Boolean);

  // Setup container reference for TanStack Virtual
  useEffect(() => {
    if (containerRef.current) {
      virtualization.__internal.setScrollElement(containerRef.current);
    }
  }, [virtualization]);

  useEffect(() => {
    onTerminalReady?.(terminal);
  }, [terminal, onTerminalReady]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={containerRef}
      className={terminal.terminalClasses.join(' ')}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const entry = virtualization.visibleItems[virtualItem.index - virtualItems[0]?.index || 0];
          if (!entry) return null;

          return (
            <div
              key={entry.id}
              className={getEntryClasses(entry).join(' ')}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
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
    </div>
  );
}

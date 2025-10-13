import React, { useRef, useEffect, useCallback, ReactNode } from 'react';
import { TerminalEntry, TerminalHook, ListVirtualizationHook } from '~/types';
import '../style.css';

const DEFAULT_VIEWPORT_STYLE = { height: '100%' };

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

interface TerminalProps {
  terminal: TerminalHook;
  virtualization: ListVirtualizationHook<TerminalEntry>;
  itemHeight?: number | ((index: number) => number);
  viewportHeight?: number;
  onTerminalReady?: (terminal: TerminalHook) => void;
  onScroll?: (event: { scrollTop: number; scrollHeight: number; clientHeight: number }) => void;
}

export function Terminal({
  terminal,
  virtualization,
  itemHeight = 24,
  viewportHeight,
  onTerminalReady,
  onScroll,
}: TerminalProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Get virtualization internals for component integration
  const { contentHeight, visibleRange } = virtualization.__internal;

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    virtualization.__internal.setScrollTop(target.scrollTop);
    virtualization.__internal.setContainerHeight(target.clientHeight);

    onScroll?.({
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
    });
  }, [virtualization, onScroll]);

  // Calculate offset for virtualization
  const offsetTop = (() => {
    const { start } = visibleRange;

    if (typeof itemHeight === 'number') {
      return start * itemHeight;
    }

    // Dynamic height calculation
    let offset = 0;
    for (let i = 0; i < start; i++) {
      offset += itemHeight(i);
    }
    return offset;
  })();

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

  const getEntryStyle = (_entry: TerminalEntry, index: number) => {
    if (typeof itemHeight === 'number') {
      return { height: `${itemHeight}px` };
    }

    const { start } = visibleRange;
    const actualIndex = start + index;
    return { height: `${itemHeight(actualIndex)}px` };
  };

  // Lifecycle effects
  useEffect(() => {
    if (viewportRef.current) {
      virtualization.__internal.setContainerHeight(viewportRef.current.clientHeight);
      virtualization.__internal.setScrollElement(viewportRef.current);

      // Handle resize if no fixed viewport height
      if (!viewportHeight) {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            virtualization.__internal.setContainerHeight(entry.contentRect.height);
          }
        });
        resizeObserver.observe(viewportRef.current);

        return () => {
          resizeObserver.disconnect();
        };
      }
    }
  }, [viewportHeight, virtualization]);

  useEffect(() => {
    onTerminalReady?.(terminal);
  }, [terminal, onTerminalReady]);

  return (
    <div
      ref={viewportRef}
      className={`terminal ${terminal.terminalClasses.join(' ')}`}
      style={viewportHeight ? { height: `${viewportHeight}px` } : DEFAULT_VIEWPORT_STYLE}
      onScroll={handleScroll}
    >
      {/* Virtual Content Container */}
      <div
        className="terminal__content"
        style={{
          height: `${contentHeight}px`,
          paddingTop: `${offsetTop}px`
        }}
      >
        {/* Visible Terminal Entries */}
        {terminal.visibleEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={getEntryClasses(entry).join(' ')}
            style={getEntryStyle(entry, index)}
          >
            {/* Timestamp (if enabled) */}
            {terminal.terminalClasses.some(cls =>
              typeof cls === 'object' && cls['terminal--show-timestamps']
            ) && (
              <div className="terminal__timestamp">
                {formatTimestamp(entry.timestamp)}
              </div>
            )}

            {/* Text Entry */}
            {entry.type === 'text' && (
              <div className="terminal__text">
                {entry.content as string}
              </div>
            )}

            {/* Input Entry */}
            {entry.type === 'input' && (
              <div className="terminal__input">
                <span className="terminal__input-prompt">{'>'}</span>
                <span className="terminal__input-text">{entry.content as string}</span>
              </div>
            )}

            {/* System Entry */}
            {entry.type === 'system' && (
              <div className="terminal__system">
                {entry.content as string}
              </div>
            )}

            {/* Error Entry */}
            {entry.type === 'error' && (
              <div className="terminal__error">
                {entry.content as string}
              </div>
            )}

            {/* Element Entry - Preserves arbitrary React components */}
            {entry.type === 'element' && (
              <div className="terminal__element">
                {entry.content as ReactNode}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

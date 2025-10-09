import React, { useRef, useEffect, useCallback, ReactNode } from 'react';
import { useTerminal } from '../hooks';
import { TerminalConfig, TerminalEntry } from '../types';
import { VirtualizationConfig } from '../../list';
import { ThemeName } from '../../theme';
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
  config?: TerminalConfig;
  virtualizationConfig?: VirtualizationConfig;
  themeName?: ThemeName;
  viewportHeight?: number;
  header?: ReactNode;
  footer?: ReactNode;
  onTerminalReady?: (terminal: ReturnType<typeof useTerminal>) => void;
  onScroll?: (event: { scrollTop: number; scrollHeight: number; clientHeight: number }) => void;
}

export function Terminal({
  config = {},
  virtualizationConfig = {},
  themeName = 'dark',
  viewportHeight,
  header,
  footer,
  onTerminalReady,
  onScroll,
}: TerminalProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Setup terminal
  const terminal = useTerminal(config, {
    viewportHeight: viewportHeight || 400,
    ...virtualizationConfig,
  }, themeName);

  // Get virtualization internals for component integration
  const virtualization = terminal.__virtualization;
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
    const itemHeight = virtualizationConfig.itemHeight || 24;

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
      'terminal__entry--with-timestamp': config.showTimestamps,
    }
  ].filter(Boolean);

  const getEntryStyle = (entry: TerminalEntry, index: number) => {
    const itemHeight = virtualizationConfig.itemHeight || 24;

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
    <div className={`terminal ${terminal.terminalClasses.join(' ')}`}>
      {/* Terminal Header */}
      {header && (
        <div className="terminal__header">
          {header}
        </div>
      )}

      {/* Terminal Viewport */}
      <div
        ref={viewportRef}
        className="terminal__viewport"
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
              {config.showTimestamps && (
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

              {/* Element Entry */}
              {entry.type === 'element' && (
                <div className="terminal__element">
                  {entry.content as ReactNode}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Footer */}
      {footer && (
        <div className="terminal__footer">
          {footer}
        </div>
      )}
    </div>
  );
}

import { useMemo, useCallback, ReactNode, useRef, useState, useEffect } from 'react';
import type { TerminalEntry, TerminalConfig, TerminalDependencies, ThemeName, TerminalHook, UseTerminal } from '~/types';

const DEFAULT_TERMINAL_CONFIG: Required<TerminalConfig> = Object.freeze({
  maxEntries: 10_000,
  autoScroll: true,
  showTimestamps: false,
  gameMode: false,
});

const DEFAULT_LINE_HEIGHT = 24;

// DEFAULT_TERMINAL_DEPS removed - would cross domain boundaries
// Use composition.ts for convenience APIs that wire up dependencies

export const createTerminalHook = (deps: TerminalDependencies): UseTerminal => {

  /**
   * Terminal hook for managing terminal-like interfaces
   *
   * Provides reactive state management for displaying entries in a terminal format.
   * Supports auto-scrolling and theme integration via dependency injection.
   */
  return function useTerminal(
    config?: TerminalConfig,
    themeName: ThemeName = 'dark',
  ): TerminalHook {
    const mergedConfig = useMemo(() => ({ ...DEFAULT_TERMINAL_CONFIG, ...config }), [config]);

    // Setup dependencies - hooks are called here, inside the React component
    const theme = deps.useTheme(themeName);

    // State management
    const [entries, setEntries] = useState<TerminalEntry[]>([]);
    const parentRef = useRef<HTMLDivElement>(null);

    // TanStack Virtual setup with dynamic height measurement
    const virtualizer = deps.useVirtualizer({
      count: entries.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => DEFAULT_LINE_HEIGHT, // Initial estimate
      getItemKey: (index) => entries[index]?.id ?? index,
      // Dynamic height measurement for proper spacing
      measureElement: (element) => {
        if (!element) return DEFAULT_LINE_HEIGHT;
        return element.getBoundingClientRect().height || DEFAULT_LINE_HEIGHT;
      },
      overscan: 10,
    });

    // Computed properties
    const terminalClasses = useMemo(() => [
      'terminal',
      `terminal--${theme.currentTheme}`,
      {
        'terminal--auto-scroll': mergedConfig.autoScroll,
        'terminal--show-timestamps': mergedConfig.showTimestamps,
        'terminal--game-mode': mergedConfig.gameMode,
      }
    ], [theme.currentTheme, mergedConfig.autoScroll, mergedConfig.showTimestamps, mergedConfig.gameMode]);

    // Methods
    /**
     * Adds a text entry to the terminal
     * @param id - Unique identifier for the entry
     * @param text - Text content to display
     */
    const print = useCallback((id: string, text: string): void => {
      const entry: TerminalEntry = {
        id,
        type: 'text',
        content: text,
        timestamp: deps.timestamp(),
        height: DEFAULT_LINE_HEIGHT,
      };

      setEntries(prev => [...prev, entry].slice(-mergedConfig.maxEntries));
    }, [mergedConfig.maxEntries]);

    /**
     * Adds a React component entry to the terminal
     * @param id - Unique identifier for the entry
     * @param component - React component to render
     */
    const render = useCallback((id: string, component: ReactNode): void => {
      const entry: TerminalEntry = {
        id,
        type: 'element',
        content: component,
        timestamp: deps.timestamp(),
        // Height will be determined dynamically by the component
      };

      setEntries(prev => [...prev, entry].slice(-mergedConfig.maxEntries));
    }, [mergedConfig.maxEntries]);

    const clear = useCallback((): void => {
      setEntries([]);
    }, []);

    /**
     * Adds a generic entry to the terminal
     * @param entry - Complete terminal entry
     */
    const addEntry = useCallback((entry: TerminalEntry): void => {
      setEntries(prev => [...prev, entry].slice(-mergedConfig.maxEntries));
    }, [mergedConfig.maxEntries]);

    // Auto-scroll effect
    const scrollToBottom = useCallback((): void => {
      if (entries.length > 0) {
        virtualizer.scrollToIndex(entries.length - 1, { align: 'end' });
      }
    }, [entries.length]); // Remove virtualizer dependency

    const scrollToTop = useCallback((): void => {
      virtualizer.scrollToIndex(0, { align: 'start' });
    }, []); // Remove virtualizer dependency

    // Auto-scroll effect when entries change and autoScroll is enabled
    useEffect(() => {
      if (mergedConfig.autoScroll && entries.length > 0) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          virtualizer.scrollToIndex(entries.length - 1, { align: 'end' });
        }, 0);
      }
    }, [entries.length, mergedConfig.autoScroll]);

    return useMemo(() => ({
      // Core methods - actually used in codebase
      print,
      render,
      clear,

      // Generic entry method for advanced usage
      addEntry,

      // Scroll control
      scrollToBottom,
      scrollToTop,

      // State access
      visibleEntries: entries, // All entries are visible in TanStack Virtual
      totalEntries: entries.length,

      // Component integration
      terminalClasses,

      // TanStack Virtual integration
      virtualizer,
      entries,
      parentRef,
    }), [
      print, render, clear, addEntry,
      scrollToBottom, scrollToTop,
      entries, terminalClasses, parentRef
    ]);
  }
};

import { useMemo, useCallback, ReactNode } from 'react';
import type { TerminalEntry, TerminalConfig, TerminalDependencies, VirtualizationConfig, ThemeName, TerminalHook, UseTerminal } from '~/types';

const DEFAULT_TERMINAL_CONFIG: Required<TerminalConfig> = Object.freeze({
  maxEntries: 10_000,
  autoScroll: true,
  showTimestamps: false,
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
    virtualizationConfig?: VirtualizationConfig,
    themeName: ThemeName = 'dark',
  ): TerminalHook {
    const mergedVirtualizationConfig = { ...virtualizationConfig };
    const mergedConfig = { ...DEFAULT_TERMINAL_CONFIG, ...config };

    // Setup dependencies - hooks are called here, inside the React component
    const theme = deps.useTheme(themeName);
    const virtualization = deps.useVirtualizedList<TerminalEntry>([], {
      itemHeight: DEFAULT_LINE_HEIGHT,
      ...mergedVirtualizationConfig,
    });

    // Computed properties
    const terminalClasses = useMemo(() => [
      'terminal',
      `terminal--${theme.currentTheme}`,
      {
        'terminal--auto-scroll': mergedConfig.autoScroll,
        'terminal--show-timestamps': mergedConfig.showTimestamps,
      }
    ], [theme.currentTheme, mergedConfig.autoScroll, mergedConfig.showTimestamps]);

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

      virtualization.addItem(entry);

      if (mergedConfig.autoScroll) {
        virtualization.scrollToBottom();
      }
    }, [virtualization, mergedConfig.autoScroll]);

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

      virtualization.addItem(entry);

      if (mergedConfig.autoScroll) {
        virtualization.scrollToBottom();
      }
    }, [virtualization, mergedConfig.autoScroll]);

    const clear = useCallback((): void => {
      virtualization.clear();
    }, [virtualization]);

    return {
      // Core methods
      print,
      render,
      clear,

      // Scroll control
      scrollToBottom: virtualization.scrollToBottom,
      scrollToTop: virtualization.scrollToTop,

      // State access
      visibleEntries: virtualization.visibleItems,
      totalEntries: virtualization.totalItems,

      // Component integration
      terminalClasses,
    };
  }
};

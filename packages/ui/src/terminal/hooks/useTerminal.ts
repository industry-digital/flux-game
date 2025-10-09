import { useMemo, useCallback, ReactNode } from 'react';
import type { TerminalEntry, TerminalConfig, TerminalDependencies, VirtualizationConfig, ThemeName } from '~/types';

const DEFAULT_CONFIG: Required<TerminalConfig> = {
  maxEntries: 10_000,
  autoScroll: true,
  showTimestamps: false,
};

// DEFAULT_TERMINAL_DEPS removed - would cross domain boundaries
// Use composition.ts for convenience APIs that wire up dependencies

export const createTerminalHook = (deps: TerminalDependencies) => {

  /**
   * Terminal hook for managing terminal-like interfaces
   *
   * Provides reactive state management for displaying entries in a terminal format.
   * Supports auto-scrolling and theme integration via dependency injection.
   */
  return function useTerminal(
    config: TerminalConfig = {},
    virtualizationConfig: VirtualizationConfig = {},
    themeName: ThemeName = 'dark',
  ) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Setup dependencies - hooks are called here, inside the React component
    const theme = deps.useTheme(themeName);
    const virtualization = deps.useVirtualizedList<TerminalEntry>([], {
      itemHeight: 24, // Default text line height
      ...virtualizationConfig,
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
    const print = useCallback((id: string, text: string): void => {
      const entry: TerminalEntry = {
        id,
        type: 'text',
        content: text,
        timestamp: deps.timestamp(),
        height: 24, // Default text line height
      };

      virtualization.addItem(entry);

      if (mergedConfig.autoScroll) {
        virtualization.scrollToBottom();
      }
    }, [virtualization, mergedConfig.autoScroll, deps]);

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
    }, [virtualization, mergedConfig.autoScroll, deps]);

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

      // Internal virtualization access (for Terminal component)
      __virtualization: virtualization,
    };
  }
};

import { computed, type VNode } from 'vue';
import { PotentiallyImpureOperations } from '@flux/core';
import type { VirtualizationAPI } from './useVirtualizedList';
import type { useTheme } from '../../../infrastructure/theme/composables';


export type TerminalEntry = {
  id: string;
  timestamp: number;
  type: 'text' | 'element';
  content: string | VNode;
  height?: number;
};

export type TerminalConfig = {
  maxEntries?: number;
  autoScroll?: boolean;
  showTimestamps?: boolean;
};

const DEFAULT_CONFIG: Required<TerminalConfig> = {
  maxEntries: 10_000,
  autoScroll: true,
  showTimestamps: false,
};

export type TerminalDependencies = {
  timestamp: PotentiallyImpureOperations['timestamp'];
};

export const DEFAULT_TERMINAL_DEPS: TerminalDependencies = {
  timestamp: () => Date.now(),
};

/**
 * Terminal composable for managing terminal-like interfaces
 *
 * Provides reactive state management for displaying entries in a terminal format.
 * Supports auto-scrolling and theme integration via dependency injection.
 */
export function useTerminal(
  config: TerminalConfig,
  virtualization: VirtualizationAPI<TerminalEntry>,
  theme: ReturnType<typeof useTheme>,
  deps: TerminalDependencies = DEFAULT_TERMINAL_DEPS,
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Computed properties
  const terminalClasses = computed(() => [
    'terminal',
    `terminal--${theme.currentTheme.value}`,
    {
      'terminal--auto-scroll': mergedConfig.autoScroll,
      'terminal--show-timestamps': mergedConfig.showTimestamps,
    }
  ]);

  // Methods
  const print = (id: string, text: string): void => {
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
  };

  const render = (id: string, component: VNode): void => {
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
  };

  const clear = (): void => {
    virtualization.clear();
  };

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

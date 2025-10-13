import { ReactNode } from 'react';
import type { ThemeName, UseTheme } from './theme';
import type { UseVirtualizedList, VirtualizationConfig } from './list';

export type TerminalEntry = {
  id: string;
  type: 'text' | 'input' | 'system' | 'error' | 'element';
  content: string | ReactNode;
  timestamp: number;
  metadata?: {
    actor?: string;
    trace?: string;
    [key: string]: any;
  };
  height?: number;
};

export type TerminalConfig = {
  maxEntries?: number;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  gameMode?: boolean;
};

// Dependencies are injected as hook functions - this allows for proper React hook usage
// Hook signatures are strongly typed by referencing the centralized type definitions
export type TerminalDependencies = {
  timestamp: () => number;
  useTheme: UseTheme;
  useVirtualizedList: UseVirtualizedList;
};

export type UseTerminal = (
  config?: TerminalConfig,
  virtualizationConfig?: VirtualizationConfig,
  themeName?: ThemeName,
) => TerminalHook;

export type TerminalHook = {
  // Core methods - actually used in codebase
  print: (id: string, text: string) => void;
  render: (id: string, component: ReactNode) => void;
  clear: () => void;

  // Generic entry method for advanced usage
  addEntry: (entry: TerminalEntry) => void;

  // Scroll control
  scrollToBottom: () => void;
  scrollToTop: () => void;

  // State access
  visibleEntries: TerminalEntry[];
  totalEntries: number;

  // Component integration
  terminalClasses: (string | Record<string, boolean>)[];
};

import { ReactNode } from 'react';
import type { ThemeName, UseTheme } from './theme';
import type { UseVirtualizedList, VirtualizationConfig } from './list';

export type TerminalEntry = {
  id: string;
  timestamp: number;
  type: 'text' | 'element';
  content: string | ReactNode;
  height?: number;
};

export type TerminalConfig = {
  maxEntries?: number;
  autoScroll?: boolean;
  showTimestamps?: boolean;
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
  // Core methods
  print: (id: string, text: string) => void;
  render: (id: string, component: ReactNode) => void;
  clear: () => void;

  // Scroll control
  scrollToBottom: () => void;
  scrollToTop: () => void;

  // State access
  visibleEntries: TerminalEntry[];
  totalEntries: number;

  // Component integration
  terminalClasses: (string | Record<string, boolean>)[];
};

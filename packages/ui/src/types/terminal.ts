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
  // Core methods
  print: (id: string, text: string) => void;
  render: (id: string, component: ReactNode) => void;
  addEntry: (entry: TerminalEntry) => void;
  clear: () => void;

  // Convenience methods for different entry types
  addText: (id: string, text: string, metadata?: TerminalEntry['metadata']) => void;
  addInput: (id: string, input: string, metadata?: TerminalEntry['metadata']) => void;
  addSystem: (id: string, message: string, metadata?: TerminalEntry['metadata']) => void;
  addError: (id: string, error: string, metadata?: TerminalEntry['metadata']) => void;
  addElement: (id: string, element: ReactNode, metadata?: TerminalEntry['metadata']) => void;

  // Scroll control
  scrollToBottom: () => void;
  scrollToTop: () => void;

  // State access
  visibleEntries: TerminalEntry[];
  totalEntries: number;

  // Component integration
  terminalClasses: (string | Record<string, boolean>)[];
};

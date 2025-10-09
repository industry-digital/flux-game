import { ReactNode } from 'react';
import type { UseThemeHook } from './theme';
import type { UseVirtualizedListHook } from './list';

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
  useTheme: UseThemeHook;
  useVirtualizedList: UseVirtualizedListHook;
};

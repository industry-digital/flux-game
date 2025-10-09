import { ReactNode } from 'react';
import type { useTheme } from '../theme';
import type { useVirtualizedList } from '../list';

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

export type TerminalDependencies = {
  timestamp: () => number;
  useTheme: typeof useTheme;
  useVirtualizedList: typeof useVirtualizedList;
};

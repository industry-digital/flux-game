import { createTerminalHook, useTheme, useVirtualizedList } from '@flux/ui';

export const useTerminal = createTerminalHook({
  useTheme,
  useVirtualizedList,
  timestamp: () => Date.now(),
});

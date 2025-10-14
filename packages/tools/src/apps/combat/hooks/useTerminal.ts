import { createTerminalHook, useTheme } from '@flux/ui';

export const useTerminal = createTerminalHook({
  useTheme,
  timestamp: () => Date.now(),
});

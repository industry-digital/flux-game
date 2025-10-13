import { useVirtualizer } from '@tanstack/react-virtual';
import { createTerminalHook, useTheme } from '@flux/ui';

/**
 * Terminal composition for Tools package
 *
 * This provides the concrete implementation of terminal dependencies,
 * injecting TanStack Virtual as the virtualization strategy.
 */
export const useTerminal = createTerminalHook({
  // Inject TanStack Virtual implementation
  useVirtualizer,

  // Inject theme system
  useTheme,

  // Inject timestamp provider
  timestamp: () => Date.now(),
});

/**
 * Re-export Terminal component for convenience
 */
export { Terminal } from '@flux/ui';

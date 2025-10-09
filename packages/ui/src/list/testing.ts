import { vi } from 'vitest';
import type { VirtualizationAPI } from './types';

/**
 * Creates a mock implementation of useVirtualizedList for testing
 * Returns both the hook function and API instance separately
 */
export function createMockUseVirtualizedList<T = any>() {
  const mockAPI: VirtualizationAPI<T> = {
    // Core operations
    addItem: vi.fn(),
    clear: vi.fn(),
    scrollToBottom: vi.fn(),
    scrollToTop: vi.fn(),

    // Read-only state
    visibleItems: [] as T[],
    totalItems: 0,

    // Component integration (internal use)
    __internal: {
      scrollTop: 0,
      setScrollTop: vi.fn(),
      containerHeight: 400,
      setContainerHeight: vi.fn(),
      contentHeight: 0,
      visibleRange: { start: 0, end: 0 },
      setScrollElement: vi.fn(),
    },
  };

  // Create a properly typed hook function
  const mockHook = vi.fn().mockReturnValue(mockAPI);

  return {
    hook: mockHook,
    api: mockAPI,
  };
}

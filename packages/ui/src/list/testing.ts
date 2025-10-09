import { vi } from 'vitest';
import type { ListVirtualizationHook } from './types';

/**
 * Creates a mock implementation of useVirtualizedList for testing
 * Returns both the hook function and API instance separately
 */
export function createMockUseVirtualizedList<T = any>() {
  // Internal state for the mock
  const items: T[] = [];

  const mockAPI: ListVirtualizationHook<T> = {
    // Core operations - make them functional
    addItem: vi.fn((item: T) => {
      items.push(item);
      // Update the visible items and total count
      (mockAPI as any).visibleItems = [...items];
      (mockAPI as any).totalItems = items.length;
    }),
    clear: vi.fn(() => {
      items.length = 0;
      (mockAPI as any).visibleItems = [];
      (mockAPI as any).totalItems = 0;
    }),
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

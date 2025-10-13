import { useVirtualizer } from '@tanstack/react-virtual';
import { useState, useCallback, useMemo, useRef } from 'react';
import type { VirtualizationConfig, ListVirtualizationHook } from '../types';

const DEFAULT_CONFIG: Required<VirtualizationConfig> = {
  itemHeight: 24,
  overscan: 5,
  viewportHeight: 400,
  scrollBehavior: 'smooth',
};

/**
 * TanStack Virtual-based virtualized list hook
 *
 * Provides the same API as our custom virtualization but uses
 * TanStack Virtual under the hood for better performance and
 * automatic dynamic height handling.
 */
export function useVirtualizedList<T>(
  initialItems: T[] = [],
  config: VirtualizationConfig = {}
): ListVirtualizationHook<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const parentRef = useRef<HTMLDivElement>(null);

  // State management
  const [items, setItems] = useState<T[]>([...initialItems]);

  // TanStack Virtual configuration
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Handle both fixed and dynamic item heights
      if (typeof mergedConfig.itemHeight === 'number') {
        return mergedConfig.itemHeight;
      }
      return mergedConfig.itemHeight(index);
    },
    overscan: mergedConfig.overscan,
    // Enable smooth scrolling
    scrollBehavior: mergedConfig.scrollBehavior,
  });

  // Computed properties matching our original API
  const totalItems = items.length;
  const contentHeight = virtualizer.getTotalSize();
  const visibleRange = useMemo(() => {
    const range = virtualizer.getVirtualItems();
    if (range.length === 0) {
      return { start: 0, end: 0 };
    }
    return {
      start: range[0].index,
      end: range[range.length - 1].index,
    };
  }, [virtualizer]);

  // Get visible items for rendering
  const visibleItems = useMemo(() => {
    const virtualItems = virtualizer.getVirtualItems();
    return virtualItems.map(virtualItem => items[virtualItem.index]);
  }, [virtualizer, items]);

  // Methods
  const addItem = useCallback((item: T): void => {
    setItems(prev => [...prev, item]);
  }, []);

  const clear = useCallback((): void => {
    setItems([]);
  }, []);

  const scrollToBottom = useCallback((): void => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(items.length - 1, {
        align: 'end',
        behavior: mergedConfig.scrollBehavior,
      });
    }
  }, [virtualizer, items.length, mergedConfig.scrollBehavior]);

  const scrollToTop = useCallback((): void => {
    virtualizer.scrollToIndex(0, {
      align: 'start',
      behavior: mergedConfig.scrollBehavior,
    });
  }, [virtualizer, mergedConfig.scrollBehavior]);

  // Container height management
  const [containerHeight, setContainerHeight] = useState(mergedConfig.viewportHeight);

  const setScrollElement = useCallback((element: HTMLElement | null) => {
    if (element) {
      (parentRef as any).current = element;
    }
  }, []);

  return {
    // Public API - matches our original interface
    addItem,
    clear,
    scrollToBottom,
    scrollToTop,
    visibleItems,
    totalItems,

    // Internal API for component integration
    __internal: {
      scrollTop: virtualizer.scrollOffset || 0,
      setScrollTop: (scrollTop: number) => {
        virtualizer.scrollToOffset(scrollTop);
      },
      containerHeight,
      setContainerHeight,
      contentHeight,
      visibleRange,
      setScrollElement,
      // TanStack Virtual specific
      virtualizer,
      parentRef,
    },
  };
}

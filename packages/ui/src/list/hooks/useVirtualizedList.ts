import { useState, useMemo, useCallback, useRef } from 'react';
import type { VirtualizationConfig, ListVirtualizationHook } from '../types';

const DEFAULT_CONFIG: Required<VirtualizationConfig> = {
  itemHeight: 24,
  overscan: 5,
  viewportHeight: 400,
  scrollBehavior: 'smooth',
};


/**
 * Generic virtualized list hook with overscan support
 *
 * Provides efficient rendering of large lists by only rendering visible items
 * plus an overscan buffer for smooth scrolling.
 */
export function useVirtualizedList<T>(
  initialItems: T[] = [],
  config: VirtualizationConfig = {}
): ListVirtualizationHook<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // Reactive state
  const [items, setItems] = useState<T[]>([...initialItems]);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(mergedConfig.viewportHeight);

  // Computed properties
  const totalItems = items.length;

  const contentHeight = useMemo(() => {
    if (typeof mergedConfig.itemHeight === 'number') {
      return items.length * mergedConfig.itemHeight;
    }

    // Dynamic height calculation
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += mergedConfig.itemHeight(i);
    }
    return height;
  }, [items.length, mergedConfig.itemHeight]);

  const visibleRange = useMemo(() => {
    const itemHeight = mergedConfig.itemHeight;
    const viewport = containerHeight;
    const scroll = scrollTop;

    if (typeof itemHeight === 'number') {
      // Fixed height calculation
      const startIndex = Math.floor(scroll / itemHeight);
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scroll + viewport) / itemHeight)
      );

      return {
        start: Math.max(0, startIndex),
        end: Math.max(0, endIndex)
      };
    }
    // Dynamic height calculation
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = itemHeight(i);
      if (currentHeight + height > scroll) {
        startIndex = i;
        break;
      }
      currentHeight += height;
    }

    // Find end index
    const targetHeight = scroll + viewport;
    for (let i = startIndex; i < items.length; i++) {
      currentHeight += itemHeight(i);
      if (currentHeight >= targetHeight) {
        endIndex = i;
        break;
      }
    }

    return {
      start: Math.max(0, startIndex),
      end: Math.min(items.length - 1, Math.max(0, endIndex))
    };
  }, [items.length, containerHeight, scrollTop, mergedConfig.itemHeight]);

  const visibleItems = useMemo((): T[] => {
    const { start, end } = visibleRange;
    const overscan = mergedConfig.overscan;

    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(items.length - 1, end + overscan);

    return items.slice(startWithOverscan, endWithOverscan + 1);
  }, [items, visibleRange, mergedConfig.overscan]);

  // Methods
  const addItem = useCallback((item: T): void => {
    setItems(prev => [...prev, item]);
  }, []);

  const clear = useCallback((): void => {
    setItems([]);
    setScrollTop(0);
  }, []);

  const scrollToBottom = useCallback((): void => {
    const maxScroll = Math.max(0, contentHeight - containerHeight);
    setScrollTop(maxScroll);

    // Also scroll the actual DOM element if available
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = maxScroll;
    }
  }, [contentHeight, containerHeight]);

  const scrollToTop = useCallback((): void => {
    setScrollTop(0);

    // Also scroll the actual DOM element if available
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = 0;
    }
  }, []);

  // Store ref to scroll element for imperative scrolling
  const setScrollElement = useCallback((element: HTMLElement | null) => {
    scrollElementRef.current = element;
  }, []);

  return {
    // Public API
    addItem,
    clear,
    scrollToBottom,
    scrollToTop,
    visibleItems,
    totalItems,

    // Internal API (clearly marked)
    __internal: {
      scrollTop,
      setScrollTop,
      containerHeight,
      setContainerHeight,
      contentHeight,
      visibleRange,
      setScrollElement,
    },
  };
}

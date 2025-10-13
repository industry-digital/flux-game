export type VirtualizationConfig = {
  itemHeight?: number | ((index: number) => number);
  overscan?: number;
  viewportHeight?: number;
  scrollBehavior?: 'smooth' | 'auto';
};

export type ListVirtualizationHook<T> = {
  // Core operations
  addItem: (item: T) => void;
  clear: () => void;
  scrollToBottom: () => void;
  scrollToTop: () => void;

  // Read-only state
  readonly visibleItems: T[];
  readonly totalItems: number;

  // Component integration (internal use)
  readonly __internal: {
    scrollTop: number;
    setScrollTop: (scrollTop: number) => void;
    containerHeight: number;
    setContainerHeight: (height: number) => void;
    contentHeight: number;
    visibleRange: { start: number; end: number };
    setScrollElement: (element: HTMLElement | null) => void;
    // TanStack Virtual specific properties
    virtualizer?: any;
    parentRef?: any;
  };
};

// Hook function signature for dependency injection
export type UseVirtualizedList = <T>(
  items: T[],
  config?: VirtualizationConfig
) => ListVirtualizationHook<T>;

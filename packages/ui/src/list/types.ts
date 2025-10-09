export type VirtualizationConfig = {
  itemHeight?: number | ((index: number) => number);
  overscan?: number;
  viewportHeight?: number;
  scrollBehavior?: 'smooth' | 'auto';
};

export interface VirtualizationAPI<T> {
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
  };
}

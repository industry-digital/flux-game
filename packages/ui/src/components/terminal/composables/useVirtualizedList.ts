import { ref, computed, nextTick, type Ref, type ComputedRef } from 'vue';

export type VirtualizationConfig = {
  itemHeight?: number | ((index: number) => number);
  overscan?: number;
  viewportHeight?: number;
  scrollBehavior?: 'smooth' | 'auto';
};

export interface VirtualizationAPI<T> {
  addItem: (item: T) => void;
  clear: () => void;
  visibleItems: ComputedRef<T[]>;
  totalItems: ComputedRef<number>;
  scrollToBottom: () => void;
  scrollToTop: () => void;

  // Internal state for component integration
  scrollTop: Ref<number>;
  containerHeight: Ref<number>;
  contentHeight: ComputedRef<number>;
  visibleRange: ComputedRef<{ start: number; end: number }>;
}

const DEFAULT_CONFIG: Required<VirtualizationConfig> = {
  itemHeight: 24,
  overscan: 5,
  viewportHeight: 400,
  scrollBehavior: 'smooth',
};

/**
 * Generic virtualized list composable with overscan support
 *
 * Provides efficient rendering of large lists by only rendering visible items
 * plus an overscan buffer for smooth scrolling.
 */
export function useVirtualizedList<T>(
  initialItems: T[],
  config: VirtualizationConfig = {}
): VirtualizationAPI<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Reactive state
  const items = ref<T[]>([...initialItems]);
  const scrollTop = ref(0);
  const containerHeight = ref(mergedConfig.viewportHeight);

  // Computed properties
  const totalItems = computed(() => items.value.length);

  const contentHeight = computed(() => {
    if (typeof mergedConfig.itemHeight === 'number') {
      return items.value.length * mergedConfig.itemHeight;
    }

    // Dynamic height calculation
    let height = 0;
    for (let i = 0; i < items.value.length; i++) {
      height += mergedConfig.itemHeight(i);
    }
    return height;
  });

  const visibleRange = computed(() => {
    const itemHeight = mergedConfig.itemHeight;
    const viewport = containerHeight.value;
    const scroll = scrollTop.value;

    if (typeof itemHeight === 'number') {
      // Fixed height calculation
      const startIndex = Math.floor(scroll / itemHeight);
      const endIndex = Math.min(
        items.value.length - 1,
        Math.ceil((scroll + viewport) / itemHeight)
      );

      return {
        start: Math.max(0, startIndex),
        end: Math.max(0, endIndex)
      };
    } else {
      // Dynamic height calculation
      let currentHeight = 0;
      let startIndex = 0;
      let endIndex = 0;

      // Find start index
      for (let i = 0; i < items.value.length; i++) {
        const height = itemHeight(i);
        if (currentHeight + height > scroll) {
          startIndex = i;
          break;
        }
        currentHeight += height;
      }

      // Find end index
      const targetHeight = scroll + viewport;
      for (let i = startIndex; i < items.value.length; i++) {
        currentHeight += itemHeight(i);
        if (currentHeight >= targetHeight) {
          endIndex = i;
          break;
        }
      }

      return {
        start: Math.max(0, startIndex),
        end: Math.min(items.value.length - 1, Math.max(0, endIndex))
      };
    }
  });

  const visibleItems = computed((): T[] => {
    const { start, end } = visibleRange.value;
    const overscan = mergedConfig.overscan;

    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(items.value.length - 1, end + overscan);

    return (items.value as T[]).slice(startWithOverscan, endWithOverscan + 1);
  });

  // Methods
  const addItem = (item: T): void => {
    (items.value as T[]).push(item);
  };

  const clear = (): void => {
    items.value = [];
    scrollTop.value = 0;
  };

  const scrollToBottom = async (): Promise<void> => {
    await nextTick();
    const maxScroll = Math.max(0, contentHeight.value - containerHeight.value);
    scrollTop.value = maxScroll;
  };

  const scrollToTop = async (): Promise<void> => {
    await nextTick();
    scrollTop.value = 0;
  };

  return {
    // Public API
    addItem,
    clear,
    visibleItems,
    totalItems,
    scrollToBottom,
    scrollToTop,

    // Internal state for component integration
    scrollTop,
    containerHeight,
    contentHeight,
    visibleRange,
  };
}

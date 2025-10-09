import { describe, it, expect, beforeEach } from 'vitest';
import { useVirtualizedList } from './useVirtualizedList';
import type { VirtualizationConfig } from './useVirtualizedList';

interface TestItem {
  id: string;
  content: string;
  height?: number;
}

describe('useVirtualizedList', () => {
  let virtualization: ReturnType<typeof useVirtualizedList<TestItem>>;

  beforeEach(() => {
    virtualization = useVirtualizedList<TestItem>([], {
      itemHeight: 24,
      overscan: 2,
      viewportHeight: 200,
    });
  });

  describe('initialization', () => {
    it('should initialize with empty items', () => {
      expect(virtualization.totalItems.value).toBe(0);
      expect(virtualization.visibleItems.value).toEqual([]);
    });

    it('should initialize with provided items', () => {
      const initialItems = [
        { id: '1', content: 'Item 1' },
        { id: '2', content: 'Item 2' },
      ];

      const virt = useVirtualizedList(initialItems);
      expect(virt.totalItems.value).toBe(2);
    });

    it('should apply default configuration', () => {
      const virt = useVirtualizedList<TestItem>([]);

      // Should not throw and should have reasonable defaults
      expect(virt.totalItems.value).toBe(0);
      expect(virt.contentHeight.value).toBe(0);
    });
  });

  describe('addItem', () => {
    it('should add items to the list', () => {
      const item1 = { id: '1', content: 'First item' };
      const item2 = { id: '2', content: 'Second item' };

      virtualization.addItem(item1);
      expect(virtualization.totalItems.value).toBe(1);

      virtualization.addItem(item2);
      expect(virtualization.totalItems.value).toBe(2);
    });

    it('should update content height when adding items', () => {
      const item = { id: '1', content: 'Test item' };

      expect(virtualization.contentHeight.value).toBe(0);

      virtualization.addItem(item);
      expect(virtualization.contentHeight.value).toBe(24); // itemHeight * 1

      virtualization.addItem({ id: '2', content: 'Second item' });
      expect(virtualization.contentHeight.value).toBe(48); // itemHeight * 2
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      virtualization.addItem({ id: '1', content: 'Item 1' });
      virtualization.addItem({ id: '2', content: 'Item 2' });

      expect(virtualization.totalItems.value).toBe(2);

      virtualization.clear();

      expect(virtualization.totalItems.value).toBe(0);
      expect(virtualization.visibleItems.value).toEqual([]);
      expect(virtualization.scrollTop.value).toBe(0);
    });
  });

  describe('scrolling', () => {
    beforeEach(() => {
      // Add enough items to enable scrolling
      for (let i = 1; i <= 20; i++) {
        virtualization.addItem({ id: i.toString(), content: `Item ${i}` });
      }
    });

    it('should scroll to bottom', async () => {
      await virtualization.scrollToBottom();

      const maxScroll = Math.max(0, virtualization.contentHeight.value - virtualization.containerHeight.value);
      expect(virtualization.scrollTop.value).toBe(maxScroll);
    });

    it('should scroll to top', async () => {
      virtualization.scrollTop.value = 100; // Set some scroll position

      await virtualization.scrollToTop();

      expect(virtualization.scrollTop.value).toBe(0);
    });
  });

  describe('virtualization with fixed height', () => {
    beforeEach(() => {
      // Add items for testing virtualization
      for (let i = 1; i <= 50; i++) {
        virtualization.addItem({ id: i.toString(), content: `Item ${i}` });
      }
    });

    it('should calculate visible range correctly', () => {
      // With itemHeight=24, viewportHeight=200, we should see ~8-9 items
      virtualization.scrollTop.value = 0;
      virtualization.containerHeight.value = 200;

      const range = virtualization.visibleRange.value;
      expect(range.start).toBe(0);
      expect(range.end).toBeGreaterThanOrEqual(7); // At least 8 items visible
    });

    it('should include overscan items', () => {
      virtualization.scrollTop.value = 0;
      virtualization.containerHeight.value = 200;

      const visibleItems = virtualization.visibleItems.value;
      const range = virtualization.visibleRange.value;

      // Should include overscan (2 items) beyond visible range
      expect(visibleItems.length).toBeGreaterThan(range.end - range.start + 1);
    });

    it('should update visible range when scrolling', () => {
      // Initial position
      virtualization.scrollTop.value = 0;
      const initialRange = virtualization.visibleRange.value;

      // Scroll down
      virtualization.scrollTop.value = 240; // 10 items down
      const scrolledRange = virtualization.visibleRange.value;

      expect(scrolledRange.start).toBeGreaterThan(initialRange.start);
      expect(scrolledRange.end).toBeGreaterThan(initialRange.end);
    });
  });

  describe('virtualization with dynamic height', () => {
    let dynamicVirtualization: ReturnType<typeof useVirtualizedList<TestItem>>;

    beforeEach(() => {
      const config: VirtualizationConfig = {
        itemHeight: (index: number) => index % 2 === 0 ? 24 : 48, // Alternating heights
        overscan: 2,
        viewportHeight: 200,
      };

      dynamicVirtualization = useVirtualizedList<TestItem>([], config);

      // Add test items
      for (let i = 1; i <= 20; i++) {
        dynamicVirtualization.addItem({ id: i.toString(), content: `Item ${i}` });
      }
    });

    it('should calculate content height with dynamic heights', () => {
      // 10 items with height 24 + 10 items with height 48 = 720
      const expectedHeight = (10 * 24) + (10 * 48);
      expect(dynamicVirtualization.contentHeight.value).toBe(expectedHeight);
    });

    it('should calculate visible range with dynamic heights', () => {
      dynamicVirtualization.scrollTop.value = 0;
      dynamicVirtualization.containerHeight.value = 200;

      const range = dynamicVirtualization.visibleRange.value;
      expect(range.start).toBe(0);
      expect(range.end).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty list gracefully', () => {
      expect(virtualization.visibleItems.value).toEqual([]);
      expect(virtualization.contentHeight.value).toBe(0);
      expect(virtualization.visibleRange.value).toEqual({ start: 0, end: 0 });
    });

    it('should handle single item', () => {
      virtualization.addItem({ id: '1', content: 'Only item' });

      expect(virtualization.totalItems.value).toBe(1);
      expect(virtualization.contentHeight.value).toBe(24);
      expect(virtualization.visibleItems.value).toHaveLength(1);
    });

    it('should handle viewport larger than content', () => {
      // Add only 2 items (48px total) with 200px viewport
      virtualization.addItem({ id: '1', content: 'Item 1' });
      virtualization.addItem({ id: '2', content: 'Item 2' });

      virtualization.containerHeight.value = 200;

      const visibleItems = virtualization.visibleItems.value;
      expect(visibleItems).toHaveLength(2); // All items should be visible
    });

    it('should handle zero viewport height', () => {
      virtualization.containerHeight.value = 0;
      virtualization.addItem({ id: '1', content: 'Item 1' });

      // Should not crash
      expect(virtualization.visibleRange.value.start).toBe(0);
    });

    it('should handle negative scroll position', () => {
      virtualization.addItem({ id: '1', content: 'Item 1' });
      virtualization.scrollTop.value = -10;

      const range = virtualization.visibleRange.value;
      expect(range.start).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance considerations', () => {
    it('should not recalculate visible items unnecessarily', () => {
      // Add items
      for (let i = 1; i <= 100; i++) {
        virtualization.addItem({ id: i.toString(), content: `Item ${i}` });
      }

      const firstCalculation = virtualization.visibleItems.value;
      const secondCalculation = virtualization.visibleItems.value;

      // Should return the same reference (computed caching)
      expect(firstCalculation).toBe(secondCalculation);
    });

    it('should handle large datasets efficiently', () => {
      // Add a large number of items
      const itemCount = 10000;
      for (let i = 1; i <= itemCount; i++) {
        virtualization.addItem({ id: i.toString(), content: `Item ${i}` });
      }

      expect(virtualization.totalItems.value).toBe(itemCount);

      // Visible items should still be manageable
      virtualization.scrollTop.value = 5000 * 24; // Scroll to middle
      const visibleItems = virtualization.visibleItems.value;

      expect(visibleItems.length).toBeLessThan(50); // Should be much less than total
    });
  });
});


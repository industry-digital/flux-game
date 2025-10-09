import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed, h } from 'vue';
import { useTerminal } from './useTerminal';
import type { VirtualizationAPI } from './useVirtualizedList';
import type { TerminalEntry, TerminalConfig, TerminalDependencies } from './useTerminal';
import { useTheme } from '../../../infrastructure/theme';

// Mock theme with proper typing
const mockTheme = {
  currentTheme: ref('dark' as const),
  setTheme: vi.fn(),
  getThemeConfig: vi.fn(),
  availableThemes: ['dark', 'light'] as const,
} as ReturnType<typeof useTheme>;

// Mock virtualization with proper computed refs
const createMockVirtualization = (): VirtualizationAPI<TerminalEntry> => ({
  addItem: vi.fn(),
  clear: vi.fn(),
  visibleItems: computed(() => []),
  totalItems: computed(() => 0),
  scrollToBottom: vi.fn(),
  scrollToTop: vi.fn(),
  scrollTop: ref(0),
  containerHeight: ref(400),
  contentHeight: computed(() => 0),
  visibleRange: computed(() => ({ start: 0, end: 0 })),
})

describe('useTerminal', () => {
  let virtualization: VirtualizationAPI<TerminalEntry>;
  let terminal: ReturnType<typeof useTerminal>;
  let mockTimestamp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    virtualization = createMockVirtualization();
    mockTimestamp = vi.fn(() => 1234567890000); // Fixed timestamp for testing

    // Reset theme state
    mockTheme.currentTheme.value = 'dark' as any;

    const deps: TerminalDependencies = {
      timestamp: mockTimestamp,
    };

    terminal = useTerminal({}, virtualization, mockTheme, deps);
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(terminal).toBeDefined();
      expect(typeof terminal.print).toBe('function');
      expect(typeof terminal.render).toBe('function');
      expect(typeof terminal.clear).toBe('function');
    });

    it('should merge provided configuration with defaults', () => {
      const config: TerminalConfig = {
        autoScroll: false,
        showTimestamps: true,
        maxEntries: 5000,
      };

      const customTerminal = useTerminal(config, virtualization, mockTheme);

      // Test that config affects behavior (through terminalClasses)
      const classes = customTerminal.terminalClasses.value;
      expect(classes[0]).toBe('terminal');
      expect(classes[1]).toBe('terminal--dark');
      expect(classes[2]).toEqual({
        'terminal--auto-scroll': false,
        'terminal--show-timestamps': true,
      });
    });

    it('should generate correct terminal classes', () => {
      const classes = terminal.terminalClasses.value;

      expect(classes[0]).toBe('terminal');
      expect(classes[1]).toBe('terminal--dark');
      expect(classes[2]).toEqual({
        'terminal--auto-scroll': true,
        'terminal--show-timestamps': false,
      });
    });

    it('should update classes when theme changes', () => {
      mockTheme.currentTheme.value = 'light';

      const classes = terminal.terminalClasses.value;
      expect(classes[0]).toBe('terminal');
      expect(classes[1]).toBe('terminal--light');
    });
  });

  describe('print method', () => {
    it('should add text entry to virtualization', () => {
      terminal.print('test-id', 'Hello, world!');

      expect(virtualization.addItem).toHaveBeenCalledWith({
        id: 'test-id',
        type: 'text',
        content: 'Hello, world!',
        timestamp: 1234567890000,
        height: 24,
      });
    });

    it('should call scrollToBottom when autoScroll is enabled', () => {
      terminal.print('test-id', 'Test message');

      expect(virtualization.scrollToBottom).toHaveBeenCalled();
    });

    it('should not call scrollToBottom when autoScroll is disabled', () => {
      const config: TerminalConfig = { autoScroll: false };
      const noScrollTerminal = useTerminal(config, virtualization, mockTheme);

      noScrollTerminal.print('test-id', 'Test message');

      expect(virtualization.scrollToBottom).not.toHaveBeenCalled();
    });

    it('should use custom timestamp from dependencies', () => {
      const customTimestamp = vi.fn(() => 9999999999999);
      const deps: TerminalDependencies = { timestamp: customTimestamp };

      const customTerminal = useTerminal({}, virtualization, mockTheme, deps);
      customTerminal.print('test-id', 'Test');

      expect(virtualization.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: 9999999999999,
        })
      );
    });
  });

  describe('render method', () => {
    it('should add element entry to virtualization', () => {
      const testComponent = h('div', 'Test Component');

      terminal.render('component-id', testComponent);

      expect(virtualization.addItem).toHaveBeenCalledWith({
        id: 'component-id',
        type: 'element',
        content: testComponent,
        timestamp: 1234567890000,
        // Note: no height property for elements
      });
    });

    it('should call scrollToBottom when autoScroll is enabled', () => {
      const testComponent = h('div', 'Test');

      terminal.render('test-id', testComponent);

      expect(virtualization.scrollToBottom).toHaveBeenCalled();
    });

    it('should not call scrollToBottom when autoScroll is disabled', () => {
      const config: TerminalConfig = { autoScroll: false };
      const noScrollTerminal = useTerminal(config, virtualization, mockTheme);
      const testComponent = h('div', 'Test');

      noScrollTerminal.render('test-id', testComponent);

      expect(virtualization.scrollToBottom).not.toHaveBeenCalled();
    });
  });

  describe('clear method', () => {
    it('should delegate to virtualization clear', () => {
      terminal.clear();

      expect(virtualization.clear).toHaveBeenCalled();
    });
  });

  describe('scroll control', () => {
    it('should expose scrollToBottom from virtualization', () => {
      terminal.scrollToBottom();

      expect(virtualization.scrollToBottom).toHaveBeenCalled();
    });

    it('should expose scrollToTop from virtualization', () => {
      terminal.scrollToTop();

      expect(virtualization.scrollToTop).toHaveBeenCalled();
    });
  });

  describe('state access', () => {
    it('should expose visibleEntries from virtualization', () => {
      expect(terminal.visibleEntries).toBe(virtualization.visibleItems);
    });

    it('should expose totalEntries from virtualization', () => {
      expect(terminal.totalEntries).toBe(virtualization.totalItems);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string text', () => {
      terminal.print('empty-id', '');

      expect(virtualization.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '',
          type: 'text',
        })
      );
    });

    it('should handle special characters in text', () => {
      const specialText = 'Hello\nWorld\t🚀';
      terminal.print('special-id', specialText);

      expect(virtualization.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          content: specialText,
        })
      );
    });

    it('should handle null/undefined component gracefully', () => {
      // This would be a TypeScript error, but test runtime behavior
      terminal.render('null-id', null as any);

      expect(virtualization.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          content: null,
          type: 'element',
        })
      );
    });
  });

  describe('configuration variations', () => {
    it('should handle all configuration options', () => {
      const fullConfig: TerminalConfig = {
        maxEntries: 1000,
        autoScroll: false,
        showTimestamps: true,
      };

      const configuredTerminal = useTerminal(fullConfig, virtualization, mockTheme);
      const classes = configuredTerminal.terminalClasses.value;

      expect(classes[0]).toBe('terminal');
      expect(classes[1]).toBe('terminal--dark');
      expect(classes[2]).toEqual({
        'terminal--auto-scroll': false,
        'terminal--show-timestamps': true,
      });
    });

    it('should handle partial configuration', () => {
      const partialConfig: TerminalConfig = {
        showTimestamps: true,
      };

      const partialTerminal = useTerminal(partialConfig, virtualization, mockTheme);

      // Should still work with defaults for other options
      partialTerminal.print('test', 'message');
      expect(virtualization.scrollToBottom).toHaveBeenCalled(); // autoScroll default is true
    });
  });

  describe('integration with virtualization', () => {
    it('should properly integrate with virtualization lifecycle', () => {
      // Add multiple entries
      terminal.print('1', 'First message');
      terminal.render('2', h('div', 'Component'));
      terminal.print('3', 'Third message');

      // Should have called addItem for each
      expect(virtualization.addItem).toHaveBeenCalledTimes(3);

      // Should have called scrollToBottom for each (autoScroll enabled)
      expect(virtualization.scrollToBottom).toHaveBeenCalledTimes(3);
    });

    it('should maintain entry order', () => {
      const calls = vi.mocked(virtualization.addItem).mock.calls;

      terminal.print('first', 'First');
      terminal.print('second', 'Second');

      expect(calls[0][0].id).toBe('first');
      expect(calls[1][0].id).toBe('second');
    });
  });
});

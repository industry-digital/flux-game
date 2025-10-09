import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';
import { ThemeName } from './types';

describe('useTheme', () => {
  let mockDocumentElement: {
    style: {
      setProperty: ReturnType<typeof vi.fn>;
    };
    setAttribute: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDocumentElement = {
      style: {
        setProperty: vi.fn(),
      },
      setAttribute: vi.fn(),
    };
  });

  const createMockDeps = () => ({
    documentRootResolver: () => mockDocumentElement as any,
  });

  describe('initialization', () => {
    it('should initialize with default theme', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      expect(result.current.currentTheme).toBe('dark');
      expect(result.current.availableThemes).toEqual(['dark', 'light', 'accessibility']);
    });

    it('should initialize with custom theme', () => {
      const { result } = renderHook(() => useTheme('light', createMockDeps()));

      expect(result.current.currentTheme).toBe('light');
    });

    it('should apply theme CSS properties on mount', () => {
      renderHook(() => useTheme('dark', createMockDeps()));

      // Verify CSS custom properties are set (don't care about specific values)
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-background', expect.any(String));
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-surface', expect.any(String));
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text', expect.any(String));
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--theme-name', 'dark');
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('theme switching', () => {
    it('should change theme when setTheme is called', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.currentTheme).toBe('light');
    });

    it('should apply new theme CSS properties when theme changes', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      // Clear previous calls
      vi.clearAllMocks();

      act(() => {
        result.current.setTheme('light');
      });

      // Should apply light theme properties
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--theme-name', 'light');
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      // Verify that color properties were set (don't care about specific values)
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-background', expect.any(String));
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text', expect.any(String));
    });

    it('should ignore invalid theme names', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      act(() => {
        result.current.setTheme('invalid-theme' as ThemeName);
      });

      // Should remain on dark theme
      expect(result.current.currentTheme).toBe('dark');
    });
  });

  describe('theme configuration', () => {
    it('should return current theme config', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      const config = result.current.getThemeConfig();

      expect(config.name).toBe('dark');
      expect(config.colors).toHaveProperty('background');
      expect(config.colors).toHaveProperty('surface');
      expect(config.colors).toHaveProperty('text');
      expect(typeof config.colors.background).toBe('string');
    });

    it('should return updated config when theme changes', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      act(() => {
        result.current.setTheme('light');
      });

      const config = result.current.getThemeConfig();
      // Now that we have a proper light theme, it should return 'light'
      expect(config.name).toBe('light');
      expect(config.colors).toBeDefined();
      expect(typeof config.colors.background).toBe('string');
    });
  });

  describe('available themes', () => {
    it('should provide list of available themes', () => {
      const { result } = renderHook(() => useTheme('dark', createMockDeps()));

      expect(result.current.availableThemes).toEqual(['dark', 'light', 'accessibility']);
    });

    it('should have consistent available themes across instances', () => {
      const { result: result1 } = renderHook(() => useTheme('dark', createMockDeps()));
      const { result: result2 } = renderHook(() => useTheme('light', createMockDeps()));

      expect(result1.current.availableThemes).toEqual(result2.current.availableThemes);
    });
  });

  describe('CSS variable conversion', () => {
    it('should convert camelCase color names to kebab-case CSS variables', () => {
      renderHook(() => useTheme('dark', createMockDeps()));

      // Check that camelCase properties are converted correctly
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text-secondary', '#a89984');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text-on-primary', '#1d2021');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-text-on-surface', '#d4be98');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-border-focus', '#a9b665');
    });
  });

  describe('memoization', () => {
    it('should return stable references when theme does not change', () => {
      const { result, rerender } = renderHook(() => useTheme('dark', createMockDeps()));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult.setTheme).toBe(secondResult.setTheme);
      expect(firstResult.getThemeConfig).toBe(secondResult.getThemeConfig);
      expect(firstResult.availableThemes).toBe(secondResult.availableThemes);
    });
  });
});

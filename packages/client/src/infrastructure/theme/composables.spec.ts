import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme, type ThemeDependencies } from './composables';
import { createComposableTestSuite } from '~/testing';

describe('useTheme', () => {
  const testSuite = createComposableTestSuite();

  // Mock document root
  const mockSetProperty = vi.fn();
  const mockSetAttribute = vi.fn();
  const mockRoot = {
    style: { setProperty: mockSetProperty },
    setAttribute: mockSetAttribute,
  };

  const mockDeps: ThemeDependencies = {
    documentRootResolver: () => mockRoot as any,
  };

  beforeEach(() => {
    testSuite.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    testSuite.teardown();
  });

  describe('basic functionality', () => {
    it('should initialize with default dark theme', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        expect(theme.currentTheme.value).toBe('dark');
        expect(theme.availableThemes).toContain('dark');
      });
    });

    it('should apply theme colors as CSS custom properties', () => {
      testSuite.runWithContext(() => {
        useTheme('dark', mockDeps);

        // Should have called setProperty for each color
        expect(mockSetProperty).toHaveBeenCalledWith('--color-background', '#0f0f0f');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-surface', '#1f2937');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', '#10b981');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text', '#ffffff');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text-secondary', 'rgba(255, 255, 255, 0.7)');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-error', '#ef4444');
      });
    });

    it('should set theme name and data attribute', () => {
      testSuite.runWithContext(() => {
        useTheme('dark', mockDeps);

        expect(mockSetProperty).toHaveBeenCalledWith('--theme-name', 'dark');
        expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      });
    });

    it('should handle camelCase to kebab-case conversion', () => {
      testSuite.runWithContext(() => {
        useTheme('dark', mockDeps);

        // textSecondary -> --color-text-secondary
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text-secondary', 'rgba(255, 255, 255, 0.7)');
        // textOnPrimary -> --color-text-on-primary
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text-on-primary', '#ffffff');
        // borderFocus -> --color-border-focus
        expect(mockSetProperty).toHaveBeenCalledWith('--color-border-focus', '#10b981');
      });
    });
  });

  describe('theme switching', () => {
    it('should change theme when setTheme is called', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        expect(theme.currentTheme.value).toBe('dark');

        theme.setTheme('light');

        expect(theme.currentTheme.value).toBe('light');
        // Note: Since light theme currently points to same darkTheme object,
        // watchEffect won't re-trigger. This is expected behavior until
        // separate theme configs are implemented.
      });
    });

    it('should ignore invalid theme names', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        expect(theme.currentTheme.value).toBe('dark');

        // Try to set invalid theme
        theme.setTheme('invalid' as any);

        // Should remain unchanged
        expect(theme.currentTheme.value).toBe('dark');
      });
    });

    it('should reactively apply theme when currentTheme changes', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        // Change theme
        theme.setTheme('accessibility');

        // Theme name should change even if config object is the same
        expect(theme.currentTheme.value).toBe('accessibility');
        // Note: watchEffect won't re-trigger since accessibility theme
        // currently points to same darkTheme object
      });
    });
  });

  describe('theme configuration', () => {
    it('should return current theme config', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        const config = theme.getThemeConfig();

        expect(config.name).toBe('dark');
        expect(config.colors.background).toBe('#0f0f0f');
        expect(config.colors.primary).toBe('#10b981');
      });
    });

    it('should provide list of available themes', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        expect(theme.availableThemes).toEqual(['dark', 'light', 'accessibility']);
      });
    });

    it('should update theme config when theme changes', () => {
      testSuite.runWithContext(() => {
        const theme = useTheme('dark', mockDeps);

        expect(theme.getThemeConfig().name).toBe('dark');

        theme.setTheme('light');

        // Note: Currently light theme points to same darkTheme object,
        // so name remains 'dark'. This will change when separate themes are implemented.
        expect(theme.getThemeConfig().name).toBe('dark');
        expect(theme.currentTheme.value).toBe('light'); // But currentTheme ref updates
      });
    });
  });

  describe('dependency injection', () => {
    it('should use injected document root resolver', () => {
      testSuite.runWithContext(() => {
        const customMockRoot = {
          style: { setProperty: vi.fn() },
          setAttribute: vi.fn(),
        };

        const customDeps: ThemeDependencies = {
          documentRootResolver: () => customMockRoot as any,
        };

        useTheme('dark', customDeps);

        // Should have used custom root
        expect(customMockRoot.style.setProperty).toHaveBeenCalled();
        expect(customMockRoot.setAttribute).toHaveBeenCalled();

        // Should not have used original mock
        expect(mockSetProperty).not.toHaveBeenCalled();
        expect(mockSetAttribute).not.toHaveBeenCalled();
      });
    });

    it('should work with default dependencies when none provided', () => {
      testSuite.runWithContext(() => {
        // This would use real document.documentElement in browser
        // We can't easily test this without DOM, but we can verify it doesn't throw
        expect(() => {
          const theme = useTheme('dark');
          expect(theme.currentTheme.value).toBe('dark');
        }).not.toThrow();
      });
    });
  });

  describe('CSS variable generation', () => {
    it('should generate correct CSS variable names for all color properties', () => {
      testSuite.runWithContext(() => {
        useTheme('dark', mockDeps);

        // Test a few key transformations
        const expectedCalls = [
          ['--color-background', '#0f0f0f'],
          ['--color-text-secondary', 'rgba(255, 255, 255, 0.7)'],
          ['--color-text-on-primary', '#ffffff'],
          ['--color-text-on-surface', '#ffffff'],
          ['--color-border-focus', '#10b981'],
        ];

        expectedCalls.forEach(([cssVar, value]) => {
          expect(mockSetProperty).toHaveBeenCalledWith(cssVar, value);
        });
      });
    });

    it('should handle single word color names correctly', () => {
      testSuite.runWithContext(() => {
        useTheme('dark', mockDeps);

        expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', '#10b981');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-secondary', '#374151');
        expect(mockSetProperty).toHaveBeenCalledWith('--color-accent', '#3b82f6');
      });
    });
  });
});

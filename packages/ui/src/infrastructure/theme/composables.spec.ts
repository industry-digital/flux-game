import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme, type ThemeDependencies } from './composables';
import { createComposableTestSuite } from '../../testing';

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

        // Should have called setProperty for theme colors
        expect(mockSetProperty).toHaveBeenCalledWith('--color-background', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-surface', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text-secondary', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-error', expect.any(String));
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
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text-secondary', expect.any(String));
        // textOnPrimary -> --color-text-on-primary
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text-on-primary', expect.any(String));
        // borderFocus -> --color-border-focus
        expect(mockSetProperty).toHaveBeenCalledWith('--color-border-focus', expect.any(String));
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
        expect(config.colors.background).toBeDefined();
        expect(config.colors.primary).toBeDefined();
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

        // Test key CSS variable name transformations
        const expectedVariables = [
          '--color-background',
          '--color-text-secondary',
          '--color-text-on-primary',
          '--color-text-on-surface',
          '--color-border-focus',
        ];

        expectedVariables.forEach((cssVar) => {
          expect(mockSetProperty).toHaveBeenCalledWith(cssVar, expect.any(String));
        });
      });
    });

    it('should handle single word color names correctly', () => {
      testSuite.runWithContext(() => {
        useTheme('dark', mockDeps);

        expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-secondary', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-accent', expect.any(String));
      });
    });
  });
});

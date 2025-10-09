import { vi } from 'vitest';
import { ThemeHook, ThemeConfig, ThemeName } from './types';
import { darkTheme } from './themes/dark';

/**
 * Creates a mock theme hook for testing
 *
 * @param overrides - Partial overrides for the theme hook
 * @returns Mock theme hook with sensible defaults
 */
export function createMockTheme(overrides: Partial<ThemeHook> = {}): ThemeHook {
  return {
    currentTheme: 'dark',
    setTheme: vi.fn(),
    getThemeConfig: vi.fn(() => darkTheme),
    availableThemes: ['dark', 'light', 'accessibility'],
    ...overrides,
  };
}

/**
 * Creates a mock theme config for testing
 *
 * @param themeName - Name of the theme
 * @param colorOverrides - Partial color overrides
 * @returns Complete theme config with defaults
 */
export function createMockThemeConfig(
  themeName: ThemeName = 'dark',
  colorOverrides: Partial<ThemeConfig['colors']> = {}
): ThemeConfig {
  return {
    name: themeName,
    colors: {
      ...darkTheme.colors,
      ...colorOverrides,
    },
    typography: {
      ...darkTheme.typography,
    },
  };
}

/**
 * Creates a mock useTheme function for dependency injection
 *
 * @param mockTheme - The mock theme to return
 * @returns Mock useTheme function
 */
export function createMockUseTheme(mockTheme: ThemeHook) {
  return vi.fn(() => mockTheme);
}

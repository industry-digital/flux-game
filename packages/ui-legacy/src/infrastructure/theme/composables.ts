import { ref, watchEffect } from 'vue';
import type { ThemeColors, ThemeConfig, ThemeName } from './types';
import { darkTheme } from './themes/dark';

// Available themes registry
const themes: Record<ThemeName, ThemeConfig> = {
  dark: darkTheme,
  light: darkTheme, // TODO: implement light theme
  accessibility: darkTheme, // TODO: implement accessibility theme
};

const AVAILABLE_THEMES = Object.keys(themes) as ThemeName[];

const converColorNameToCssVar = (colorName: string) => {
  return `--color-${colorName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
};

export type ThemeDependencies = {
  documentRootResolver: () => typeof document.documentElement;
};

export const DEFAULT_THEME_DEPENDENCIES: ThemeDependencies = {
  documentRootResolver: () => document.documentElement,
};

/**
 * Theme composable for managing application theming
 *
 * Applies CSS custom properties to document root for consumption
 * by components using var(--color-*) syntax.
 */
export function useTheme(
  initialTheme: ThemeName = 'dark',
  deps: ThemeDependencies = DEFAULT_THEME_DEPENDENCIES,
) {
  const currentTheme = ref<ThemeName>(initialTheme);
  const root = deps.documentRootResolver();

  /**
   * Apply theme colors as CSS custom properties
   */
  const applyTheme = (themeConfig: ThemeConfig) => {

    // Zero-copy iteration approach
    for (const colorName in themeConfig.colors) {
      const colorValue = themeConfig.colors[colorName as keyof ThemeColors];
      const cssVar = converColorNameToCssVar(colorName);
      root.style.setProperty(cssVar, colorValue);
    }

    // Also set theme name for conditional styling
    root.style.setProperty('--theme-name', themeConfig.name);
    root.setAttribute('data-theme', themeConfig.name);
  };

  /**
   * Change current theme
   */
  const setTheme = (themeName: ThemeName) => {
    if (themes[themeName]) {
      currentTheme.value = themeName;
    }
  };

  /**
   * Get current theme config
   */
  const getThemeConfig = (): ThemeConfig => {
    return themes[currentTheme.value];
  };

  // Auto-apply theme when it changes
  watchEffect(() => {
    const themeConfig = themes[currentTheme.value];
    if (themeConfig) {
      applyTheme(themeConfig);
    }
  });

  return {
    currentTheme,
    setTheme,
    getThemeConfig,
    availableThemes: AVAILABLE_THEMES as ThemeName[],
  };
}

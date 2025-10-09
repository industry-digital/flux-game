import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ThemeColors, ThemeConfig, ThemeName, ThemeDependencies, ThemeHook } from './types';
import { darkTheme } from './themes/dark';
import { lightTheme } from './themes/light';

// Available themes registry
const themes: Record<ThemeName, ThemeConfig> = {
  dark: darkTheme,
  light: lightTheme,
  accessibility: darkTheme, // TODO: implement accessibility theme
};

const AVAILABLE_THEMES = Object.keys(themes) as ThemeName[];

const convertColorNameToCssVar = (colorName: string) => {
  return `--color-${colorName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
};

export const DEFAULT_THEME_DEPENDENCIES: ThemeDependencies = {
  documentRootResolver: () => document.documentElement,
};

export const DEFAULT_THEME: ThemeName = 'dark';

/**
 * Theme hook for managing application theming
 *
 * Applies CSS custom properties to document root for consumption
 * by components using var(--color-*) syntax.
 */
export function useTheme(
  initialTheme: ThemeName = DEFAULT_THEME,
  deps: ThemeDependencies = DEFAULT_THEME_DEPENDENCIES,
): ThemeHook {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialTheme);
  const root = useMemo(() => deps.documentRootResolver(), [deps]);

  /**
   * Apply theme colors as CSS custom properties
   */
  const applyTheme = useCallback((themeConfig: ThemeConfig) => {
    // Zero-copy iteration approach
    for (const colorName in themeConfig.colors) {
      const colorValue = themeConfig.colors[colorName as keyof ThemeColors];
      const cssVar = convertColorNameToCssVar(colorName);
      root.style.setProperty(cssVar, colorValue);
    }

    // Also set theme name for conditional styling
    root.style.setProperty('--theme-name', themeConfig.name);
    root.setAttribute('data-theme', themeConfig.name);
  }, [root]);

  /**
   * Change current theme
   */
  const setTheme = useCallback((themeName: ThemeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  }, []);

  /**
   * Get current theme config
   */
  const getThemeConfig = useCallback((): ThemeConfig => {
    return themes[currentTheme];
  }, [currentTheme]);

  // Auto-apply theme when it changes
  useEffect(() => {
    const themeConfig = themes[currentTheme];
    if (themeConfig) {
      applyTheme(themeConfig);
    }
  }, [currentTheme, applyTheme]);

  return useMemo(() => ({
    currentTheme,
    setTheme,
    getThemeConfig,
    availableThemes: AVAILABLE_THEMES as ThemeName[],
  }), [currentTheme, setTheme, getThemeConfig]);
}

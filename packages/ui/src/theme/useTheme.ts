import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ThemeColors, ThemeTypography, ThemeConfig, ThemeName, ThemeDependencies, ThemeHook } from './types';
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

const convertTypographyNameToCssVar = (typographyName: string) => {
  return `--${typographyName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
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
   * Apply theme colors and typography as CSS custom properties
   */
  const applyTheme = useCallback((themeConfig: ThemeConfig) => {
    // Apply colors - Zero-copy iteration approach
    for (const colorName in themeConfig.colors) {
      const colorValue = themeConfig.colors[colorName as keyof ThemeColors];
      const cssVar = convertColorNameToCssVar(colorName);
      root.style.setProperty(cssVar, colorValue);
    }

    // Apply typography
    for (const typographyName in themeConfig.typography) {
      const typographyValue = themeConfig.typography[typographyName as keyof ThemeTypography];
      const cssVar = convertTypographyNameToCssVar(typographyName);
      root.style.setProperty(cssVar, typographyValue);
    }

    // Apply global root styles to eliminate browser defaults
    root.style.setProperty('margin', '0');
    root.style.setProperty('padding', '0');
    root.style.setProperty('box-sizing', 'border-box');
    root.style.setProperty('width', '100%');
    root.style.setProperty('height', '100%');
    root.style.setProperty('background-color', themeConfig.colors.background);
    root.style.setProperty('color', themeConfig.colors.text);
    root.style.setProperty('font-family', themeConfig.typography.fontFamily);
    root.style.setProperty('font-size', themeConfig.typography.fontSizeBase);
    root.style.setProperty('line-height', themeConfig.typography.lineHeightNormal);

    // Also apply to body element to ensure full coverage
    const body = document.body;
    if (body) {
      body.style.margin = '0';
      body.style.padding = '0';
      body.style.boxSizing = 'border-box';
      body.style.width = '100%';
      body.style.height = '100%';
      body.style.backgroundColor = themeConfig.colors.background;
      body.style.color = themeConfig.colors.text;
      body.style.fontFamily = themeConfig.typography.fontFamily;
      body.style.fontSize = themeConfig.typography.fontSizeBase;
      body.style.lineHeight = themeConfig.typography.lineHeightNormal;
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

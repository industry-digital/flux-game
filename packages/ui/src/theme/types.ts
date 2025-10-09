export interface ThemeColors {
  // Base colors
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;

  // Text colors
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  textOnSurface: string;

  // State colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Interactive colors
  border: string;
  borderFocus: string;
  hover: string;
  active: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
}

export type ThemeName = 'dark' | 'light' | 'accessibility';


export type ThemeDependencies = {
  documentRootResolver: () => typeof document.documentElement;
};

export type ThemeHook = {
  currentTheme: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  getThemeConfig: () => ThemeConfig;
  availableThemes: ThemeName[];
};

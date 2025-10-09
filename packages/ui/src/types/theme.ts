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

export interface ThemeTypography {
  // Font families
  fontFamily: string;
  fontFamilyMono: string;
  fontFamilyHeading: string;

  // Font sizes
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;

  // Font weights
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightSemibold: string;
  fontWeightBold: string;

  // Line heights
  lineHeightTight: string;
  lineHeightNormal: string;
  lineHeightRelaxed: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
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

export type UseTheme = (
  initialTheme?: ThemeName,
  deps?: ThemeDependencies,
) => ThemeHook;

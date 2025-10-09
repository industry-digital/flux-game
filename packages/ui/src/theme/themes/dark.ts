import type { ThemeConfig } from '../types';

// Gruvbox Material Dark
export const darkTheme: ThemeConfig = {
  name: 'dark',
  colors: {
    // Base colors
    background: '#1d2021',
    surface: '#282828',
    primary: '#a9b665',
    secondary: '#3c3836',
    accent: '#7daea3',

    // Text colors
    text: '#d4be98',
    textSecondary: '#a89984',
    textOnPrimary: '#1d2021',
    textOnSurface: '#d4be98',

    // State colors
    success: '#a9b665',
    warning: '#d8a657',
    error: '#ea6962',
    info: '#7daea3',

    // Interactive colors
    border: '#504945',
    borderFocus: '#a9b665',
    hover: '#3c3836',
    active: '#504945',
  },
  typography: {
    // Font families
    fontFamily: '"Zilla Slab", Georgia, serif',
    fontFamilyMono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontFamilyHeading: '"Zilla Slab", Georgia, serif',

    // Font sizes
    fontSizeXs: '0.75rem',    // 12px
    fontSizeSm: '0.875rem',   // 14px
    fontSizeBase: '1rem',     // 16px
    fontSizeLg: '1.125rem',   // 18px
    fontSizeXl: '1.25rem',    // 20px
    fontSize2xl: '1.5rem',    // 24px
    fontSize3xl: '1.875rem',  // 30px

    // Font weights
    fontWeightNormal: '400',
    fontWeightMedium: '500',
    fontWeightSemibold: '600',
    fontWeightBold: '700',

    // Line heights
    lineHeightTight: '1.25',
    lineHeightNormal: '1.5',
    lineHeightRelaxed: '1.75',
  }
};

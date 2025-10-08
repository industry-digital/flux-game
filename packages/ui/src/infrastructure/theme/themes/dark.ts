import type { ThemeConfig } from '../types';

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
  }
};

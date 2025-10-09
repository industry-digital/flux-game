import type { ThemeConfig } from '../types';

export const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    // Base colors - Gruvbox Material Light
    background: '#fbf1c7',    // Light cream background
    surface: '#f2e5bc',       // Slightly darker cream for surfaces
    primary: '#79740e',       // Dark olive green
    secondary: '#d5c4a1',     // Light brown-gray
    accent: '#427b58',        // Teal green

    // Text colors
    text: '#3c3836',          // Dark brown for main text
    textSecondary: '#665c54', // Medium brown for secondary text
    textOnPrimary: '#fbf1c7', // Light text on primary
    textOnSurface: '#3c3836', // Dark text on surfaces

    // State colors
    success: '#79740e',       // Dark olive (same as primary)
    warning: '#b57614',       // Orange-brown
    error: '#cc241d',         // Red
    info: '#076678',          // Blue

    // Interactive colors
    border: '#d5c4a1',        // Light brown border
    borderFocus: '#79740e',   // Dark olive for focus
    hover: '#ebdbb2',         // Very light brown for hover
    active: '#d5c4a1',        // Light brown for active states
  }
};

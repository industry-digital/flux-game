import type { ThemeConfig } from '../types';

export const darkTheme: ThemeConfig = {
  name: 'dark',
  colors: {
    // Base colors
    background: '#0f0f0f',
    surface: '#1f2937',
    primary: '#10b981',
    secondary: '#374151',
    accent: '#3b82f6',

    // Text colors
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textOnPrimary: '#ffffff',
    textOnSurface: '#ffffff',

    // State colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Interactive colors
    border: '#4b5563',
    borderFocus: '#10b981',
    hover: '#4b5563',
    active: '#6b7280',
  }
};

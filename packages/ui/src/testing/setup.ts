// Vitest setup file for UI package tests
import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Override console.warn to suppress Vue warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');

  // Suppress specific Vue warnings that are expected in tests
  if (message.includes('[Vue warn]: Cannot unmount an app that is not mounted')) {
    return;
  }

  if (message.includes('[Vue warn]: onUnmounted is called when there is no active component instance')) {
    return;
  }

  // For all other warnings, use the original warn function
  originalWarn.apply(console, args);
};

// Also configure Vue's global warning handler as a backup
config.global.config.warnHandler = (msg: string) => {
  // Suppress test-specific warnings
  if (msg.includes('Cannot unmount an app that is not mounted')) {
    return;
  }

  if (msg.includes('onUnmounted is called when there is no active component instance')) {
    return;
  }

  // For other warnings, use console.warn (which will go through our override)
  console.warn(`[Vue warn]: ${msg}`);
};

// Mock browser APIs that might not be available in test environment
// Create proper storage mocks that return null (like real browser storage)
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn().mockReturnValue(null), // Real localStorage returns null for missing keys
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn().mockReturnValue(null), // Real sessionStorage returns null for missing keys
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock document.documentElement for theme tests
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      setProperty: vi.fn(),
    },
    setAttribute: vi.fn(),
  },
  writable: true,
});

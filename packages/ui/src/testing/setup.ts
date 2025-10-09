import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global test setup for React components
// Add any global mocks or setup here

// Mock browser APIs that might not be available in test environment
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    get length() { return 0; },
    key: vi.fn().mockReturnValue(null),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    get length() { return 0; },
    key: vi.fn().mockReturnValue(null),
  },
  writable: true,
});

// Mock window.addEventListener and removeEventListener for storage events
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

window.addEventListener = vi.fn(originalAddEventListener);
window.removeEventListener = vi.fn(originalRemoveEventListener);

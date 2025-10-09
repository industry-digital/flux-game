import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStorage, useLocalStorage, useSessionStorage, StorageDependencies } from './storage';
import { createComposableTestSuite } from '../../testing';
import { createMockLogger } from '../../testing/logging';
import { LoggerInterface } from '../logging/composables';

// Mock localStorage and sessionStorage
const createMockStorage = (): Storage => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null), // Return null for missing keys (like real storage)
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
};

describe('useStorage', () => {
  const testSuite = createComposableTestSuite();
  let mockStorage: Storage;
  let mockDeps: StorageDependencies;

  let mockLogger: LoggerInterface;
  beforeEach(() => {
    testSuite.setup();
    mockStorage = createMockStorage();
    mockLogger = createMockLogger();

    mockDeps = {
      storageResolver: () => mockStorage,
      windowResolver: () => window,
      log: mockLogger,
    };
  });

  afterEach(() => {
    testSuite.teardown();
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with initial value when storage is empty', () => {
      testSuite.runWithContext(() => {
        const [value] = useStorage('test-key', 'initial', mockDeps);
        expect(value.value).toBe('initial');
      });
    });

    it('should initialize with stored value when available', () => {
      mockStorage.setItem('test-key', JSON.stringify('stored-value'));

      testSuite.runWithContext(() => {
        const [value] = useStorage('test-key', 'initial', mockDeps);
        expect(value.value).toBe('stored-value');
      });
    });

    it('should persist changes to storage', async () => {
      testSuite.runWithContext(() => {
        const [, setValue] = useStorage('test-key', 'initial', mockDeps);

        setValue('new-value');

        // Vue's reactivity is synchronous for this case
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify('new-value')
        );
      });
    });

    it('should support functional updates', () => {
      testSuite.runWithContext(() => {
        const [value, setValue] = useStorage('test-key', 5, mockDeps);

        setValue(prev => prev + 10);

        expect(value.value).toBe(15);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(15)
        );
      });
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      mockStorage.setItem('test-key', 'invalid-json');

      testSuite.runWithContext(() => {
        const [value] = useStorage('test-key', 'fallback', mockDeps);
        expect(value.value).toBe('fallback');
      });
    });

    it('should handle storage setItem errors gracefully', () => {
      const mockStorageWithError = {
        ...mockStorage,
        setItem: vi.fn(() => {
          throw new Error('Storage quota exceeded');
        })
      };

      const depsWithErrorStorage = {
        ...mockDeps,
        storageResolver: () => mockStorageWithError
      };

      testSuite.runWithContext(() => {
        const [value, setValue] = useStorage('test-key', 'initial', depsWithErrorStorage);

        // Should not throw
        expect(() => setValue('new-value')).not.toThrow();

        // State should still update locally
        expect(value.value).toBe('new-value');
      });
    });
  });

  describe('complex data types', () => {
    it('should handle objects correctly', () => {
      const initialObject = { name: 'Alice', level: 5 };

      testSuite.runWithContext(() => {
        const [value, setValue] = useStorage('test-object', initialObject, mockDeps);

        const newObject = { name: 'Bob', level: 10 };
        setValue(newObject);

        expect(value.value).toEqual(newObject);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          'test-object',
          JSON.stringify(newObject)
        );
      });
    });

    it('should handle arrays correctly', () => {
      const initialArray = [1, 2, 3];

      testSuite.runWithContext(() => {
        const [value, setValue] = useStorage('test-array', initialArray, mockDeps);

        const newArray = [4, 5, 6];
        setValue(newArray);

        expect(value.value).toEqual(newArray);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          'test-array',
          JSON.stringify(newArray)
        );
      });
    });
  });

});

describe('useLocalStorage', () => {
  const testSuite = createComposableTestSuite();

  beforeEach(() => {
    testSuite.setup();
  });

  afterEach(() => {
    testSuite.teardown();
  });

  it('should use localStorage resolver by default', () => {
    testSuite.runWithContext(() => {
      const [value] = useLocalStorage('test-key', 'initial');
      expect(value.value).toBe('initial');
    });
  });
});

describe('useSessionStorage', () => {
  const testSuite = createComposableTestSuite();

  beforeEach(() => {
    testSuite.setup();
  });

  afterEach(() => {
    testSuite.teardown();
  });

  it('should use sessionStorage resolver by default', () => {
    testSuite.runWithContext(() => {
      const [value] = useSessionStorage('test-key', 'initial');
      expect(value.value).toBe('initial');
    });
  });
});

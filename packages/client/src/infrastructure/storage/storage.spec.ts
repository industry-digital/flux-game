import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStorage, useLocalStorage, useSessionStorage } from './storage';
import { createComposableTestSuite } from '~/testing';

// Mock localStorage and sessionStorage
const createMockStorage = (): Storage => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
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

  beforeEach(() => {
    testSuite.setup();
    mockStorage = createMockStorage();
  });

  afterEach(() => {
    testSuite.teardown();
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with initial value when storage is empty', () => {
      testSuite.runWithContext(() => {
        const [value] = useStorage('test-key', 'initial', () => mockStorage);
        expect(value.value).toBe('initial');
      });
    });

    it('should initialize with stored value when available', () => {
      mockStorage.setItem('test-key', JSON.stringify('stored-value'));

      testSuite.runWithContext(() => {
        const [value] = useStorage('test-key', 'initial', () => mockStorage);
        expect(value.value).toBe('stored-value');
      });
    });

    it('should persist changes to storage', async () => {
      testSuite.runWithContext(() => {
        const [, setValue] = useStorage('test-key', 'initial', () => mockStorage);

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
        const [value, setValue] = useStorage('test-key', 5, () => mockStorage);

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
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      testSuite.runWithContext(() => {
        const [value] = useStorage('test-key', 'fallback', () => mockStorage);
        expect(value.value).toBe('fallback');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse storage item'),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle storage setItem errors gracefully', () => {
      const mockStorageWithError = {
        ...mockStorage,
        setItem: vi.fn(() => {
          throw new Error('Storage quota exceeded');
        })
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      testSuite.runWithContext(() => {
        const [, setValue] = useStorage('test-key', 'initial', () => mockStorageWithError);

        setValue('new-value');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save to storage'),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('complex data types', () => {
    it('should handle objects correctly', () => {
      const initialObject = { name: 'Alice', level: 5 };

      testSuite.runWithContext(() => {
        const [value, setValue] = useStorage('test-object', initialObject, () => mockStorage);

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
        const [value, setValue] = useStorage('test-array', initialArray, () => mockStorage);

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

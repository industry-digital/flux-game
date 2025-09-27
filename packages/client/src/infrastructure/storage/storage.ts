import { ref, watch, onUnmounted, getCurrentInstance, type Ref } from 'vue';
import { useLogger } from '~/infrastructure/logging/composables';
import { LoggerInterface } from '~/types/infrastructure/logging';
import type { StorageResolver } from '~/types/infrastructure/storage';

export const LOCAL_STORAGE_RESOLVER: StorageResolver = () => localStorage;
export const SESSION_STORAGE_RESOLVER: StorageResolver = () => sessionStorage;

type WindowResolver = () => Window;
const WINDOW_RESOLVER: WindowResolver = () => window;

export type StorageDependencies = {
  storageResolver: StorageResolver;
  windowResolver: WindowResolver;
  log: LoggerInterface;
};

const LOCAL_STORAGE_DEPS: StorageDependencies = {
  storageResolver: LOCAL_STORAGE_RESOLVER,
  windowResolver: WINDOW_RESOLVER,
  log: useLogger(),
};

const SESSION_STORAGE_DEPS: StorageDependencies = {
  storageResolver: SESSION_STORAGE_RESOLVER,
  windowResolver: WINDOW_RESOLVER,
  log: useLogger(),
};

/**
 * Vue composable for reactive browser storage (localStorage/sessionStorage)
 *
 * This is a MUD client that never renders server-side, so no SSR safety needed.
 *
 * @param key - The storage key
 * @param initialValue - The initial value to use if key doesn't exist
 * @param storage - The storage object to use (localStorage or sessionStorage)
 * @param windowResolver - A function that returns the window object
 * @returns [reactive ref, setter function]
 */
export function useStorage<T>(
  key: string,
  initialValue: T,
  {
    storageResolver,
    windowResolver,
    log,
  }: StorageDependencies = LOCAL_STORAGE_DEPS,
): [Ref<T>, (value: T | ((prev: T) => T)) => void] {
  const storage = storageResolver();
  const storedValue = ref(initialValue) as Ref<T>;

  // Initialize from storage on creation
  try {
    const item = storage.getItem(key);
    if (item !== null) {
      storedValue.value = JSON.parse(item);
    }
  } catch (error) {
    log.warn(`Failed to parse storage item "${key}":`, error);
    // Keep initial value on parse error
  }

  // Watch for changes and persist to storage
  watch(
    storedValue,
    (newValue) => {
      try {
        storage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        log.error(`Failed to save to storage "${key}":`, error);
      }
    },
    { deep: true, flush: 'sync' }
  );

  // Listen for storage events from other tabs/windows
  const handleStorageChange = (event: StorageEvent) => {
    if (event.storageArea === storage && event.key === key) {
      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
        storedValue.value = newValue;
      } catch (error) {
        console.warn(`Failed to parse storage event for "${key}":`, error);
      }
    }
  };


  const window = windowResolver();
  window.addEventListener('storage', handleStorageChange);

  // Cleanup listener when component unmounts (only if in component context)
  if (getCurrentInstance()) {
    onUnmounted(() => {
      window.removeEventListener('storage', handleStorageChange);
    });
  }

  // Setter function that supports both direct values and updater functions
  const setValue = (value: T | ((prev: T) => T)) => {
    storedValue.value = typeof value === 'function'
      ? (value as (prev: T) => T)(storedValue.value)
      : value;
  };

  return [storedValue, setValue];
}

/**
 * Reactive localStorage hook
 *
 * @param key - The localStorage key
 * @param initialValue - The initial value to use if key doesn't exist
 * @returns [reactive ref, setter function]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  deps: StorageDependencies = LOCAL_STORAGE_DEPS,
) {
  return useStorage<T>(key, initialValue, deps);
}

/**
 * Reactive sessionStorage hook
 *
 * @param key - The sessionStorage key
 * @param initialValue - The initial value to use if key doesn't exist
 * @returns [reactive ref, setter function]
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  deps: StorageDependencies = SESSION_STORAGE_DEPS,
) {
  return useStorage<T>(key, initialValue, deps);
}

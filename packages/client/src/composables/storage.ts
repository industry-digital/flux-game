import { ref, watch, onUnmounted, getCurrentInstance, type Ref } from 'vue';
import type { StorageResolver } from '~/types/storage';

export const LOCAL_STORAGE_RESOLVER: StorageResolver = () => localStorage;
export const SESSION_STORAGE_RESOLVER: StorageResolver = () => sessionStorage;
/**
 * Vue composable for reactive browser storage (localStorage/sessionStorage)
 *
 * This is a MUD client that never renders server-side, so no SSR safety needed.
 *
 * @param key - The storage key
 * @param initialValue - The initial value to use if key doesn't exist
 * @param storage - The storage object to use (localStorage or sessionStorage)
 * @returns [reactive ref, setter function]
 */
export function useStorage<T>(
  key: string,
  initialValue: T,
  storageResolver: StorageResolver = LOCAL_STORAGE_RESOLVER,
): [Ref<T>, (value: T | ((prev: T) => T)) => void] {
  const storedValue = ref(initialValue) as Ref<T>;
  const storage = storageResolver();

  // Initialize from storage on creation
  try {
    const item = storage.getItem(key);
    if (item !== null) {
      storedValue.value = JSON.parse(item);
    }
  } catch (error) {
    console.warn(`Failed to parse storage item "${key}":`, error);
    // Keep initial value on parse error
  }

  // Watch for changes and persist to storage
  watch(
    storedValue,
    (newValue) => {
      try {
        storage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Failed to save to storage "${key}":`, error);
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
export function useLocalStorage<T>(key: string, initialValue: T) {
  return useStorage<T>(key, initialValue, LOCAL_STORAGE_RESOLVER);
}

/**
 * Reactive sessionStorage hook
 *
 * @param key - The sessionStorage key
 * @param initialValue - The initial value to use if key doesn't exist
 * @returns [reactive ref, setter function]
 */
export function useSessionStorage<T>(key: string, initialValue: T) {
  return useStorage<T>(key, initialValue, SESSION_STORAGE_RESOLVER);
}

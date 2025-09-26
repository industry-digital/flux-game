/**
 * Shared composables for cross-cutting concerns
 *
 * These composables provide infrastructure utilities that can be used
 * across multiple domains without violating domain boundaries.
 */

export { useStorage, useLocalStorage, useSessionStorage } from './storage';

// Future shared composables will be exported here:
// export { useDebounce } from './debounce';
// export { useAsync } from './async';
// export { useEventListener } from './event-listener';

export type StorageResolver = () => typeof globalThis.localStorage | typeof globalThis.sessionStorage;

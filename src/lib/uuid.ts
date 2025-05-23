// @ts-nocheck

export type RandomUUIDGenerator = () => `${string}-${string}-${string}-${string}-${string}`;

export const createRandomUUIDGenerator = (fallback?: RandomUUIDGenerator): RandomUUIDGenerator => {
  // Modern browsers and Node.js 16+ with native crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return () => crypto.randomUUID();
  }

  // Modern browsers and Node.js 15+ with crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  }

  // Node.js environment - try to use the crypto module
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      // Use a more bundler-friendly approach for requiring Node.js modules
      // This prevents bundlers from trying to include the Node.js crypto module
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = globalThis.require ? globalThis.require('crypto') : null;

      if (nodeCrypto) {
        // Node.js with randomUUID (v16+)
        if (typeof nodeCrypto.randomUUID === 'function') {
          return () => nodeCrypto.randomUUID();
        }

        // Older Node.js with randomBytes
        if (typeof nodeCrypto.randomBytes === 'function') {
          return () => {
            const bytes = nodeCrypto.randomBytes(16);

            // Set version (4) and variant (RFC4122)
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;

            // Convert to hex string and format as UUID
            let hex = bytes.toString('hex');
            return [
              hex.substring(0, 8),
              hex.substring(8, 12),
              hex.substring(12, 16),
              hex.substring(16, 20),
              hex.substring(20, 32)
            ].join('-');
          };
        }
      }
    } catch (e) {
      if (fallback) {
        return fallback;
      }
      throw new Error('Node.js crypto module not available and no fallback provided.');
    }

  }

  if (typeof console !== 'undefined' && console.warn) {
    console.warn('Secure UUID generation not available. Using Math.random fallback.');
  }
  return () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const randomUUID = createRandomUUIDGenerator();

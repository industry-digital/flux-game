import { describe, it, expect } from 'vitest';
import { extractActorFromJwt } from './util';

describe('extractActorFromJwt', () => {
  it('should extract actor from valid JWT', () => {
    // Create a mock JWT with actor claim
    const payload = { actor: 'flux:actor:pc:alice' };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockJwt = `header.${encodedPayload}.signature`;

    const result = extractActorFromJwt(mockJwt);
    expect(result).toBe('flux:actor:pc:alice');
  });

  it('should handle base64url encoding correctly', () => {
    // Test with characters that need base64url conversion
    const payload = { actor: 'flux:actor:pc:test-user' };
    const jsonString = JSON.stringify(payload);
    // Manually create base64url encoded payload
    const base64 = btoa(jsonString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const mockJwt = `header.${base64}.signature`;

    const result = extractActorFromJwt(mockJwt);
    expect(result).toBe('flux:actor:pc:test-user');
  });

  it('should throw error for invalid JWT format', () => {
    expect(() => extractActorFromJwt('invalid')).toThrow('Invalid JWT');
    expect(() => extractActorFromJwt('header.signature')).toThrow('Invalid JWT');
    expect(() => extractActorFromJwt('')).toThrow('Invalid JWT');
  });

  it('should throw error for JWT without actor claim', () => {
    const payload = { sub: 'user123', iat: Date.now() };
    const encodedPayload = btoa(JSON.stringify(payload));
    const mockJwt = `header.${encodedPayload}.signature`;

    expect(() => extractActorFromJwt(mockJwt)).toThrow('Invalid JWT');
  });

  it('should throw error for malformed JSON in payload', () => {
    const malformedPayload = btoa('{ invalid json }');
    const mockJwt = `header.${malformedPayload}.signature`;

    expect(() => extractActorFromJwt(mockJwt)).toThrow('Invalid JWT');
  });
});

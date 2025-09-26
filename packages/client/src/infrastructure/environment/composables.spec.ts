import { describe, it, expect } from 'vitest';
import { AppEnvironment } from '~/types/infrastructure/environment';
import { createRuntimeEnvironmentResolver } from './composables';

describe('useEnvironment', () => {
  const mockEnv = {
    VITE_APP_ENV: 'test',
    VITE_XMPP_SERVICE: 'ws://localhost:5280/ws',
    VITE_XMPP_DOMAIN: 'fabric.flux.local',
    VITE_TEST_JWT: 'test-jwt-token',
    VITE_TEST_JWTS: 'jwt1 jwt2 jwt3',
  };

  it('should return a valid runtime environment with all required fields', () => {
    const useTestEnvironment = createRuntimeEnvironmentResolver(mockEnv);
    const env = useTestEnvironment();

    expect(env).toBeDefined();
    expect(env).toHaveProperty('VITE_APP_ENV');
    expect(env).toHaveProperty('VITE_XMPP_SERVICE');
    expect(env).toHaveProperty('VITE_XMPP_DOMAIN');
    expect(env).toHaveProperty('VITE_TEST_JWT');
    expect(env).toHaveProperty('VITE_TEST_JWTS');
  });

  it('should return consistent environment values on multiple calls', () => {
    const useTestEnvironment = createRuntimeEnvironmentResolver(mockEnv);
    const env1 = useTestEnvironment();
    const env2 = useTestEnvironment();

    expect(env1).toEqual(env2);
    expect(env1).toBe(env2); // Should return the same object reference
  });

  it('should have valid VITE_APP_ENV enum value', () => {
    const useTestEnvironment = createRuntimeEnvironmentResolver(mockEnv);
    const env = useTestEnvironment();

    expect(Object.values(AppEnvironment)).toContain(env.VITE_APP_ENV);
  });

  it('should return string values for all environment variables', () => {
    const useTestEnvironment = createRuntimeEnvironmentResolver(mockEnv);
    const env = useTestEnvironment();

    expect(typeof env.VITE_XMPP_SERVICE).toBe('string');
    expect(typeof env.VITE_XMPP_DOMAIN).toBe('string');
    expect(typeof env.VITE_TEST_JWT).toBe('string');
    expect(typeof env.VITE_TEST_JWTS).toBe('string');
  });

  it('should return the injected environment values', () => {
    const useTestEnvironment = createRuntimeEnvironmentResolver(mockEnv);
    const env = useTestEnvironment();

    expect(env.VITE_APP_ENV).toBe(AppEnvironment.TEST);
    expect(env.VITE_XMPP_SERVICE).toBe('ws://localhost:5280/ws');
    expect(env.VITE_XMPP_DOMAIN).toBe('fabric.flux.local');
    expect(env.VITE_TEST_JWT).toBe('test-jwt-token');
    expect(env.VITE_TEST_JWTS).toBe('jwt1 jwt2 jwt3');
  });
});

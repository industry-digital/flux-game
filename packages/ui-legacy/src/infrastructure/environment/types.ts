// Environment types for UI package
export type AppEnvironment = 'development' | 'staging' | 'production';

// Enum-like object for easier testing
export const AppEnvironment = {
  DEVELOPMENT: 'development' as AppEnvironment,
  STAGING: 'staging' as AppEnvironment,
  PRODUCTION: 'production' as AppEnvironment,
  TEST: 'development' as AppEnvironment, // For testing
} as const;

export interface RuntimeEnvironment {
  VITE_APP_ENV: AppEnvironment;
  VITE_XMPP_SERVICE: string;
  VITE_XMPP_DOMAIN: string;
  VITE_TEST_JWTS: string;
  [key: string]: string | undefined;
}

export type RuntimeEnvironmentResolver = (env?: any) => RuntimeEnvironment;

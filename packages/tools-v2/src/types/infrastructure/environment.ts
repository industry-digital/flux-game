export enum AppEnvironment {
  TEST = 'test',
  LOCAL = 'local',
  PRODUCTION = 'production',
}

export type RuntimeEnvironment = {
  VITE_APP_ENV: AppEnvironment;
  VITE_XMPP_SERVICE: string;
  VITE_XMPP_DOMAIN: string;
  VITE_TEST_JWTS: string;
};

export type RuntimeEnvironmentResolver = (...args: any[]) => RuntimeEnvironment;

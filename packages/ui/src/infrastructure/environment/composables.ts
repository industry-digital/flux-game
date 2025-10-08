import { AppEnvironment, RuntimeEnvironment, RuntimeEnvironmentResolver } from './types';

const REQUIRED_ENV_VARS = [
  'VITE_APP_ENV',
  'VITE_XMPP_SERVICE',
  'VITE_XMPP_DOMAIN',
  'VITE_TEST_JWTS',
];

const validateRuntimeEnvironment = (env: any): void => {
  for (const key of REQUIRED_ENV_VARS) {
    if (!env[key]) {
      throw new Error(`${key} is required`);
    }
  }
};

export const createRuntimeEnvironmentResolver = (env: any = import.meta.env): RuntimeEnvironmentResolver => {
  let computedEnv: RuntimeEnvironment;

  const createRuntimeEnvironment: RuntimeEnvironmentResolver = (): RuntimeEnvironment => {
    if (!computedEnv) {
      computedEnv = {
        VITE_APP_ENV: env.VITE_APP_ENV as AppEnvironment,
        VITE_XMPP_SERVICE: env.VITE_XMPP_SERVICE,
        VITE_XMPP_DOMAIN: env.VITE_XMPP_DOMAIN,
        VITE_TEST_JWTS: env.VITE_TEST_JWTS,
      };
      validateRuntimeEnvironment(computedEnv);
    }

    return computedEnv;
  };

  return createRuntimeEnvironment;
};

export const useEnvironment: RuntimeEnvironmentResolver = createRuntimeEnvironmentResolver();

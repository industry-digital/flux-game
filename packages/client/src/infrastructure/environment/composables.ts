import { AppEnvironment, RuntimeEnvironment, RuntimeEnvironmentResolver } from '~/types/infrastructure/environment';

export const validateRuntimeEnvironment = (env: any): void => {
  if (!env.VITE_APP_ENV) {
    throw new Error('VITE_APP_ENV is required');
  }
  if (!env.VITE_XMPP_SERVICE) {
    throw new Error('VITE_XMPP_SERVICE is required');
  }
  if (!env.VITE_XMPP_DOMAIN) {
    throw new Error('VITE_XMPP_DOMAIN is required');
  }
  if (!env.VITE_TEST_JWTS) {
    throw new Error('VITE_TEST_JWTS is required');
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

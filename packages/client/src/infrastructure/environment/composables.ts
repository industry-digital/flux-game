import { AppEnvironment, RuntimeEnvironment, RuntimeEnvironmentResolver } from '~/types/infrastructure/environment';

export const createRuntimeEnvironmentResolver = (env: any = import.meta.env): RuntimeEnvironmentResolver => {
  let computedEnv: RuntimeEnvironment;

  const createRuntimeEnvironment: RuntimeEnvironmentResolver = (): RuntimeEnvironment => {
    computedEnv ??= {
      VITE_APP_ENV: env.VITE_APP_ENV as AppEnvironment,
      VITE_XMPP_SERVICE: env.VITE_XMPP_SERVICE,
      VITE_XMPP_DOMAIN: env.VITE_XMPP_DOMAIN,
      VITE_TEST_JWT: env.VITE_TEST_JWT,
      VITE_TEST_JWTS: env.VITE_TEST_JWTS,
    };

    return computedEnv;
  };

  return createRuntimeEnvironment;
};

export const useEnvironment: RuntimeEnvironmentResolver = createRuntimeEnvironmentResolver();

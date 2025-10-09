/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
  readonly VITE_XMPP_SERVICE: string;
  readonly VITE_XMPP_DOMAIN: string;
  readonly VITE_TEST_JWTS: string;
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_API_TIMEOUT: string;
  // Add more environment variables as needed
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

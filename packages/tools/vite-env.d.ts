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

// CSS Module declarations
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.sass' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.less' {
  const content: Record<string, string>;
  export default content;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GitHub OAuth App client id. Public — it travels in the authorize URL. */
  readonly VITE_GITHUB_CLIENT_ID?: string;
  /** Cloudflare Worker that exchanges an OAuth code for a token. */
  readonly VITE_GIST_TOKEN_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

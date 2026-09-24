/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL?: string;
  readonly DEV: boolean;
  readonly PUBLIC_SUPABASE_PROJECT_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_AUTH_DISABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

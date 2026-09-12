interface ImportMetaEnv {
  readonly BASE_URL?: string;
  readonly PUBLIC_SUPABASE_PROJECT_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

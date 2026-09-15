declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.png?url" {
  const href: string;
  export default href;
}

declare module "*.css?url" {
  const href: string;
  export default href;
}

interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly PUBLIC_SUPABASE_PROJECT_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

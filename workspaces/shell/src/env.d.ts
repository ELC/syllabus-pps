/// <reference types="astro/client" />

declare module "*.png" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly PUBLIC_SITE_ROOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

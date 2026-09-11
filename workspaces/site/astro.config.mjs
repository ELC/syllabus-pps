import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { cmsDevPlugin } from "./vite-cms-dev.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  base,
  outDir: "dist",
  publicDir: "public",
  server: {
    port: 4321,
    strictPort: true,
  },
  vite: {
    plugins: [cmsDevPlugin()],
    resolve: {
      alias: {
        "@pps/shell": resolve(rootDir, "../shell/src"),
      },
    },
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});

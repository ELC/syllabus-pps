import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const base = process.env.ANALYTICS_BASE ?? "/analytics/";

export default defineConfig({
  base,
  outDir: "dist",
  publicDir: "public",
  server: {
    port: 4323,
    strictPort: true,
  },
  vite: {
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
